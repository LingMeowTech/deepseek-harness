import { describe, expect, it } from 'vitest'
import { Context } from '@deepseek-ai/cordis'
import LmoPipeline, {
  LmoJobId,
  LmoNodeId,
  LmoPipelineId,
  LmoProjectId,
  LmoRunnerId,
  LmoStateId,
} from '@deepseek-ai/dsh-lmo-pipeline'
import type {
  LmoApproveResult,
  LmoJobPatch,
  LmoJobSummary,
  LmoNodeStatus,
  LmoPipelineDetail,
  LmoPipelineSummary,
  LmoProject,
  LmoProjectSummary,
  LmoPushPrdResult,
  LmoReportNodeResult,
  LmoRerunPipelineResult,
  LmoRunnerNode,
  LmoStateSummary,
} from '@deepseek-ai/dsh-lmo-pipeline'

class StubPipeline extends LmoPipeline {
  override listProjects(): Promise<readonly LmoProjectSummary[]> {
    return Promise.resolve([{
      projectId: LmoProjectId('p1'), parentId: LmoProjectId('root'), name: '项目',
      status: 2, pipelineTotal: 1, pipelineRunning: 0, pipelineStopped: 1,
    }])
  }

  override getProject(_id: LmoProjectId): Promise<LmoProject> {
    throw new Error('not used')
  }

  override listPipelines(
    _projectId?: LmoProjectId,
    _running?: boolean,
  ): Promise<readonly LmoPipelineSummary[]> {
    return Promise.resolve([])
  }

  override getPipeline(_id: LmoPipelineId): Promise<LmoPipelineDetail> {
    throw new Error('not used')
  }

  override pushPrd(_id: LmoPipelineId, _content: string): Promise<LmoPushPrdResult> {
    throw new Error('not used')
  }

  override approve(_id: LmoPipelineId): Promise<LmoApproveResult> {
    throw new Error('not used')
  }

  override listStates(_pipelineId: LmoPipelineId): Promise<readonly LmoStateSummary[]> {
    throw new Error('not used')
  }

  override listJobs(_stateId: LmoStateId): Promise<readonly LmoJobSummary[]> {
    throw new Error('not used')
  }

  override patchJob(_id: LmoJobId, _patch: LmoJobPatch): Promise<{ jobId: LmoJobId }> {
    throw new Error('not used')
  }

  override rerunPipeline(_id: LmoPipelineId): Promise<LmoRerunPipelineResult> {
    throw new Error('not used')
  }

  override reportNode(
    _runnerId: LmoRunnerId,
    _nodeId: LmoNodeId,
    _status: LmoNodeStatus,
    _desc: string,
    _output?: string,
  ): Promise<LmoReportNodeResult> {
    throw new Error('not used')
  }

  override listRunnerNodes(
    _runnerId: LmoRunnerId,
    _status?: 'pending' | 'all',
  ): Promise<readonly LmoRunnerNode[]> {
    throw new Error('not used')
  }
}

describe('LmoPipeline Service Definition', () => {
  it('loads one implementation as ctx.lmoPipeline and disposes the registration', async () => {
    const ctx = new Context()
    const fiber = await ctx.plugin(StubPipeline)
    expect(ctx.lmoPipeline).toBeInstanceOf(StubPipeline)
    expect((await ctx.lmoPipeline.listProjects())[0]?.name).toBe('项目')
    await fiber.dispose()
    expect(ctx.get('lmoPipeline')).toBeUndefined()
  })
})
