/**
 * The session-tags domain declaration: one `tags` table keyed by session id.
 * @module @deepseek-ai/dsh-session-tags/src/spec
 */

import { z } from 'zod'
import { SessionId } from '@deepseek-ai/dsh-session'
import { defineDomain, domainTable } from '@deepseek-ai/dsh-storage-domain'

/** One stored session tag record. */
export const sessionTagRecord = z.object({
  tags: z.array(z.string()),
  updatedAt: z.string(),
})

/** One stored tag record, inferred from {@link sessionTagRecord}. */
export type SessionTagRecord = z.infer<typeof sessionTagRecord>

/**
 * Session-tags domain: `tags` rows keyed by {@link SessionId}. The table's
 * `domain/changed` events are the notification source for host stream frames.
 */
export const sessionTagsDomainSpec = defineDomain({
  name: 'session_tags',
  version: 1,
  tables: {
    tags: domainTable<SessionId, SessionTagRecord>(sessionTagRecord),
  },
})
