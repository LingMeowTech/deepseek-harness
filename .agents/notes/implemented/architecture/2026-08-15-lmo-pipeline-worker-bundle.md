# Agent Note: LMO pipeline worker bundle and profile

Status: implemented

English | [中文](2026-08-15-lmo-pipeline-worker-bundle.zh.md)

## Problem

The DSH platform migration needs a DSH process that the Go runner can spawn as one pipeline job: a full agent harness with filesystem, shell, subagent, skill, and pipeline tooling, speaking the frozen stdio JSON-RPC handshake over a built `dsh-jsonrpc-agent` executable, and writing structured results to `<worktree>/.lmo/output.json`. The worker must not load the web-app layer. Its model-visible execution/decompose workflows must stay byte-stable (request-cache and snapshot stability), and every session it mints must carry the pipeline identity tags.

## Decision

`packages/bundle/lmo-pipeline-worker` ships both deployment forms of one composition:

- `cordis.patch.yml` — the `dsh --profile lmo-pipeline-worker` layer over `@deepseek-ai/dsh-base`, used for development and verification. It disables HMR, forces `approval.policy: never`, adds the lmtech skill roots, and inserts the worker-only rows (jsonrpc server, storage/session-tags/pipeline-worker-tags, lmo-pipeline seam, dsh-sdk subagent backend, terminal).
- `worker.cordis.yml` — the flat `DSH_CORDIS_CONFIG` composition the runner passes to the built `dsh-jsonrpc-agent` executable (one process per pipeline job). It is a standalone include leaf that re-declares every row it needs; the profile layer exists independently of it.

The frozen model-visible persona (`src/prompts.ts`) pins the execution workflow, the decompose workflow, and the injected-environment contract. `cordis.patch.yml` and `worker.cordis.yml` inline the same literals; `tests/bundle.spec.ts` pins all three copies together so the model-visible text cannot drift across the deployment forms.

`src/pipeline-worker-tags.ts` writes the runner-injected `PIPELINE_ID` / `STATE_ID` / `JOB_ID` / `NODE_ID` onto every session the worker mints through the `@deepseek-ai/dsh-session-tags` registry, so `session.tags.list` (and the host `session-tags-changed` stream) identifies pipeline sessions without a second session authority in the Go runner.

The dsh-sdk subagent backend (`subagent-dsh-sdk` row) spawns each child with `scrubbedParentEnv()`, which drops `LMO_SERVER_*` (credential-shaped) and every `DSH_*` name. The child boots the same `worker.cordis.yml`, whose `lmo-pipeline` row requires the LMO credentials, so the config explicitly re-forwards `LMO_SERVER_HOST` / `LMO_SERVER_SECRET_ID` / `LMO_SERVER_SECRET_KEY` (plus the `DEEPSEEK_*` and `DSH_SESSION_ROOT` facts) in the row's `env`, merged after the scrub. The same three keys are forwarded in the profile-layer copy of the row.

`apps/cli/package.json`, `packages/boot/app-boot/src/profile.ts` (the `lmo-pipeline-worker` template tuple `[dsh-base, dsh-bundle-lmo-pipeline-worker]`), and `tsconfig.host.json` register the bundle so `dsh --profile lmo-pipeline-worker --dump-config` resolves without user-side profile setup.

## Alternatives considered

- **One shared cordis.yml for both the profile and the flat handshake** — rejected: the profile mechanism applies `dsh-base` as a patch base with insert semantics, while the runner handshake wants a flat leaf with no base; the two forms have different row sets and ownership.
- **Let the dsh-sdk child inherit the parent environment** — rejected: the subprocess seam's `scrubbedParentEnv()` is the single canonical scrub and deliberately drops credential-shaped and `DSH_*` names; ambient inheritance would both leak harness identity and starve the child's own `lmo-pipeline` row.
- **Load the web-app layer into the worker** — rejected: the task explicitly forbids browser UI / client rows; the worker loads only the execution spine.

## Consequences

- S3's frozen handshake (env contract, `.lmo/output.json` spec, stdio JSON-RPC) and this bundle are aligned; S7 can spawn the worker with `DSH_BIN=dsh-jsonrpc-agent` plus `DSH_CORDIS_CONFIG=<worker.cordis.yml>` and the injected `PIPELINE_ID` / `LMO_SERVER_*` / `LMO_WORKTREE_PATH` / `DSH_WORKER_PROFILE` environment.
- Subagent concurrency for a worker means independent dsh-sdk harness processes; the keyless e2e drives two parallel `subagent_dsh` delegations and asserts both child reports plus request-time overlap.
- The keyless smoke e2e (scripted local model server) exercises the real boot path without a model key, so CI can run it; real-API runs are not required to validate the composition.
- The model-visible persona has three pinned copies; any intentional text change must update `prompts.ts` plus both yml files and let `bundle.spec.ts` catch the drift.
