/**
 * pipeline domain zod schemas (names derived from map keys). Pipeline id
 * brand casts live here, the single cast point for this domain, mirroring the
 * sessions/workspace discipline.
 */

import { z } from 'zod'
import type { RequestPayload, ResponseValue } from './rpc-map.ts'
import type { Wire } from './rpc.schema.ts'
import type {
  PipelineDetailView,
  PipelineId,
  PipelineJobId,
  PipelineJobView,
  PipelineNodeStatus,
  PipelinePrdView,
  PipelineProjectId,
  PipelineProjectView,
  PipelineStateId,
  PipelineStateView,
  PipelineSummaryView,
} from './pipeline.ts'

/** PipelineProjectId: one brand cast after non-empty string validation. */
export const pipelineProjectIdSchema = z.string().min(1) as unknown as z.ZodType<PipelineProjectId>

/** PipelineId: one brand cast after non-empty string validation. */
export const pipelineIdSchema = z.string().min(1) as unknown as z.ZodType<PipelineId>

/** PipelineStateId: one brand cast after non-empty string validation. */
export const pipelineStateIdSchema = z.string().min(1) as unknown as z.ZodType<PipelineStateId>

/** PipelineJobId: one brand cast after non-empty string validation. */
export const pipelineJobIdSchema = z.string().min(1) as unknown as z.ZodType<PipelineJobId>

/** Node status code 0-7. */
export const pipelineNodeStatusSchema = z.number().int().min(0).max(7) as unknown as z.ZodType<PipelineNodeStatus>

/** Optional runner-id field: the wire carries a string brand-free. */
const pipelineRunnerIdSchema = z.string()

/** PipelineProjectView row of pipeline.listProjects. */
export const pipelineProjectViewSchema = z.object({
  projectId: pipelineProjectIdSchema,
  parentId: pipelineProjectIdSchema,
  name: z.string(),
  descText: z.string().optional(),
  status: pipelineNodeStatusSchema,
  pipelineTotal: z.number().int().nonnegative(),
  pipelineRunning: z.number().int().nonnegative(),
  pipelineStopped: z.number().int().nonnegative(),
  updatedAt: z.string().optional(),
}) satisfies z.ZodType<Wire<PipelineProjectView>>

/** PipelineSummaryView row of pipeline.listPipelines and project details. */
export const pipelineSummaryViewSchema = z.object({
  pipelineId: pipelineIdSchema,
  projectId: pipelineProjectIdSchema,
  name: z.string(),
  descText: z.string().optional(),
  status: pipelineNodeStatusSchema,
  stateTotal: z.number().int().nonnegative(),
  stateCompleted: z.number().int().nonnegative(),
  jobTotal: z.number().int().nonnegative(),
  jobCompleted: z.number().int().nonnegative(),
  isLooping: z.boolean(),
  updatedAt: z.string().optional(),
}) satisfies z.ZodType<Wire<PipelineSummaryView>>

/** PipelineStateView row of pipeline.listStates and pipeline.get. */
export const pipelineStateViewSchema = z.object({
  stateId: pipelineStateIdSchema,
  pipelineId: pipelineIdSchema,
  name: z.string(),
  descText: z.string().optional(),
  status: pipelineNodeStatusSchema,
  isDecomposed: z.boolean(),
  isLooping: z.boolean(),
  runnerId: pipelineRunnerIdSchema.optional(),
  jobTotal: z.number().int().nonnegative(),
  jobCompleted: z.number().int().nonnegative(),
  updatedAt: z.string().optional(),
}) satisfies z.ZodType<Wire<PipelineStateView>>

/** PipelineJobView row of pipeline.listJobs and pipeline.get. */
export const pipelineJobViewSchema = z.object({
  jobId: pipelineJobIdSchema,
  stateId: pipelineStateIdSchema,
  name: z.string(),
  descText: z.string().optional(),
  command: z.string().optional(),
  status: pipelineNodeStatusSchema,
  runnerId: pipelineRunnerIdSchema.optional(),
  updatedAt: z.string().optional(),
}) satisfies z.ZodType<Wire<PipelineJobView>>

/** PRD object embedded in a pipeline detail. */
export const pipelinePrdViewSchema = z.object({
  version: z.string(),
  content: z.string(),
  updatedAt: z.string().optional(),
}) satisfies z.ZodType<Wire<PipelinePrdView>>

/** PipelineDetailView value of pipeline.get. */
export const pipelineDetailViewSchema = z.object({
  pipelineId: pipelineIdSchema,
  projectId: pipelineProjectIdSchema,
  name: z.string(),
  descText: z.string().optional(),
  status: pipelineNodeStatusSchema,
  repo: z.string().optional(),
  branch: z.string().optional(),
  isLooping: z.boolean(),
  prd: pipelinePrdViewSchema,
  autoPlan: z.string().optional(),
  states: z.array(pipelineStateViewSchema),
  jobs: z.array(pipelineJobViewSchema),
}) satisfies z.ZodType<Wire<PipelineDetailView>>

/** pipeline.listProjects request payload (empty object literal). */
export const pipelineListProjectsRequestSchema = z.object({}) satisfies z.ZodType<Wire<RequestPayload<'pipeline.listProjects'>>>

/** pipeline.listProjects response value. */
export const pipelineListProjectsValueSchema = z.object({
  projects: z.array(pipelineProjectViewSchema),
}) satisfies z.ZodType<Wire<ResponseValue<'pipeline.listProjects'>>>

/** pipeline.listPipelines request payload: optional project and running filters. */
export const pipelineListPipelinesRequestSchema = z.object({
  projectId: pipelineProjectIdSchema.optional(),
  running: z.boolean().optional(),
}) satisfies z.ZodType<Wire<RequestPayload<'pipeline.listPipelines'>>>

/** pipeline.listPipelines response value. */
export const pipelineListPipelinesValueSchema = z.object({
  pipelines: z.array(pipelineSummaryViewSchema),
}) satisfies z.ZodType<Wire<ResponseValue<'pipeline.listPipelines'>>>

/** pipeline.get request payload. */
export const pipelineGetRequestSchema = z.object({
  pipelineId: pipelineIdSchema,
}) satisfies z.ZodType<Wire<RequestPayload<'pipeline.get'>>>

/** pipeline.get response value. */
export const pipelineGetValueSchema = z.object({
  pipeline: pipelineDetailViewSchema,
}) satisfies z.ZodType<Wire<ResponseValue<'pipeline.get'>>>

/** pipeline.pushPrd request payload: the complete PRD markdown. */
export const pipelinePushPrdRequestSchema = z.object({
  pipelineId: pipelineIdSchema,
  content: z.string().min(1),
}) satisfies z.ZodType<Wire<RequestPayload<'pipeline.pushPrd'>>>

/** pipeline.pushPrd response value. */
export const pipelinePushPrdValueSchema = z.object({
  pipelineId: pipelineIdSchema,
  prdVersion: z.string(),
}) satisfies z.ZodType<Wire<ResponseValue<'pipeline.pushPrd'>>>

/** pipeline.approve request payload. */
export const pipelineApproveRequestSchema = z.object({
  pipelineId: pipelineIdSchema,
}) satisfies z.ZodType<Wire<RequestPayload<'pipeline.approve'>>>

/** pipeline.approve response value. */
export const pipelineApproveValueSchema = z.object({
  pipelineId: pipelineIdSchema,
  status: pipelineNodeStatusSchema,
}) satisfies z.ZodType<Wire<ResponseValue<'pipeline.approve'>>>

/** pipeline.rerun request payload. */
export const pipelineRerunRequestSchema = z.object({
  pipelineId: pipelineIdSchema,
}) satisfies z.ZodType<Wire<RequestPayload<'pipeline.rerun'>>>

/** pipeline.rerun response value. */
export const pipelineRerunValueSchema = z.object({
  pipelineId: pipelineIdSchema,
  resetCount: z.number().int().nonnegative(),
}) satisfies z.ZodType<Wire<ResponseValue<'pipeline.rerun'>>>

/** pipeline.listStates request payload. */
export const pipelineListStatesRequestSchema = z.object({
  pipelineId: pipelineIdSchema,
}) satisfies z.ZodType<Wire<RequestPayload<'pipeline.listStates'>>>

/** pipeline.listStates response value. */
export const pipelineListStatesValueSchema = z.object({
  states: z.array(pipelineStateViewSchema),
}) satisfies z.ZodType<Wire<ResponseValue<'pipeline.listStates'>>>

/** pipeline.listJobs request payload. */
export const pipelineListJobsRequestSchema = z.object({
  stateId: pipelineStateIdSchema,
}) satisfies z.ZodType<Wire<RequestPayload<'pipeline.listJobs'>>>

/** pipeline.listJobs response value. */
export const pipelineListJobsValueSchema = z.object({
  jobs: z.array(pipelineJobViewSchema),
}) satisfies z.ZodType<Wire<ResponseValue<'pipeline.listJobs'>>>
