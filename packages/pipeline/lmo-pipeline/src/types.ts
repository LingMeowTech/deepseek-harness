/**
 * Public type vocabulary of the LMO pipeline capability seam (`ctx.lmoPipeline`).
 * Types only — id factories and the `LmoPipelineError` class live in `index.ts`.
 * Field names follow the DSH camelCase convention; the HTTP provider maps the
 * lmo-server snake_case JSON projection into these values.
 * @module @deepseek-ai/dsh-lmo-pipeline/types
 */

import type { Branded } from '@deepseek-ai/dsh-brand'

/** Identifies one lmo-server project node. */
export type LmoProjectId = Branded<'LmoProjectId'>

/** Identifies one lmo-server pipeline node. */
export type LmoPipelineId = Branded<'LmoPipelineId'>

/** Identifies one lmo-server state node. */
export type LmoStateId = Branded<'LmoStateId'>

/** Identifies one lmo-server job node. */
export type LmoJobId = Branded<'LmoJobId'>

/** Identifies one registered lmo-server runner. */
export type LmoRunnerId = Branded<'LmoRunnerId'>

/** Identifies one graph node reported by a runner. */
export type LmoNodeId = Branded<'LmoNodeId'>

/**
 * Node status code shared by project/pipeline/state/job/runner-node records.
 * 0 pending, 1 awaiting approval, 2 developing, 3 testing, 4 completed,
 * 5 paused, 6 cancelled, 7 continuous.
 */
export type LmoNodeStatus = 0 | 1 | 2 | 3 | 4 | 5 | 6 | 7

/** One row of `listProjects()`: the lmo-server project summary. */
export interface LmoProjectSummary {
  readonly projectId: LmoProjectId
  readonly parentId: LmoProjectId
  readonly name: string
  readonly descText?: string
  readonly status: LmoNodeStatus
  readonly pipelineTotal: number
  readonly pipelineRunning: number
  readonly pipelineStopped: number
  readonly updatedAt?: string
}

/** One project detail: `getProject(id)` returns its child pipeline summaries. */
export interface LmoProject {
  readonly projectId: LmoProjectId
  readonly name: string
  readonly descText?: string
  readonly status: LmoNodeStatus
  readonly pipelines: readonly LmoPipelineSummary[]
}

/** One row of `listPipelines()`: the lmo-server pipeline summary. */
export interface LmoPipelineSummary {
  readonly pipelineId: LmoPipelineId
  readonly projectId: LmoProjectId
  readonly name: string
  readonly descText?: string
  readonly status: LmoNodeStatus
  readonly stateTotal: number
  readonly stateCompleted: number
  readonly jobTotal: number
  readonly jobCompleted: number
  readonly isLooping: boolean
  readonly updatedAt?: string
}

/** One PRD version stored on a pipeline node. */
export interface LmoPrd {
  readonly version: string
  readonly content: string
  readonly updatedAt?: string
}

/** One state row of a pipeline detail or `listStates()`. */
export interface LmoStateSummary {
  readonly stateId: LmoStateId
  readonly pipelineId: LmoPipelineId
  readonly name: string
  readonly descText?: string
  readonly status: LmoNodeStatus
  readonly isDecomposed: boolean
  readonly isLooping: boolean
  readonly runnerId?: LmoRunnerId
  readonly jobTotal: number
  readonly jobCompleted: number
  readonly updatedAt?: string
}

/** One job row of a pipeline detail or `listJobs()`. */
export interface LmoJobSummary {
  readonly jobId: LmoJobId
  readonly stateId: LmoStateId
  readonly name: string
  readonly descText?: string
  readonly command?: string
  readonly status: LmoNodeStatus
  readonly runnerId?: LmoRunnerId
  readonly updatedAt?: string
}

/** One pipeline detail: the summary fields plus PRD, states, and jobs. */
export interface LmoPipelineDetail {
  readonly pipelineId: LmoPipelineId
  readonly projectId: LmoProjectId
  readonly name: string
  readonly descText?: string
  readonly status: LmoNodeStatus
  readonly repo?: string
  readonly branch?: string
  readonly isLooping: boolean
  readonly prd: LmoPrd
  readonly autoPlan?: string
  readonly states: readonly LmoStateSummary[]
  readonly jobs: readonly LmoJobSummary[]
}

/** Accepted fields for `patchJob(id, patch)`; every field is optional. */
export interface LmoJobPatch {
  readonly name?: string
  readonly descText?: string
  readonly command?: string
  readonly status?: LmoNodeStatus
  readonly runnerId?: LmoRunnerId
  readonly payload?: string
}

/** Result of `pushPrd(id, content)`. */
export interface LmoPushPrdResult {
  readonly pipelineId: LmoPipelineId
  readonly prdVersion: string
}

/** Result of `approve(id)`. */
export interface LmoApproveResult {
  readonly pipelineId: LmoPipelineId
  readonly status: LmoNodeStatus
}

/** Result of `patchJob(id, patch)`. */
export interface LmoPatchJobResult {
  readonly jobId: LmoJobId
}

/** Result of `rerunPipeline(id)`. */
export interface LmoRerunPipelineResult {
  readonly pipelineId: LmoPipelineId
  readonly resetCount: number
}

/** Result of `reportNode(...)`. */
export interface LmoReportNodeResult {
  readonly ok: boolean
}

/** One runner-assigned graph node: the lmo-server `GraphNodeItem` projection. */
export interface LmoRunnerNode {
  readonly nodeId: LmoNodeId
  readonly type: 'project' | 'pipeline' | 'state' | 'job'
  readonly parentId: string
  readonly ownerProjectId: LmoProjectId
  readonly name: string
  readonly descText: string
  readonly content?: string
  readonly sessionId?: string
  readonly agentBackend: string
  readonly status: LmoNodeStatus
  readonly isDecomposed: boolean
  readonly isLooping: boolean
  readonly isEntry: boolean
  readonly isExit: boolean
  readonly payload?: string
  readonly runnerId?: LmoRunnerId
  readonly depth: number
  readonly path?: string
  readonly updatedAt: string
}
