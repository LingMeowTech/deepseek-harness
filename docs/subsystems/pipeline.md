# LMO Pipeline

English | [中文](pipeline.zh.md)

The LMO pipeline capability seam reads and drives lmo-server's project → pipeline → state → job records and reports runner node status. The Service Definition is [`dsh-lmo-pipeline`](../../packages/pipeline/lmo-pipeline), the HTTP provider is [`dsh-lmo-pipeline-http`](../../packages/pipeline/lmo-pipeline-http), and the model-facing Consumer is [`dsh-tool-lmo-pipeline`](../../packages/pipeline/tool-lmo-pipeline).

## Records and status

`LmoProjectSummary`, `LmoPipelineSummary`, `LmoStateSummary`, and `LmoJobSummary` are the list rows; `LmoPipelineDetail` adds the PRD and child states/jobs. Every node status is `0` pending, `1` awaiting approval, `2` developing, `3` testing, `4` completed, `5` paused, `6` cancelled, or `7` continuous. Ids are [branded ids](core.md#branded-ids) from `LmoProjectId`, `LmoPipelineId`, `LmoStateId`, `LmoJobId`, `LmoRunnerId`, and `LmoNodeId`.

`LmoPipelineError` carries the stable failure code, the optional HTTP status, and the lmo-server error text; providers distinguish 404/401/403 from other upstream failures.

## Session tags

Pipeline sessions are ordinary DSH sessions plus durable tags from [`dsh-session-tags`](../../packages/session/session-tags): `pipeline_id`, `state_id`, `job_id`, and `node_id`. Tag writes publish `host/session-tags-changed` on the host stream.

<!-- BEGIN GENERATED cordis-surface (gen-cordis-catalog.ts) — do not edit between markers -->

<a id="cordis-surface"></a>

## Cordis API

Generated from source by `scripts/gen-cordis-catalog.ts` (verified fresh by `pnpm run verify-cordis-catalog` in doc-sync; regenerate with `pnpm run gen-cordis-catalog`) — this section is byte-identical in both language sides of the page. Signature blocks use a `ts cordis-catalog` fence and keep the original source JSDoc; dispatch modes are defined in the [primer](../cordis-primer.md#dispatch-modes), and the framework-inherited `ctx` API lives in [cordis-api/inherited.md](../cordis-api/inherited.md).

<a id="ctxlmopipeline--lmopipeline-abstract-seam"></a>

### `ctx.lmoPipeline` — `LmoPipeline` (abstract seam)

Abstract LMO pipeline service. Subclass, implement the HTTP transport, and load the subclass as a plugin — it registers as `ctx.lmoPipeline` (one implementation per context; loading a second is cordis' standard duplicate failure).

Providers return DSH camelCase projections of lmo-server records and throw LmoPipelineError for wire failures; business callers never parse lmo-server JSON themselves.

```ts cordis-catalog
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
abstract reportNode( runnerId: LmoRunnerId, nodeId: LmoNodeId, status: LmoNodeStatus, desc: string, output?: string, ): Promise<LmoReportNodeResult>

/**
 * List graph nodes assigned to one runner server.
 * @param runnerId - Runner server id.
 * @param status - `pending` (default) or `all`.
 * @returns assigned nodes in lmo-server order.
 */
abstract listRunnerNodes(runnerId: LmoRunnerId, status?: 'pending' | 'all'): Promise<readonly LmoRunnerNode[]>
```

Source: [`packages/pipeline/lmo-pipeline/src/index.ts:166`](../../packages/pipeline/lmo-pipeline/src/index.ts)
<!-- END GENERATED cordis-surface -->
