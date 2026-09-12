# Agent Note: Port s-series and B13 features onto the upstream Session Controller

Status: proposed

English | [中文](2026-09-02-lmtech-dev-session-controller-port.zh.md)

## Problem

The 8/22–27 upstream refactor (`d26acfa2e3`…) removed `packages/host/apiproxy` and rebuilt the API plane as `packages/api/session-controller` — an aggregate behind `SessionController extends TypertRemoteService`, with `SessionCommandController`, `SessionControlController`, and all wire types in `types.ts`. The client side was rebuilt onto a snapshot/baseline/queue-mirror model (`client/contract/`, `client/sessions/`), `ui-conversation` was rebuilt, and `client/store` was carved out of runtime. The `dev` branch meanwhile carried ~55 local commits built on the removed apiproxy floor, so the two lines of work described the same features in incompatible terms.

The [upstream sync](../../implemented/architecture/2026-09-12-024-upstream-sync.md) has since executed the port for this harness tree: it merged `c291e7961a` with upstream-first resolution and re-landed each retained fork capability on the new seam. What remains — and what this note now proposes — is the work that merge deliberately left outside this repository: the plugins-side re-seat and the outer-spec disk-governance backlog.

## Proposal

### Landed by the sync (recorded here, not proposed)

| Former local feature | Where it lives now |
|---|---|
| `subagents.answer` / `subagents.questions` RPC and `decision-answer.ts` | retired; the continuable-activation surface (`ContinuableActivationRegistry`, `ContinuableStart`) owns paused-child residency and delivery |
| apiproxy sessions-tags RPC schema | `SessionController`'s three `@Remote` verbs `tagsList` / `tagsSet` / `tagsRemove` plus the browser `tagsBySession` projection in `client/sessions/manager.ts` |
| `packages/session/session-tags` domain | kept as the fork package, mounted by the web-app bundle as the `session-tags` row |
| list-light `projection: 'none'` | not re-declared: the upstream list model serves the row projections, and no lightweight mode remains |
| `sidebar.pipelines` slot and the `ui-lmo-pipeline` registration | retired; upstream's root-scoped `sidebar.panellist` list plus the layout `main` keyed slot is the insertion point |
| pipeline-worker bundle and preset | the bundle is gone from both trees; the agent preset stays at `apps/cli/config/agent-presets/pipeline-worker` |
| goal wrap-up suppression | `packages/goal/tool-goal/src/wrapup.ts`, driven by the `structuredOutputPresets` `Config` field |
| HoverCard pinned, hindsight seat, inventory row slot | the pin is re-landed on the upstream `HoverCard` with required `pinLabel` / `unpinLabel` props; the fork's hindsight seat is retired with its region; `settings.plugin.inventory.item` stays a fork-owned slot |
| token-meter `cacheHitRatio` and surface `current_turn` filtering | the `cacheHitRatio` view-layer additions in `packages/llm/token-meter`; `stripReasoning` applied to non-current-turn assistant messages in `packages/core/session` |
| speckit skills and docs cleanup | unchanged; ten `.agents/skills/dsh-lmtech-speckit-*` skills |

### Remaining work

1. **Plugins-side re-seat (spec 025).** `dsh-lmtech-plugins` registers its pipeline UI into upstream's root-scoped `sidebar.panellist` list plus the layout's `main` keyed slot, replacing the fork's deleted `sidebar.pipelines` mirror, and calls the tag verbs on `SessionController`. No harness-side slot is involved.
2. **B17 US1 / US3 stay open.** The outer `008-session-disk-governance` backlog (Draft) still owns them: upstream's `projection-store.ts` is a client in-memory push model, not the host-side write-amplification fix US1 needs, and `history-records.ts` is client wire alignment, not US3's host archive indexing.
3. **Alias hygiene.** `@lingmeow.tech/dsh-session-tags` resolves through hand-written `tsconfig.base.json` aliases (lines 54–55) that sit outside the generated block `pnpm run verify-tsconfig-paths` governs. Either the generator learns the fork package or the alias stays a recorded exception.

## Acceptance criteria

The remaining work is done when the plugins repository registers its pipeline panel through `sidebar.panellist` plus the `main` keyed slot with no harness-side slot (spec 025's own acceptance), and when the outer `008` spec closes US1/US3 with host-layer evidence. In this repository, `pnpm run verify-tsconfig-paths` either covers the fork aliases or the recorded exception names them.

## Risks

- Every re-seated feature is a place where the upstream and fork shapes can diverge again on the next rebase; the upstream-sync note's capability table is the checklist that keeps the next sync honest.
- B17 US1/US3 depend on an outer spec that is still Draft, so the disk-governance gap outlives this port.
- The hand-written aliases remain outside the generated path block, so a renamed fork package would fail the typecheck rather than the paths gate.

## Alternatives considered

- **Upstream-first with feature deferral (option B)** — rejected: the tag data plane is load-bearing for the lmtech pipeline, and a window without it re-opens the `agent-busy` stall the continuable-activation model closes.
- **Batch merge with per-batch ports (option C)** — rejected: the split still forces the same controller work, and two merge states double the conflict-surface bookkeeping.
