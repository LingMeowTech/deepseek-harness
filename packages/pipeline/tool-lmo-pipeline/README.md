# @deepseek-ai/dsh-tool-lmo-pipeline

The **`pipeline_*` tool suite** is the model-facing Consumer of `ctx.lmoPipeline`. It registers nine tools on `ctx.tools`, exposes only task-relevant arguments, renders every result in Chinese with names and status codes, and declares generic UI render intent (no diff).

## Tools

| Tool | Purpose |
|---|---|
| `pipeline_projects` | List projects and pipeline counts |
| `pipeline_pipelines` | List pipelines, filter by `project_id` / `running` |
| `pipeline_get` | One pipeline with PRD, states, and jobs |
| `pipeline_prd` | Push a PRD; pipeline moves to status 1 |
| `pipeline_approve` | Approve a PRD; pipeline moves to status 2 |
| `pipeline_states` / `pipeline_jobs` | Child summaries |
| `pipeline_rerun` | Reset a pipeline and descendants for another run |
| `pipeline_report_node` | Report one runner node status |

Status mapping: `0` 待规划, `1` 待审批, `2` 开发中, `3` 测试中, `4` 已完成, `5` 已暂停, `6` 已取消, `7` 持续中.

## Config

| Key | Default | Meaning |
|---|---|---|
| `maxPrdChars` | `80000` | Cap on rendered PRD characters in `pipeline_get` |

`pipeline_approve`, `pipeline_rerun`, and `pipeline_report_node` name their irreversible consequences in the schema description because approval, rerun, and completion/cancellation all change downstream scheduling.

## Model Experience

### Model-facing pipeline tool schemas

#### What the model sees

The model sees the generated [`pipeline_*` tool schemas](../../../docs/tool-catalog.md#deepseek-aidsh-tool-lmo-pipeline): `pipeline_projects`, `pipeline_pipelines`, `pipeline_get`, `pipeline_prd`, `pipeline_approve`, `pipeline_states`, `pipeline_jobs`, `pipeline_rerun`, and `pipeline_report_node`. Arguments expose only task fields (ids, PRD content, node status, description, output); the high-risk descriptions state the scheduling consequences. Every result is Chinese text containing the project/pipeline/state/job name and `label（状态：code）` status lines.

#### Token effect

Nine fixed tool schemas plus one data-dependent Chinese text result per call. Result size follows lmo-server data; `pipeline_get` caps rendered PRD characters at `maxPrdChars` and marks truncation.

#### KV Cache effect

The schema set and descriptions are fixed, so prompt prefixes stay reusable across calls. A deployment changing `maxPrdChars` does not change the request prefix; per-call results replace only trailing content.

## Known Limitations and Deferred Work

- **No `pipeline_patch_job` tool** — `ctx.lmoPipeline.patchJob` serves the host/RPC plane; a model-facing patch tool is deferred until a task workflow proves the model needs to mutate jobs directly.
- **No project-detail tool** — `getProject` is host/RPC-only; `pipeline_projects` already carries the summary fields a model task consumes.
