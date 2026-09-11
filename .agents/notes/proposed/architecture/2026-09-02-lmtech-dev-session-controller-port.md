# Agent Note: Port s-series and B13 features onto the upstream Session Controller

Status: proposed

English | [中文](2026-09-02-lmtech-dev-session-controller-port.zh.md)

## Problem

`lmtech-dev` tracks upstream `master` (zero gap) where the 8/22–27 refactor
(`d26acfa2e3`…) removed `packages/host/apiproxy` and rebuilt the API plane as
`packages/api/session-controller` — an 11-file aggregate behind
`SessionController extends TypertRemoteService`, with `SessionCommandController`
(business commands), `SessionControlController` (event-stream broadcast), and
all wire types centralized in `types.ts`. The client side was rebuilt onto a
snapshot/baseline/queue-mirror model (`client/contract/`, `client/sessions/`),
`ui-conversation` was split into `ui-chat`/`ui-session`/`ui-schedule`/
`ui-approval`, and `client/store` was carved out of runtime.

The `dev` branch carries 55 local commits building the same features on the
removed apiproxy floor. Merging `dev` into `lmtech-dev` produces 81 conflicts:
27 modify/delete (local edits to upstream-deleted paths) and 54 content
conflicts. Decision: full port (option A) — adapt every retained local feature
to the upstream structures rather than dropping or deferring.

## Proposal

### Port map

| # | Local feature (old location) | Upstream home | Action |
|---|---|---|---|
| 1 | subagents.answer/questions RPC (apiproxy) | `session-controller/src/agent.ts` + `types.ts` | two controller methods in the upstream style; reuse `SubagentAddress` (types.ts:371) |
| 2 | `subagent/decision-answer.ts`, `continuation.ts` | same path | keep; verify the upstream seam |
| 3 | `agent-lookup.ts` decision-answer routing (api/remotes) | same path (upstream evolved) | upstream base + local routing delta |
| 4 | `packages/session/session-tags` domain | same path (new package) | keep; register the tags table in session-controller |
| 5 | sessions tags RPC schema (apiproxy) | `list.ts` + `types.ts` | redeclare the three tag methods against the new types |
| 6 | pipelines service (client/runtime) | upstream runtime evolution | upstream base + `PipelineRuntime` wiring |
| 7 | `sidebar.pipelines` slot (ui-sidebar) | same path | keep local version |
| 8 | pipeline-worker bundle + preset | same paths (new) | keep; align registration with the new bundles (sdk-app et al.) |
| 9 | list-light `projection: 'none'` (apiproxy) | `session-controller/src/list.ts` | reimplement against the snapshot list model; first port item — upstream has no lightweight mode |
| 10 | goal_complete wrapup suppression (tool-goal) | same path | compare-merge |
| 11 | HoverCard pinned, hover panel, hindsight slot, inventory row slot | post-split packages (ui-chat et al.) | re-seat component by component |
| 12 | token-meter cacheHitRatio, surface current_turn | same path | compare-merge |
| 13 | speckit skills, docs cleanup | same path | keep as-is |

### Execution batches

1. Upstream-first resolution of pure upstream-evolution conflicts; remove
   apiproxy remnants.
2. Keep-direct features land (rows 2/4/7/8/13).
3. Controller port (rows 1/5/9) — read `agent.ts`/`list.ts`/`types.ts` style
   first, then implement.
4. Client side (rows 3/6/10/11/12) — upstream runtime model + post-split UI.
5. Package graph (package.json deps, tsconfig.base paths, pnpm install), then
   full-face typecheck plus affected vitest.

### B17 backlog validity

The disk-governance backlog (`T001-T020` in the outer LingMeowObservatory
specs) survives the refactor: upstream's `projection-store.ts` is a client
in-memory model (push, higher-seq-wins), not the host-side write-amplification
fix US1 needs; `history-records.ts` is client wire alignment, not US3's host
archive indexing. US2 (list-light) closes during this port (row 9). US1/US3
stay open with their host-layer homes, re-pointed at the controller projection
framework.

## Acceptance criteria

`pnpm run typecheck:contracts-ready` zero errors, `tsc -b tsconfig.host.json`
zero errors, affected vitest suites green, pre-push hooks pass.

## Risks

- B13 lands **park-only**: `SubagentDecisionAnswerTable` installs the ask shadow
  and exposes `pendingQuestions`, but the delivery half (`followup({ answers })`
  / `subagent.answer`) has no producer yet, so the `answers` field on
  `SubagentSendMessageOptions` is unconsumed. The `agent-busy` stall B13 closed
  stays closed, but the decision channel is not usable end to end.
- B17 US1/US3 stay open — the host-side write-amplification fix and the archive
  indexing are unbuilt, and their outer spec (`008-session-disk-governance`) is
  still Draft.
- Eleven features are re-seated by hand; every row of the port map is a place
  where the upstream and local shapes can silently diverge again on the next
  rebase.
- The renamed `@lingmeow.tech/dsh-session-tags` package reaches consumers
  through hand-written `tsconfig.base.json` aliases rather than the generated
  path block, so `verify-tsconfig-paths` does not cover it.

## Alternatives considered

- **Upstream-first with feature deferral (option B)** — rejected: the decision
  channel and session-tags RPC are load-bearing for the lmtech pipeline; a
  window without them re-opens the `agent-busy` stall B13 closed.
- **Batch merge with per-batch ports (option C)** — rejected for now: the
  split still forces the same controller work, and two merge states double the
  conflict-surface bookkeeping.
