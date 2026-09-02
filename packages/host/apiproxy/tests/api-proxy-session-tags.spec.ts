import { describe, expect, it } from 'vitest'
import { Context } from '@deepseek-ai/cordis'
import Storage from '@deepseek-ai/dsh-storage'
import { DomainFacility } from '@deepseek-ai/dsh-storage-domain'
import SessionTagRegistry, { PIPELINE_SESSION_TAGS } from '@deepseek-ai/dsh-session-tags'
import { SessionId } from '@deepseek-ai/dsh-session'
import UserQuestionService from '@deepseek-ai/dsh-user-questions'
import { createApiProxy, toFetchHandler } from '@deepseek-ai/dsh-host-apiproxy'
import type { HostFrame } from '@deepseek-ai/dsh-host-apiproxy/api'
import { RpcId } from '@deepseek-ai/dsh-host-apiproxy/api/rpc'
import type { RpcRequest, RpcResponse } from '@deepseek-ai/dsh-host-apiproxy/api/rpc'
import { MemoryMediaPool, MemoryStorageBackend } from '../../../storage/storage-domain/tests/helpers/memory-backend.ts'

let nextRpc = 1

function request<P>(payload: P): RpcRequest<P> {
  return { rpcId: RpcId(`session-tags-${String(nextRpc++)}`), payload }
}

function expectOk<T>(response: RpcResponse<T>): T {
  expect(response.result.ok).toBe(true)
  if (!response.result.ok) throw new Error('unreachable')
  return response.result.value
}

async function harness() {
  const ctx = new Context()
  await ctx.plugin(Storage)
  ctx.storage.backend.register('memory', new MemoryStorageBackend(new MemoryMediaPool()))
  const facility = new DomainFacility(ctx, { backend: 'memory', routes: {} })
  ctx.storage.mount('domain', facility)
  ctx.provide('storageDomain', facility)
  await ctx.plugin(SessionTagRegistry)
  await ctx.plugin(UserQuestionService)
  ctx.provide('workspaceRegistry', { list: () => [], archivedSessionIds: [], get: () => undefined } as never)
  const api = createApiProxy(ctx, {
    defaultModelSelection: () => ({ provider: 'test', model: 'test-model' }),
    cwd: 'C:\\test',
  })
  return { ctx, api }
}

describe('session.tags.* RPC surface', () => {
  it('sets tags durably, reads them back, and removes named tags', async () => {
    const { ctx, api } = await harness()
    const sessionId = SessionId('s-tags')
    expect(expectOk(await api.sessions.tags.set(request({ sessionId, tags: ['pipeline_id', 'job_id'] }))).tags)
      .toEqual(['pipeline_id', 'job_id'])
    expect(await ctx.sessionTags.list(sessionId)).toEqual(['pipeline_id', 'job_id'])
    expect(expectOk(await api.sessions.tags.list(request({ sessionId }))).tags)
      .toEqual(['pipeline_id', 'job_id'])
    expect(expectOk(await api.sessions.tags.remove(request({ sessionId, tags: ['pipeline_id'] }))).tags)
      .toEqual(['job_id'])
    expect(await ctx.sessionTags.list(sessionId)).toEqual(['job_id'])
  })

  it('publishes host/session-tags-changed after set and remove through the host stream', async () => {
    const { api } = await harness()
    const sessionId = SessionId('s-stream')
    const abort = new AbortController()
    const stream: AsyncIterator<RpcRequest<HostFrame>> =
      api.events.host(request({}), abort.signal)[Symbol.asyncIterator]()

    const setFrame = stream.next()
    expect(expectOk(await api.sessions.tags.set(request({
      sessionId, tags: ['pipeline_id', 'state_id', 'job_id', 'node_id'],
    }))).tags).toEqual(['pipeline_id', 'state_id', 'job_id', 'node_id'])
    expect((await setFrame).value).toMatchObject({
      payload: {
        type: 'host/session-tags-changed',
        sessionId,
        tags: ['pipeline_id', 'state_id', 'job_id', 'node_id'],
      },
    })

    const removeFrame = stream.next()
    expect(expectOk(await api.sessions.tags.remove(request({
      sessionId, tags: ['state_id', 'job_id', 'node_id'],
    }))).tags).toEqual(['pipeline_id'])
    expect((await removeFrame).value).toMatchObject({
      payload: { type: 'host/session-tags-changed', sessionId, tags: ['pipeline_id'] },
    })
    abort.abort()
  })

  it('validates tag payloads at the fetch route before the service runs', async () => {
    const { api } = await harness()
    const handler = toFetchHandler(api).fetch
    const response = await handler(new Request('http://dsh.internal/api/session.tags.set', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        type: 'client-request', rpcId: 'rpc-1', method: 'session.tags.set',
        payload: { sessionId: 's1', tags: ['   '] },
      }),
    }))
    const body = await response.json() as { result: { ok: boolean; error?: { code: string } } }
    expect(body.result.ok).toBe(false)
    expect(body.result.error?.code).toBe('bad-request')
  })

  it('uses pipeline_id/state_id/job_id/node_id as the frozen pipeline tag names', () => {
    expect(PIPELINE_SESSION_TAGS).toEqual(['pipeline_id', 'state_id', 'job_id', 'node_id'])
  })
})
