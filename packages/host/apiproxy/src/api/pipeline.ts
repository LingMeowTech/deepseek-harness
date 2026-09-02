/**
 * pipeline domain contract. Wire projection of the LMO pipeline service
 * (`ctx.lmoPipeline`): project → pipeline → state → job records plus the
 * host-side approval, PRD, and rerun verbs. Method signatures are the source
 * of truth, same as the sessions and workspace domains.
 */

import type { Branded } from '@deepseek-ai/dsh-brand'
import type { RpcRequest, RpcResponse } from './rpc.ts'

/** Wire-side project id brand, structurally matching the host service brand. */
export type PipelineProjectId = Branded<'LmoProjectId'>

/** Wire-side pipeline id brand, structurally matching the host service brand. */
export type PipelineId = Branded<'LmoPipelineId'>

/** Wire-side state id brand, structurally matching the host service brand. */
export type PipelineStateId = Branded<'LmoStateId'>

/** Wire-side job id brand, structurally matching the host service brand. */
export type PipelineJobId = Branded<'LmoJobId'>

/** Node status vocabulary shared by every pipeline wire row. */
export type PipelineNodeStatus = 0 | 1 | 2 | 3 | 4 | 5 | 6 | 7

/** One project row of pipeline.listProjects. */
export interface PipelineProjectView {
  projectId: PipelineProjectId
  parentId: PipelineProjectId
  name: string
  descText?: string
  status: PipelineNodeStatus
  pipelineTotal: number
  pipelineRunning: number
  pipelineStopped: number
  updatedAt?: string
}

/** One pipeline row of pipeline.listPipelines and one project detail child. */
export interface PipelineSummaryView {
  pipelineId: PipelineId
  projectId: PipelineProjectId
  name: string
  descText?: string
  status: PipelineNodeStatus
  stateTotal: number
  stateCompleted: number
  jobTotal: number
  jobCompleted: number
  isLooping: boolean
  updatedAt?: string
}

/** One state row. */
export interface PipelineStateView {
  stateId: PipelineStateId
  pipelineId: PipelineId
  name: string
  descText?: string
  status: PipelineNodeStatus
  isDecomposed: boolean
  isLooping: boolean
  runnerId?: string
  jobTotal: number
  jobCompleted: number
  updatedAt?: string
}

/** One job row. */
export interface PipelineJobView {
  jobId: PipelineJobId
  stateId: PipelineStateId
  name: string
  descText?: string
  command?: string
  status: PipelineNodeStatus
  runnerId?: string
  updatedAt?: string
}

/** One PRD version embedded in a pipeline detail. */
export interface PipelinePrdView {
  version: string
  content: string
  updatedAt?: string
}

/** Full pipeline detail carried by pipeline.get. */
export interface PipelineDetailView {
  pipelineId: PipelineId
  projectId: PipelineProjectId
  name: string
  descText?: string
  status: PipelineNodeStatus
  repo?: string
  branch?: string
  isLooping: boolean
  prd: PipelinePrdView
  autoPlan?: string
  states: PipelineStateView[]
  jobs: PipelineJobView[]
}

/** pipeline.* unary methods (the map keys pipeline.* of RpcMethodMap). */
export interface PipelineApi {
  /**
   * Lists every visible lmo-server project.
   */
  listProjects(request: RpcRequest<{}>): Promise<RpcResponse<{ projects: PipelineProjectView[] }>>

  /**
   * Lists lmo-server pipelines, optionally filtered by owning project and by
   * running state (`true` = status 2/3, `false` = 0/4/5/6).
   */
  listPipelines(request: RpcRequest<{ projectId?: PipelineProjectId; running?: boolean }>):
  Promise<RpcResponse<{ pipelines: PipelineSummaryView[] }>>

  /**
   * Reads one pipeline detail: summary fields, PRD, states, and jobs.
   */
  get(request: RpcRequest<{ pipelineId: PipelineId }>):
  Promise<RpcResponse<{ pipeline: PipelineDetailView }>>

  /**
   * Pushes a PRD content string; lmo-server moves the pipeline to status 1.
   */
  pushPrd(request: RpcRequest<{ pipelineId: PipelineId; content: string }>):
  Promise<RpcResponse<{ pipelineId: PipelineId; prdVersion: string }>>

  /**
   * Approves the pipeline PRD; lmo-server moves the pipeline to status 2.
   */
  approve(request: RpcRequest<{ pipelineId: PipelineId }>):
  Promise<RpcResponse<{ pipelineId: PipelineId; status: PipelineNodeStatus }>>

  /**
   * Resets the pipeline and its descendants for another run.
   */
  rerun(request: RpcRequest<{ pipelineId: PipelineId }>):
  Promise<RpcResponse<{ pipelineId: PipelineId; resetCount: number }>>

  /**
   * Lists states owned by one pipeline.
   */
  listStates(request: RpcRequest<{ pipelineId: PipelineId }>):
  Promise<RpcResponse<{ states: PipelineStateView[] }>>

  /**
   * Lists jobs owned by one state.
   */
  listJobs(request: RpcRequest<{ stateId: PipelineStateId }>):
  Promise<RpcResponse<{ jobs: PipelineJobView[] }>>
}
