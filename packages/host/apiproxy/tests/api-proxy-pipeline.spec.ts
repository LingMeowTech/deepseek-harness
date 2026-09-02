import { describe, expect, it, vi } from 'vitest'
import { Context } from '@deepseek-ai/cordis'
import { LmoPipelineError } from '@deepseek-ai/dsh-lmo-pipeline'
import type { LmoPipeline } from '@deepseek-ai/dsh-lmo-pipeline'
import UserQuestionService from '@deepseek-ai/dsh-user-questions'
import { createApiProxy, toFetchHandler } from '@deepseek-ai/dsh-host-apiproxy'
import type { PipelineId, PipelineProjectId, PipelineStateId } from '@deepseek-ai/dsh-host-apiproxy/api'
import { RpcId } from '@deepseek-ai/dsh-host-apiproxy/api/rpc'
import type { RpcRequest, RpcResponse } from '@deepseek-ai/dsh-host-apiproxy/api/rpc'

let nextRpc = 1

function request<P>(payload: P): RpcRequest<P> {
  return { rpcId: RpcId(`pipeline-${String(nextRpc++)}`), payload }
}

function expectOk<T>(response: RpcResponse<T>): T {
  expect(response.result.ok).toBe(true)
  if (!response.result.ok) throw new Error('unreachable')
  return response.result.value
}

async function pipelineHarness() {
  const ctx = new Context()
  await ctx.plugin(UserQuestionService)
  const lmoPipeline = {
    listProjects: vi.fn(() => Promise.resolve([{
      projectId: 'proj-1', parentId: 'root', name: '平台项目', status: 2,
      pipelineTotal: 3, pipelineRunning: 1, pipelineStopped: 2,
    }])),
    listPipelines: vi.fn(() => Promise.resolve([{
      pipelineId: 'pipe-1', projectId: 'proj-1', name: '迁移管线', status: 1,
      stateTotal: 2, stateCompleted: 0, jobTotal: 3, jobCompleted: 0, isLooping: false,
    }])),
    getPipeline: vi.fn(() => Promise.resolve({
      pipelineId: 'pipe-1', projectId: 'proj-1', name: '迁移管线', status: 1,
      isLooping: false, prd: { version: 'v2', content: '# PRD' }, states: [], jobs: [],
    })),
    pushPrd: vi.fn(() => Promise.resolve({ pipelineId: 'pipe-1', prdVersion: 'v3' })),
    approve: vi.fn(() => Promise.resolve({ pipelineId: 'pipe-1', status: 2 })),
    rerunPipeline: vi.fn(() => Promise.resolve({ pipelineId: 'pipe-1', resetCount: 4 })),
    listStates: vi.fn(() => Promise.resolve([{
      stateId: 'state-1', pipelineId: 'pipe-1', name: '改造', status: 0,
      isDecomposed: false, isLooping: false, jobTotal: 2, jobCompleted: 0,
    }])),
    listJobs: vi.fn(() => Promise.resolve([{ jobId: 'job-1', stateId: 'state-1', name: '写代码', status: 0 }])),
  } as unknown as LmoPipeline
  ctx.provide('lmoPipeline', lmoPipeline as never)
  const api = createApiProxy(ctx, {
    defaultModelSelection: () => ({ provider: 'test', model: 'test-model' }),
    cwd: 'C:\\test',
  })
  return { ctx, api, lmoPipeline }
}

describe('pipeline.* RPC surface', () => {
  it('serves listProjects, listPipelines, and get through the service seam', async () => {
    const { api, lmoPipeline } = await pipelineHarness()
    const projects = expectOk(await api.pipeline.listProjects(request({})))
    expect(projects.projects[0]).toMatchObject({ projectId: 'proj-1', name: '平台项目', status: 2 })
    // oxlint-disable-next-line typescript/unbound-method -- vi.fn mock reference, not a live receiver
    expect(lmoPipeline.listProjects).toHaveBeenCalledOnce()

    const pipelines = expectOk(await api.pipeline.listPipelines(request({ projectId: 'proj-1' as PipelineProjectId, running: true })))
    expect(pipelines.pipelines[0]?.name).toBe('迁移管线')
    // oxlint-disable-next-line typescript/unbound-method -- vi.fn mock reference, not a live receiver
    expect(lmoPipeline.listPipelines).toHaveBeenCalledWith('proj-1', true)

    const detail = expectOk(await api.pipeline.get(request({ pipelineId: 'pipe-1' as PipelineId })))
    expect(detail.pipeline.prd.content).toBe('# PRD')
    expect(detail.pipeline.states).toEqual([])
  })

  it('forwards pushPrd, approve, rerun, listStates, and listJobs', async () => {
    const { api, lmoPipeline } = await pipelineHarness()
    expect(expectOk(await api.pipeline.pushPrd(request({ pipelineId: 'pipe-1' as PipelineId, content: '# PRD' })))).toEqual({
      pipelineId: 'pipe-1', prdVersion: 'v3',
    })
    // oxlint-disable-next-line typescript/unbound-method -- vi.fn mock reference, not a live receiver
    expect(lmoPipeline.pushPrd).toHaveBeenCalledWith('pipe-1', '# PRD')
    expect(expectOk(await api.pipeline.approve(request({ pipelineId: 'pipe-1' as PipelineId })))).toMatchObject({ status: 2 })
    expect(expectOk(await api.pipeline.rerun(request({ pipelineId: 'pipe-1' as PipelineId })))).toMatchObject({ resetCount: 4 })
    expect(expectOk(await api.pipeline.listStates(request({ pipelineId: 'pipe-1' as PipelineId }))).states[0]?.name).toBe('改造')
    expect(expectOk(await api.pipeline.listJobs(request({ stateId: 'state-1' as PipelineStateId }))).jobs[0]?.name).toBe('写代码')
  })

  it.each([
    ['LMO_NOT_FOUND', 'pipeline-not-found'],
    ['LMO_UNAUTHORIZED', 'pipeline-unauthorized'],
    ['LMO_FORBIDDEN', 'pipeline-forbidden'],
  ] as const)('maps %s onto the %s wire error', async (code, wireCode) => {
    const { api, lmoPipeline } = await pipelineHarness()
    // oxlint-disable-next-line typescript/unbound-method -- vi.fn mock reference, not a live receiver
    const listProjects = lmoPipeline.listProjects as ReturnType<typeof vi.fn>
    listProjects.mockRejectedValueOnce(
      new LmoPipelineError(code, `${code} failed`, 404, 'server says no'),
    )
    const response = await api.pipeline.listProjects(request({}))
    expect(response.result).toMatchObject({ ok: false, error: { code: wireCode } })
  })

  it('maps upstream and transport pipeline failures onto pipeline-error with the HTTP status', async () => {
    const { api, lmoPipeline } = await pipelineHarness()
    // oxlint-disable-next-line typescript/unbound-method -- vi.fn mock reference, not a live receiver
    const listProjects = lmoPipeline.listProjects as ReturnType<typeof vi.fn>
    listProjects.mockRejectedValueOnce(
      new LmoPipelineError('LMO_UPSTREAM_ERROR', 'storage down', 500, 'storage down'),
    )
    const response = await api.pipeline.listProjects(request({}))
    expect(response.result).toMatchObject({ ok: false, error: { code: 'pipeline-error', details: { httpStatus: 500 } } })
  })
})

describe('pipeline.* fetch route validation', () => {
  it('rejects a blank pipeline id as bad-request before the service runs', async () => {
    const { api, lmoPipeline } = await pipelineHarness()
    const handler = toFetchHandler(api).fetch
    const response = await handler(new Request('http://dsh.internal/api/pipeline.get', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        type: 'client-request', rpcId: 'rpc-1', method: 'pipeline.get',
        payload: { pipelineId: '' },
      }),
    }))
    const body = await response.json() as { result: { ok: boolean; error?: { code: string } } }
    expect(body.result.ok).toBe(false)
    expect(body.result.error?.code).toBe('bad-request')
    // oxlint-disable-next-line typescript/unbound-method -- vi.fn mock reference, not a live receiver
    expect(lmoPipeline.getPipeline).not.toHaveBeenCalled()
  })

  it('dispatches a valid pipeline.listProjects envelope through the fetch route', async () => {
    const { api } = await pipelineHarness()
    const handler = toFetchHandler(api).fetch
    const response = await handler(new Request('http://dsh.internal/api/pipeline.listProjects', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        type: 'client-request', rpcId: 'rpc-1', method: 'pipeline.listProjects',
        payload: {},
      }),
    }))
    const body = await response.json() as { result: { ok: boolean; value?: { projects: { name: string }[] } } }
    expect(body.result.ok).toBe(true)
    expect(body.result.value?.projects[0]?.name).toBe('平台项目')
  })
})
