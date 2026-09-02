/**
 * Pipeline worker session-tag plugin: on every session created inside this
 * worker process, write the runner-injected pipeline identity as durable
 * session tags (`pipeline_id:<v>` / `state_id:<v>` / `job_id:<v>` /
 * `node_id:<v>`) through `ctx.sessionTags`. Values come only from the frozen
 * handshake environment variables; a missing value skips its tag, so plain
 * dev sessions stay untagged.
 * @module @deepseek-ai/dsh-bundle-lmo-pipeline-worker/src/pipeline-worker-tags
 */

import type { Context } from '@deepseek-ai/cordis'
import type { SessionId } from '@deepseek-ai/dsh-session'
import { PIPELINE_SESSION_TAGS } from '@deepseek-ai/dsh-session-tags'

/** Plugin config for the pipeline worker tag writer. */
export interface Config {
  /** Env var name per tag key; defaults to the frozen handshake names. */
  envNames?: Partial<Record<(typeof PIPELINE_SESSION_TAGS)[number], string>>
}

/** Cordis companion plugin name. */
export const name = 'lmo-pipeline-worker-tags'

/** Services required before this plugin can register. */
export const inject = ['sessionTags'] as const

const DEFAULT_ENV_NAMES: Record<(typeof PIPELINE_SESSION_TAGS)[number], string> = {
  pipeline_id: 'PIPELINE_ID',
  state_id: 'STATE_ID',
  job_id: 'JOB_ID',
  node_id: 'NODE_ID',
}

/** Normalize config over the defaults: every tag key resolves one env var. */
function resolveEnvNames(config: Config = {}): Record<(typeof PIPELINE_SESSION_TAGS)[number], string> {
  return {
    ...DEFAULT_ENV_NAMES,
    ...(config.envNames ?? {}),
  }
}

/**
 * Apply the tag writer: subscribe to `session/created` globally (worker
 * sessions are SDK-minted, not scope-entered), and set the pipeline tags the
 * frozen handshake environment supplies for that session.
 * @param ctx - Cordis context carrying the session-tag registry.
 * @param config - optional env-var mapping over the frozen defaults.
 * @returns disposer removing the listener after setup succeeds.
 */
export const apply = (ctx: Context, config: Config = {}): () => void => {
  const envNames = resolveEnvNames(config)
  const writable = PIPELINE_SESSION_TAGS as unknown as readonly string[]
  const listener = (session: { id: SessionId }): void => {
    const tags = writable
      .map(key => [key, process.env[envNames[key as keyof typeof envNames]]] as const)
      .filter((entry): entry is readonly [string, string] => entry[1] !== undefined && entry[1] !== '')
      .map(([key, value]) => `${key}:${value}`)
    if (tags.length === 0) return
    // Published-state rule: write only after the session exists; set() failure
    // is logged but never vetoes session creation.
    void ctx.sessionTags.set(session.id, tags).catch((error: unknown) => {
      ctx.logger.warn('lmo-pipeline-worker-tags: failed to write session tags: %s', String(error))
    })
  }
  return ctx.on('session/created', listener, { global: true })
}
