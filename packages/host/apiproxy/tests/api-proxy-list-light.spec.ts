/**
 * session.list lightweight mode (B17 US2): a projection-less list for
 * high-frequency UI polling. With `projection: 'none'` the host serves
 * metadata-only rows — no projection column, no projection snapshot/cache
 * reads at all — so a 1100+ session deployment lists in well under 200ms.
 * The v1 default (no projection field) keeps the full projection semantics
 * untouched.
 */

import { describe, expect, it, vi } from 'vitest'
import { Context } from '@deepseek-ai/cordis'
import { z } from 'zod'
import SessionStore from '@deepseek-ai/dsh-session'
import type { Session } from '@deepseek-ai/dsh-session'
import AgentRegistry from '@deepseek-ai/dsh-agent'
import type { Agent } from '@deepseek-ai/dsh-agent'
import SessionProjectionRegistry from '@deepseek-ai/dsh-session-projection'
import type { ProjectionDefinition } from '@deepseek-ai/dsh-session-projection'
import UserQuestionService from '@deepseek-ai/dsh-user-questions'
import type { RpcRequest } from '@deepseek-ai/dsh-host-apiproxy/api/rpc'
import { RpcId } from '@deepseek-ai/dsh-host-apiproxy/api/rpc'
import { createApiProxy } from '@deepseek-ai/dsh-host-apiproxy'

declare module '@deepseek-ai/dsh-session-projection/types' {
  interface SessionProjectionStateMap {
    'test/list-title': string
  }
  interface SessionProjectionMap {
    'test/list-title': { title: string } | null
  }
}

let nextRpc = 1
function request<P>(payload: P): RpcRequest<P> {
  return { rpcId: RpcId(`list-light-${String(nextRpc++)}`), payload }
}

const titleUnit = (): ProjectionDefinition<'test/list-title', string> => ({
  key: 'test/list-title',
  stateSchema: z.string(),
  init: () => '',
  apply: state => state,
  wire: {
    viewSchema: z.object({ title: z.string() }).nullable(),
    view: state => (state ? { title: state } : null),
  },
  stateVersion: 1,
})

/** Large attached-session fixture: N live sessions, all projection-capable. */
async function harness(count: number): Promise<{ api: ReturnType<typeof createApiProxy>; snapshot: ReturnType<typeof vi.fn> }> {
  const ctx = new Context()
  await ctx.plugin(SessionStore)
  await ctx.plugin(UserQuestionService)
  await ctx.plugin(AgentRegistry)
  await ctx.plugin(SessionProjectionRegistry)
  ctx.sessionProjections.register(titleUnit())
  for (let i = 0; i < count; i++) {
    const session: Session = ctx.sessions.create()
    ctx.agents.register({
      id: session.id,
      session,
      inbox: { inserted: () => {}, discarded: () => {}, claimed: () => {} },
      status: 'idle',
      ctx,
    } as unknown as Agent)
  }
  // Spy the registry's snapshot fold: the lightweight mode must never reach it.
  const snapshot = vi.spyOn(ctx.sessionProjections, 'snapshot')
  const api = createApiProxy(ctx, {
    defaultModelSelection: () => ({ provider: 'p', model: 'm' }),
    cwd: '/tmp',
  })
  return { api, snapshot }
}

describe('session.list lightweight mode', () => {
  it('serves 1100+ sessions in <200ms with projection:none and never touches the projection fold', async () => {
    const { api, snapshot } = await harness(1100)
    const started = performance.now()
    const response = await api.sessions.list(request({ projection: 'none' }))
    const elapsed = performance.now() - started

    expect(response.result.ok).toBe(true)
    if (!response.result.ok) throw new Error('unreachable')
    expect(response.result.value.items).toHaveLength(1100)
    // Projection deserialization must not be reached at all.
    expect(snapshot).not.toHaveBeenCalled()
    // Metadata rows only: no projections column on any row.
    for (const item of response.result.value.items) {
      expect(item.projections).toBeUndefined()
      expect(item.sessionId).toBeDefined()
      expect(item.updatedAt).toBeDefined()
      expect(item.blank).toBeDefined()
    }
    expect(elapsed).toBeLessThan(200)
  })

  it('keeps the v1 default semantics: no projection field serves full projections', async () => {
    const { api, snapshot } = await harness(12)
    const response = await api.sessions.list(request({}))
    expect(response.result.ok).toBe(true)
    if (!response.result.ok) throw new Error('unreachable')
    expect(response.result.value.items).toHaveLength(12)
    // Full mode still folds the projection registry.
    expect(snapshot).toHaveBeenCalled()
    const withProjections = response.result.value.items.filter(item => item.projections !== undefined)
    expect(withProjections.length).toBeGreaterThan(0)
  })
})
