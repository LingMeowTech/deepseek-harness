import { describe, expect, it } from 'vitest'
import { Context } from '@deepseek-ai/cordis'
import type { PipelineId, PipelineProjectView } from '@deepseek-ai/dsh-api-remotes/client'
import { PipelineRuntime, PipelineRuntimeError } from '../src/client/pipelines/service.ts'
import { err, FakeApiClient, ok } from './fake-api.client.ts'

const pid = (id: string): PipelineId => id as PipelineId

describe('PipelineRuntime', () => {
  it('provides ctx.pipelines and unwraps the pipeline RPC surface', async () => {
    const ctx = new Context()
    const api = new FakeApiClient()
    const project: PipelineProjectView = {
      projectId: 'proj-1' as PipelineProjectView['projectId'],
      parentId: 'root' as PipelineProjectView['parentId'],
      name: '平台项目', status: 2, pipelineTotal: 1, pipelineRunning: 0, pipelineStopped: 1,
    }
    api.onPipelineListProjects = () => Promise.resolve(ok({ projects: [project] }))
    const pipelines = new PipelineRuntime(ctx, api)
    expect(ctx.get('pipelines')).toBe(pipelines)
    expect(await pipelines.listProjects()).toEqual([project])
    expect(api.callsOf('pipeline.listProjects')).toEqual([{}])
  })

  it('passes pipeline filters and action payloads to the wire client', async () => {
    const ctx = new Context()
    const api = new FakeApiClient()
    const pipelines = new PipelineRuntime(ctx, api)
    await pipelines.listPipelines('proj-1' as never, false)
    expect(api.callsOf('pipeline.listPipelines')).toEqual([{ projectId: 'proj-1', running: false }])
    await pipelines.pushPrd(pid('pipe-1'), '# PRD')
    expect(api.callsOf('pipeline.pushPrd')).toEqual([{ pipelineId: 'pipe-1', content: '# PRD' }])
    await pipelines.approve(pid('pipe-1'))
    expect(api.callsOf('pipeline.approve')).toEqual([{ pipelineId: 'pipe-1' }])
  })

  it('throws a structured error carrying the host business failure', async () => {
    const ctx = new Context()
    const api = new FakeApiClient()
    api.onPipelineGet = () => Promise.resolve(err({
      code: 'pipeline-not-found', message: 'missing', details: {},
    }))
    const pipelines = new PipelineRuntime(ctx, api)
    await expect(pipelines.get(pid('ghost'))).rejects.toBeInstanceOf(PipelineRuntimeError)
    await expect(pipelines.get(pid('ghost'))).rejects.toMatchObject({
      rpcError: { code: 'pipeline-not-found' },
    })
  })
})
