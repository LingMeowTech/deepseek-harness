/** PipelineRuntime projects the host pipeline.* RPC surface for UI consumers. */

import type { Context } from '@deepseek-ai/cordis'
import type {
  IApiClient, PipelineDetailView, PipelineId, PipelineJobView, PipelineProjectId,
  PipelineProjectView, PipelineStateId, PipelineStateView, PipelineSummaryView,
  RpcError, RpcResponse,
} from '@deepseek-ai/dsh-api-remotes/client'
import type { IPipelines } from '../contract/pipelines.ts'

/** Structured failure so pipeline surfaces can branch on host business codes. */
export class PipelineRuntimeError extends Error {
  constructor(readonly rpcError: RpcError) {
    super(`pipeline request failed: ${rpcError.code}: ${rpcError.message}`)
    this.name = 'PipelineRuntimeError'
  }
}

/** Real pipeline object layer over the shared wire client. */
export class PipelineRuntime implements IPipelines {
  /**
   * @param ctx - client root context.
   * @param api - shared wire client.
   */
  constructor(ctx: Context, private readonly api: IApiClient) {
    ctx.reflect.provide('pipelines', this, undefined)
  }

  /** Unwrap one unary response or throw its structured host error. */
  private value<T>(response: RpcResponse<T>): T {
    if (!response.result.ok) throw new PipelineRuntimeError(response.result.error)
    return response.result.value
  }

  listProjects(): Promise<PipelineProjectView[]> {
    return this.api.pipeline.listProjects({}).then(response => this.value(response).projects)
  }

  listPipelines(projectId?: PipelineProjectId, running?: boolean): Promise<PipelineSummaryView[]> {
    return this.api.pipeline.listPipelines({
      ...projectId === undefined ? {} : { projectId },
      ...running === undefined ? {} : { running },
    }).then(response => this.value(response).pipelines)
  }

  get(pipelineId: PipelineId): Promise<PipelineDetailView> {
    return this.api.pipeline.get({ pipelineId }).then(response => this.value(response).pipeline)
  }

  pushPrd(pipelineId: PipelineId, content: string): Promise<{ pipelineId: PipelineId; prdVersion: string }> {
    return this.api.pipeline.pushPrd({ pipelineId, content }).then(response => this.value(response))
  }

  approve(pipelineId: PipelineId): Promise<{ pipelineId: PipelineId; status: number }> {
    return this.api.pipeline.approve({ pipelineId }).then(response => this.value(response))
  }

  rerun(pipelineId: PipelineId): Promise<{ pipelineId: PipelineId; resetCount: number }> {
    return this.api.pipeline.rerun({ pipelineId }).then(response => this.value(response))
  }

  listStates(pipelineId: PipelineId): Promise<PipelineStateView[]> {
    return this.api.pipeline.listStates({ pipelineId }).then(response => this.value(response).states)
  }

  listJobs(stateId: PipelineStateId): Promise<PipelineJobView[]> {
    return this.api.pipeline.listJobs({ stateId }).then(response => this.value(response).jobs)
  }
}
