/**
 * The outward pipelines-service face — what `ctx.pipelines` exposes to
 * feature packages and the renderer host. It covers exactly the host
 * `pipeline.*` RPC surface; the runner-only `reportNode` verb stays
 * host-side in `ctx.lmoPipeline`.
 */
import type {
  PipelineDetailView,
  PipelineId,
  PipelineJobView,
  PipelineProjectId,
  PipelineProjectView,
  PipelineStateId,
  PipelineStateView,
  PipelineSummaryView,
} from '@deepseek-ai/dsh-api-remotes/client'

/** The pipelines-service face injected as `ctx.pipelines`. */
export interface IPipelines {
  /** List every visible lmo-server project. */
  listProjects(): Promise<PipelineProjectView[]>
  /** List pipelines, optionally by project and running state. */
  listPipelines(projectId?: PipelineProjectId, running?: boolean): Promise<PipelineSummaryView[]>
  /** Read one pipeline with PRD, states, and jobs. */
  get(pipelineId: PipelineId): Promise<PipelineDetailView>
  /** Push a PRD version; lmo-server moves the pipeline to status 1. */
  pushPrd(pipelineId: PipelineId, content: string): Promise<{ pipelineId: PipelineId; prdVersion: string }>
  /** Approve the PRD; lmo-server moves the pipeline to status 2. */
  approve(pipelineId: PipelineId): Promise<{ pipelineId: PipelineId; status: number }>
  /** Reset the pipeline and its descendants for another run. */
  rerun(pipelineId: PipelineId): Promise<{ pipelineId: PipelineId; resetCount: number }>
  /** List states owned by one pipeline. */
  listStates(pipelineId: PipelineId): Promise<PipelineStateView[]>
  /** List jobs owned by one state. */
  listJobs(stateId: PipelineStateId): Promise<PipelineJobView[]>
}
