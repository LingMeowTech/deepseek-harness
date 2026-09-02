/**
 * Service Definition for the LMO pipeline capability seam (`ctx.lmoPipeline`):
 * project → pipeline → state → job records from lmo-server plus runner node
 * reporting. Providers implement the HTTP/HMAC transport; the model-facing
 * `pipeline_*` tools and the host `pipeline.*` RPC surface are Consumers.
 * @module @deepseek-ai/dsh-lmo-pipeline
 */

import { Context, Service } from '@deepseek-ai/cordis'
import type * as PipelineTypes from './types.ts'
import type {
  LmoApproveResult,
  LmoJobPatch,
  LmoJobSummary,
  LmoNodeStatus,
  LmoPatchJobResult,
  LmoPipelineDetail,
  LmoPipelineSummary,
  LmoProject,
  LmoProjectSummary,
  LmoPushPrdResult,
  LmoReportNodeResult,
  LmoRerunPipelineResult,
  LmoRunnerNode,
  LmoStateSummary,
} from './types.ts'

export type {
  LmoApproveResult,
  LmoJobPatch,
  LmoJobSummary,
  LmoNodeStatus,
  LmoPatchJobResult,
  LmoPipelineDetail,
  LmoPipelineSummary,
  LmoPrd,
  LmoProject,
  LmoProjectSummary,
  LmoPushPrdResult,
  LmoReportNodeResult,
  LmoRerunPipelineResult,
  LmoRunnerNode,
  LmoStateSummary,
} from './types.ts'

export type LmoJobId = PipelineTypes.LmoJobId
export type LmoNodeId = PipelineTypes.LmoNodeId
export type LmoPipelineId = PipelineTypes.LmoPipelineId
export type LmoProjectId = PipelineTypes.LmoProjectId
export type LmoRunnerId = PipelineTypes.LmoRunnerId
export type LmoStateId = PipelineTypes.LmoStateId

/**
 * Brand a string as a {@link LmoProjectId}.
 * @param id - Raw lmo-server project id.
 * @returns the same string, branded at compile time.
 */
export function LmoProjectId(id: string): LmoProjectId {
  return id as LmoProjectId
}

/**
 * Brand a string as a {@link LmoPipelineId}.
 * @param id - Raw lmo-server pipeline id.
 * @returns the same string, branded at compile time.
 */
export function LmoPipelineId(id: string): LmoPipelineId {
  return id as LmoPipelineId
}

/**
 * Brand a string as a {@link LmoStateId}.
 * @param id - Raw lmo-server state id.
 * @returns the same string, branded at compile time.
 */
export function LmoStateId(id: string): LmoStateId {
  return id as LmoStateId
}

/**
 * Brand a string as a {@link LmoJobId}.
 * @param id - Raw lmo-server job id.
 * @returns the same string, branded at compile time.
 */
export function LmoJobId(id: string): LmoJobId {
  return id as LmoJobId
}

/**
 * Brand a string as a {@link LmoRunnerId}.
 * @param id - Raw lmo-server runner id.
 * @returns the same string, branded at compile time.
 */
export function LmoRunnerId(id: string): LmoRunnerId {
  return id as LmoRunnerId
}

/**
 * Brand a string as a {@link LmoNodeId}.
 * @param id - Raw lmo-server graph node id.
 * @returns the same string, branded at compile time.
 */
export function LmoNodeId(id: string): LmoNodeId {
  return id as LmoNodeId
}

/** Stable machine-routable failure codes raised by pipeline providers. */
export type LmoPipelineErrorCode =
  | 'LMO_NOT_FOUND'
  | 'LMO_UNAUTHORIZED'
  | 'LMO_FORBIDDEN'
  | 'LMO_UPSTREAM_ERROR'
  | 'LMO_INVALID_RESPONSE'
  | 'LMO_REQUEST_FAILED'

/**
 * Provider failure surfaced through the pipeline seam. HTTP failures carry
 * their status and the server error text; 404/401/403 get distinct codes.
 */
export class LmoPipelineError extends Error {
  /** Stable code for wire mapping and model diagnostics. */
  readonly code: LmoPipelineErrorCode
  /** HTTP status when lmo-server answered; absent for transport/JSON failures. */
  readonly httpStatus?: number
  /** Server-provided error text, or the transport/parse failure message. */
  readonly serverError: string

  /**
   * @param code - Stable failure code.
   * @param message - Human-readable summary.
   * @param httpStatus - HTTP status when the failure is an HTTP response.
   * @param serverError - Server error text.
   * @param cause - Underlying transport or parse error.
   */
  constructor(
    code: LmoPipelineErrorCode,
    message: string,
    httpStatus?: number,
    serverError = '',
    cause?: unknown,
  ) {
    super(message, cause === undefined ? undefined : { cause })
    this.name = 'LmoPipelineError'
    this.code = code
    if (httpStatus !== undefined) this.httpStatus = httpStatus
    this.serverError = serverError
  }
}

declare module '@deepseek-ai/cordis' {
  interface Context {
    lmoPipeline: LmoPipeline
  }
}

/**
 * Abstract LMO pipeline service. Subclass, implement the HTTP transport, and
 * load the subclass as a plugin — it registers as `ctx.lmoPipeline` (one
 * implementation per context; loading a second is cordis' standard duplicate
 * failure).
 *
 * Providers return DSH camelCase projections of lmo-server records and throw
 * {@link LmoPipelineError} for wire failures; business callers never parse
 * lmo-server JSON themselves.
 */
export abstract class LmoPipeline extends Service {
  constructor(ctx: Context) {
    super(ctx, 'lmoPipeline')
  }

  /**
   * List every visible project node.
   * @returns project summaries in lmo-server order.
   */
  abstract listProjects(): Promise<readonly LmoProjectSummary[]>

  /**
   * Fetch one project with its child pipeline summaries.
   * @param id - Project id.
   * @returns the project detail.
   */
  abstract getProject(id: LmoProjectId): Promise<LmoProject>

  /**
   * List pipeline nodes, optionally filtered by owning project and by running
   * state (running=true means status 2/3, false means 0/4/5/6).
   * @param projectId - Owning project filter; omitted lists every visible pipeline.
   * @param running - Running-state filter; omitted lists every status.
   * @returns pipeline summaries in lmo-server order.
   */
  abstract listPipelines(projectId?: LmoProjectId, running?: boolean): Promise<readonly LmoPipelineSummary[]>

  /**
   * Fetch one pipeline detail: summary fields plus PRD, states, and jobs.
   * @param id - Pipeline id.
   * @returns the complete pipeline detail.
   */
  abstract getPipeline(id: LmoPipelineId): Promise<LmoPipelineDetail>

  /**
   * Push a new PRD version onto a pipeline. lmo-server moves the node to
   * status 1 (awaiting approval) and increments `prd_version`.
   * @param id - Pipeline id.
   * @param content - Markdown PRD content.
   * @returns the updated pipeline id and version.
   */
  abstract pushPrd(id: LmoPipelineId, content: string): Promise<LmoPushPrdResult>

  /**
   * Approve a pipeline's PRD. lmo-server moves the node to status 2
   * (developing); runners may then claim its states and jobs.
   * @param id - Pipeline id.
   * @returns the updated pipeline id and status.
   */
  abstract approve(id: LmoPipelineId): Promise<LmoApproveResult>

  /**
   * List states owned by one pipeline.
   * @param pipelineId - Owning pipeline id.
   * @returns state summaries in lmo-server order.
   */
  abstract listStates(pipelineId: LmoPipelineId): Promise<readonly LmoStateSummary[]>

  /**
   * List jobs owned by one state.
   * @param stateId - Owning state id.
   * @returns job summaries in lmo-server order.
   */
  abstract listJobs(stateId: LmoStateId): Promise<readonly LmoJobSummary[]>

  /**
   * Patch one job node with any non-empty subset of the patch fields.
   * @param id - Job id.
   * @param patch - Fields to update.
   * @returns the patched job id.
   */
  abstract patchJob(id: LmoJobId, patch: LmoJobPatch): Promise<LmoPatchJobResult>

  /**
   * Reset a pipeline and its state/job descendants to pending for a rerun.
   * @param id - Pipeline id.
   * @returns the pipeline id and the number of reset nodes.
   */
  abstract rerunPipeline(id: LmoPipelineId): Promise<LmoRerunPipelineResult>

  /**
   * Report one runner-owned node result back to lmo-server.
   * @param runnerId - Runner server id the node was assigned to.
   * @param nodeId - Graph node id.
   * @param status - Node status to report (2/3/4/6 in the runner vocabulary).
   * @param desc - Progress description.
   * @param output - Optional result data; lmo-server stores it without routing it.
   * @returns the lmo-server acceptance result.
   */
  abstract reportNode(
    runnerId: LmoRunnerId,
    nodeId: LmoNodeId,
    status: LmoNodeStatus,
    desc: string,
    output?: string,
  ): Promise<LmoReportNodeResult>

  /**
   * List graph nodes assigned to one runner server.
   * @param runnerId - Runner server id.
   * @param status - `pending` (default) or `all`.
   * @returns assigned nodes in lmo-server order.
   */
  abstract listRunnerNodes(runnerId: LmoRunnerId, status?: 'pending' | 'all'): Promise<readonly LmoRunnerNode[]>
}

export default LmoPipeline
