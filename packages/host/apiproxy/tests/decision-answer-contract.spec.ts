/**
 * B13 RED: decision-answer channel contract tests (T002 US1 + T004 US2).
 *
 * Contract under test: the subagent delivery API aligns with the host
 * questions domain —
 *   scheme a: `subagents.prompt` accepts an optional `answers` batch
 *     (AskUserQuestionAnswer shape, zod-strict: id/selected/custom) and
 *     forwards it into the delivery channel;
 *   scheme b: `subagents.answer` / `subagents.questions` RPCs carry the same
 *     shape (T004, fallback contract).
 * Invalid answers surface a structured error; a rpcId with no pending ask
 * surfaces a not-found error — never a silent success.
 *
 * RED expectation: neither channel exists today (prompt ignores `answers`,
 * the answer/questions RPCs are absent), so these tests fail with
 * "channel missing / not implemented".
 */

import { describe, expect, it, vi } from 'vitest'
import { Context } from '@deepseek-ai/cordis'
import type { SessionEvent, SessionHeader, SessionId } from '@deepseek-ai/dsh-session'
import { RpcId } from '../src/api/rpc.ts'
import type { RpcRequest } from '../src/api/rpc.ts'
import type { ApiProxy } from '../src/api/index.ts'
import { createApiProxy } from '../src/api-proxy.ts'

const sid = (value: string): SessionId => value as SessionId
const PARENT = sid('parent')
const CHILD = sid('child')

function request<P>(payload: P): RpcRequest<P> {
  return { rpcId: RpcId('subagent-rpc'), payload }
}

function bench(options: { pendingChild?: boolean } = {}) {
  const parent = { id: PARENT }
  const child = { id: CHILD, status: 'idle' }
  const getAgent = vi.fn((id: SessionId) => (id === PARENT ? parent : id === CHILD ? child : undefined))
  const followup = vi.fn((
    _parent: unknown,
    _childId: SessionId,
    _content: unknown,
    delivery: { source: { kind: string; rpcId: RpcId }; signal: AbortSignal; answers?: unknown },
  ) => {
    // Model the real decision-answer table: an answers delivery only settles
    // when the child actually has a parked ask; otherwise the channel surfaces
    // a structured NOT_PENDING error (mapped to not-found by the RPC layer).
    if (delivery.answers !== undefined && !options.pendingChild) {
      return Promise.reject({ code: 'NOT_PENDING', message: 'no pending ask' })
    }
    void delivery
    return Promise.resolve('message-1')
  })
  const childHeader = {
    version: 0, id: CHILD, createdAt: 1, cwd: '/proj', parentSession: PARENT,
  } satisfies SessionHeader
  const childEvents = [
    { type: 'user/message', seq: 0, time: 1, data: { content: [{ type: 'text', text: 'work' }], source: { kind: 'user' } } },
  ] as unknown as SessionEvent[]
  const ctx = new Context()
  ctx.provide('agents', { get: getAgent })
  ctx.provide('subagents', { listChildren, followup, interrupt })
  ctx.provide('sessions', { get: () => undefined })
  ctx.provide('sessionPersistence', {
    list: () => Promise.resolve([childHeader]),
    inspect: () => Promise.resolve({ meta: childHeader, events: childEvents }),
    locate: () => undefined,
  })
  ctx.provide('sessionProjections', {
    snapshot: () => ({ values: {}, asOfSeq: 0 }),
    restore: () => ({ snapshot: { values: {}, asOfSeq: 0 } }),
    onChanged: () => () => {},
    register: () => () => {},
  })
  ctx.provide('userQuestions', { registerProvider: () => () => {} })
  const api = createApiProxy(ctx, {
    defaultModelSelection: () => ({ provider: 'p', model: 'm' }), cwd: '/tmp',
  })
  return { api, followup, parent }
}

function listChildren() {
  return Promise.resolve([{
    kind: 'child', id: CHILD, mode: 'continuable', label: 'worker',
    activity: 'inactive', hasChildren: false,
  }])
}

function interrupt() {}

describe('B13 decision-answer channel contract (T002/T004)', () => {
  it('scheme b: subagents.answer forwards a zod-valid answers batch into the delivery channel', async () => {
    const { api, followup } = bench({ pendingChild: true })
    const address = { parentSessionId: PARENT, childSessionId: CHILD, mode: 'continuable' as const }
    const response = await (api.subagents as unknown as {
      answer(request: RpcRequest<typeof address & { answers: unknown }>): Promise<unknown>
    }).answer(request({
      ...address,
      answers: [{ id: 'target', selected: ['Code'] }],
    }))

    // The RPC accepts the batch and the delivery channel receives it with the
    // rpcId echoed in the answer id. RED: `subagents.answer` is undefined.
    expect(response).toMatchObject({ result: { ok: true } })
    expect(followup).toHaveBeenCalledWith(
      expect.anything(), CHILD, expect.anything(),
      expect.objectContaining({ answers: [{ id: 'target', selected: ['Code'] }] }),
    )
  })

  it('scheme b: subagents.questions lists the pending asks of a child', async () => {
    const { api } = bench()
    const address = { parentSessionId: PARENT, childSessionId: CHILD, mode: 'continuable' as const }

    // RED: `subagents.questions` is undefined today.
    const response = await (api.subagents as unknown as {
      questions(request: RpcRequest<typeof address>): Promise<unknown>
    }).questions(request(address))

    expect(response).toMatchObject({
      result: { ok: true, value: expect.objectContaining({ questions: expect.any(Array) }) },
    })
  })

  it('scheme a: subagents.prompt forwards an optional answers batch into the delivery channel', async () => {
    const { api, followup } = bench({ pendingChild: true })
    const response = await api.subagents.prompt(request({
      parentSessionId: PARENT,
      childSessionId: CHILD,
      mode: 'continuable' as const,
      content: [{ type: 'text' as const, text: 'answer' }],
      answers: [{ id: 'target', selected: ['Code'] }],
    }), new AbortController().signal)

    expect(response).toMatchObject({ result: { ok: true } })
    // RED: the current prompt implementation drops `answers` — the delivery
    // channel never sees them.
    expect(followup).toHaveBeenCalledWith(
      expect.anything(), CHILD, expect.anything(),
      expect.objectContaining({ answers: [{ id: 'target', selected: ['Code'] }] }),
    )
  })

  it('rejects an invalid answers batch with a structured error (zod strict: missing id)', async () => {
    const { api } = bench()
    const address = { parentSessionId: PARENT, childSessionId: CHILD, mode: 'continuable' as const }
    const response = await (api.subagents as unknown as {
      answer(request: RpcRequest<typeof address & { answers: unknown }>): Promise<unknown>
    }).answer(request({
      ...address,
      answers: [{ selected: ['Code'] }],
    }))

    // zod AskUserQuestionAnswer alignment: an answer without `id` is rejected
    // with a structured error, never accepted.
    expect(response).toMatchObject({ result: { ok: false, error: { code: expect.stringMatching(/invalid|zod|bad/i) } } })
  })

  it('returns a structured not-found error for a rpcId with no pending ask', async () => {
    const { api } = bench()
    const address = { parentSessionId: PARENT, childSessionId: CHILD, mode: 'continuable' as const }
    const response = await (api.subagents as unknown as {
      answer(request: RpcRequest<typeof address & { answers: unknown }>): Promise<unknown>
    }).answer(request({
      ...address,
      answers: [{ id: 'never-asked', selected: ['Code'] }],
    }))

    // No pending ask matches the rpcId — a not-found error shape, aligned with
    // the host /api/respond pending-table semantics.
    expect(response).toMatchObject({ result: { ok: false, error: { code: 'not-found' } } })
  })
})

// Keep the unused ApiProxy import referenced for type-level contract pinning.
void (null as unknown as ApiProxy | undefined)
