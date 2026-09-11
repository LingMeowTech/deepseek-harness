# Agent Note: LMO pipeline Cordis seam and durable session tags

Status: implemented

English | [中文](2026-08-15-lmo-pipeline-cordis-seam.zh.md)

## Problem

The DSH platform migration needs host and model access to lmo-server pipeline data (project → pipeline → state → job), plus a durable way to identify which ordinary DSH sessions belong to one pipeline job. Both faces must work without a second session authority in the Go runner.

## Decision

The repository adds the `pipeline` package group with the three capability roles: `@deepseek-ai/dsh-lmo-pipeline` (Service Definition `ctx.lmoPipeline`), `@deepseek-ai/dsh-lmo-pipeline-http` (HMAC HTTP provider), and `@deepseek-ai/dsh-tool-lmo-pipeline` (model-facing `pipeline_*` tools). Host browser access goes through the existing apiproxy domain pattern: `pipeline.*` RPC methods, zod wire schemas, and a React-free `PipelineRuntime` exposed as `ctx.pipelines` in the client runtime.

The HTTP provider uses Node's global `fetch` directly. `ctx.web` fetch is GET-only anonymous public-resource retrieval with no custom headers, no POST/PATCH, and non-2xx responses as results, so it cannot carry signed pipeline requests. The provider owns the `METHOD\nPATH\nQUERY\nBODY_SHA256\nTIMESTAMP\nNONCE` canonical request and the `X-Secret-Id`/`X-Timestamp`/`X-Nonce`/`X-Signature` headers.

Session tags are a storage-domain table, not session-log events: the log is append-only and a cold session cannot be mutated without preparing a live owner, while a domain table can be written for any session id. `@deepseek-ai/dsh-session-tags` owns the `session_tags` domain, the `ctx.sessionTags` registry, and the frozen pipeline tag names `pipeline_id` / `state_id` / `job_id` / `node_id`. The host API proxy projects `domain/changed` table writes into the existing host stream as `host/session-tags-changed` frames, so subscribed clients update without polling.

## Alternatives considered

- **Route provider HTTP through `ctx.web`** — rejected because that seam's fetch contract cannot express signed POST/PATCH requests and treats HTTP 404/401/403 as fetch results, which would erase the error taxonomy the task freezes.
- **Store session tags as appended session events** — rejected because append-only logs cannot mutate a cold session without binding a live owner, and tag changes do not belong in the conversation history projection.
- **Keep tag state only in client memory** — rejected because the frozen session contract requires persistence and cross-tab/cross-process visibility through the existing host notification channel.

## Consequences

- The seam adds four packages and one host-stream frame variant. S2 and S4 consume the `pipeline.*` wire types and `host/session-tags-changed` without importing lmo-server transport details.
- Provider transport remains replaceable behind `ctx.lmoPipeline`; the model tool surface stays stable across provider swaps.
- Tag writes are durable before notification, and removal of the last tag deletes the storage row; `session.tags.list` remains the reconnect baseline.
- The generated Cordis catalog documents `ctx.lmoPipeline` on `docs/subsystems/pipeline.md` and `ctx.sessionTags` on the session subsystem page.
