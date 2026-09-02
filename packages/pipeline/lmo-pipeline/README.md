# @deepseek-ai/dsh-lmo-pipeline

The **`LmoPipeline`** Service Definition (`ctx.lmoPipeline`) defines how the harness reads and drives lmo-server pipeline data: projects, pipelines, states, jobs, PRD approval, reruns, and runner node reporting. It owns the request/result vocabulary and the `LmoPipelineError` code taxonomy.

| Package | Role |
|---|---|
| `@deepseek-ai/dsh-lmo-pipeline` (this) | Service Definition: the abstract service, ids, record types, and errors |
| `@deepseek-ai/dsh-lmo-pipeline-http` | Provider: HMAC-signed HTTP transport to lmo-server |
| `@deepseek-ai/dsh-tool-lmo-pipeline` | Consumer: the model-facing `pipeline_*` tools |
| `packages/host/apiproxy` | Consumer: the `pipeline.*` browser RPC surface |

## Service API (`ctx.lmoPipeline`)

All methods return Promises. Providers return camelCase projections of the lmo-server JSON fields and throw `LmoPipelineError` on transport, HTTP, or response-shape failures; callers never see lmo-server snake_case JSON.

| Member | Semantics |
|---|---|
| `listProjects()` / `getProject(id)` | List project summaries, or one project with its child pipelines |
| `listPipelines(projectId?, running?)` | Pipeline summaries, optionally by project and running state (`true` = status 2/3, `false` = 0/4/5/6) |
| `getPipeline(id)` | One pipeline with PRD, states, and jobs |
| `pushPrd(id, content)` | Push a PRD; lmo-server moves the node to status 1 |
| `approve(id)` | Approve the PRD; lmo-server moves the node to status 2 |
| `listStates(pipelineId)` / `listJobs(stateId)` | Child summaries under one node |
| `patchJob(id, patch)` | Update a job with the supplied field subset |
| `rerunPipeline(id)` | Reset the pipeline and descendants for another run |
| `reportNode(runnerId, nodeId, status, desc, output?)` | Report one runner-assigned node result |
| `listRunnerNodes(runnerId, status?)` | List a runner's assigned nodes (`pending` or `all`) |

Status codes: `0` pending, `1` awaiting approval, `2` developing, `3` testing, `4` completed, `5` paused, `6` cancelled, `7` continuous.

## Errors

`LmoPipelineError` carries a stable `code`, the optional `httpStatus`, and the lmo-server `serverError` text. Providers distinguish `LMO_NOT_FOUND` (404), `LMO_UNAUTHORIZED` (401), `LMO_FORBIDDEN` (403), `LMO_UPSTREAM_ERROR` (other HTTP failures), `LMO_INVALID_RESPONSE`, and `LMO_REQUEST_FAILED`.

## Model Experience

Indirectly, through `dsh-tool-lmo-pipeline`, which renders this service's records into the model-facing `pipeline_*` results.

#### KV Cache effect

No direct invalidation; the named consumer owns any request-prefix changes.

## Known Limitations and Deferred Work

- **Read-oriented seam** — create/delete operations for projects, pipelines, states, and jobs are intentionally absent until a Consumer needs them; lmo-server exposes the endpoints, so adding one is a seam widening, not a transport change.
- **No observation stream** — the service returns snapshots only; live pipeline progress requires polling or a future lmo-server event channel.
