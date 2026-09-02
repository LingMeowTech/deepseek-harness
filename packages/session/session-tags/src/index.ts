/**
 * Durable session-tag registry (`ctx.sessionTags`): string labels stored in a
 * storage-domain table keyed by session id. `domain/changed` on the
 * `session_tags` domain is the authoritative change feed; the host API proxy
 * projects it into `host/session-tags-changed` frames.
 * @module @deepseek-ai/dsh-session-tags
 */

import { Context, Service } from '@deepseek-ai/cordis'
import z from '@deepseek-ai/schemastery'
import type { SessionId } from '@deepseek-ai/dsh-session'
import type { KvTable } from '@deepseek-ai/dsh-storage-domain'
import { sessionTagsDomainSpec, type SessionTagRecord } from './spec.ts'

export { sessionTagRecord, sessionTagsDomainSpec } from './spec.ts'
export type { SessionTagRecord } from './spec.ts'

/** Frozen pipeline session tag names owned by the session contract. */
export const PIPELINE_SESSION_TAGS = ['pipeline_id', 'state_id', 'job_id', 'node_id'] as const

declare module '@deepseek-ai/cordis' {
  interface Context {
    sessionTags: SessionTagRegistry
  }
}

/** Plugin config for the session-tag registry. */
export interface Config {
  /** Maximum tags stored on one session; default 64. */
  maxTagsPerSession?: number
  /** Maximum characters in one tag; default 128. */
  maxTagChars?: number
}

/** Stable bounds for direct construction without Loader normalization. */
const DEFAULT_MAX_TAGS_PER_SESSION = 64
const DEFAULT_MAX_TAG_CHARS = 128

/** Normalize, bound, and dedupe one requested tag set. */
function resolveTags(tags: readonly string[], maxTags: number, maxChars: number): readonly string[] {
  const seen = new Set<string>()
  const resolved: string[] = []
  for (const raw of tags) {
    const tag = raw.trim()
    if (tag.length === 0) throw new Error('session tags must be non-empty after trimming')
    if (tag.length > maxChars) throw new Error(`session tag exceeds ${maxChars} characters: "${tag}"`)
    if (seen.has(tag)) continue
    if (resolved.length >= maxTags) throw new Error(`a session holds at most ${maxTags} tags`)
    seen.add(tag)
    resolved.push(tag)
  }
  return resolved
}

/**
 * Durable session tag registry. Set writes the complete tag list for a
 * session; remove deletes the named tags and drops the row when none remain.
 */
export class SessionTagRegistry extends Service {
  static inject = ['storageDomain']

  static Config: z<Config> = z.object({
    maxTagsPerSession: z.number().default(DEFAULT_MAX_TAGS_PER_SESSION),
    maxTagChars: z.number().default(DEFAULT_MAX_TAG_CHARS),
  })

  private table?: KvTable<SessionId, SessionTagRecord>
  private readonly maxTags: number
  private readonly maxChars: number

  constructor(ctx: Context, config: Config = {}) {
    super(ctx, 'sessionTags')
    const maxTags = config.maxTagsPerSession ?? DEFAULT_MAX_TAGS_PER_SESSION
    const maxChars = config.maxTagChars ?? DEFAULT_MAX_TAG_CHARS
    if (!Number.isSafeInteger(maxTags) || maxTags < 1) {
      throw new Error('session-tags: maxTagsPerSession must be a positive safe integer')
    }
    if (!Number.isSafeInteger(maxChars) || maxChars < 1) {
      throw new Error('session-tags: maxTagChars must be a positive safe integer')
    }
    this.maxTags = maxTags
    this.maxChars = maxChars
  }

  protected async [Service.init](): Promise<void> {
    const domain = await this.ctx.storageDomain.open(sessionTagsDomainSpec)
    this.ctx.effect(() => () => domain.close(), 'session-tags.domainClose')
    this.table = domain.table('tags')
  }

  /**
   * Read one session's durable tag list.
   * @param sessionId - the tagged session.
   * @returns the tags in stored order; empty for an untagged session.
   */
  list(sessionId: SessionId): Promise<readonly string[]> {
    return Promise.resolve([...(this.requireTable().get(sessionId)?.tags ?? [])])
  }

  /**
   * Replace one session's complete tag list. The normalized list is written
   * durably before the `domain/changed` notification publishes.
   * @param sessionId - the tagged session.
   * @param tags - new complete tag list; empty deletes the tag row.
   * @returns the stored normalized tags.
   */
  async set(sessionId: SessionId, tags: readonly string[]): Promise<readonly string[]> {
    const resolved = resolveTags(tags, this.maxTags, this.maxChars)
    const table = this.requireTable()
    if (resolved.length === 0) {
      await table.delete(sessionId)
      return []
    }
    const record: SessionTagRecord = { tags: [...resolved], updatedAt: new Date().toISOString() }
    await table.put(sessionId, record)
    return resolved
  }

  /**
   * Remove named tags from one session, keeping the remaining order. Removing
   * the last tag deletes the row; absent sessions are idempotent no-ops.
   * @param sessionId - the tagged session.
   * @param tags - tags to remove.
   * @returns the remaining stored tags.
   */
  async remove(sessionId: SessionId, tags: readonly string[]): Promise<readonly string[]> {
    const removing = resolveTags(tags, this.maxTags, this.maxChars)
    const table = this.requireTable()
    const current = table.get(sessionId)
    if (current === undefined) return []
    const removeSet = new Set(removing)
    const remaining = current.tags.filter((tag: string) => !removeSet.has(tag))
    if (remaining.length === current.tags.length) return remaining
    if (remaining.length === 0) {
      await table.delete(sessionId)
      return []
    }
    const record: SessionTagRecord = { tags: remaining, updatedAt: new Date().toISOString() }
    await table.put(sessionId, record)
    return remaining
  }

  private requireTable(): KvTable<SessionId, SessionTagRecord> {
    if (this.table === undefined) throw new Error('session-tags registry is not started yet')
    return this.table
  }
}

export default SessionTagRegistry
