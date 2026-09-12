# Agent Note: Upstream sync 024 — adopting c291e7961a onto lmtech-dev

Status: implemented

English | [中文](2026-09-12-024-upstream-sync.zh.md)

## Problem

The fork's own 13 commits — the 015/018/020 landing plus the capability work of 013/016/007 — are already contained in the fork point `4712eeff98`, while upstream advanced 1090 commits to `c291e7961a`. Upstream's work replaced several structures the fork had built against: the host apiproxy plane was dissolved into `packages/api/session-controller` (an aggregate behind generated Remote declarations), `ui-conversation` was rebuilt and the client packages split further, the sidebar gained `sidebar.panellist` plus a root-scoped `main` keyed slot, the Session format writer moved to version 3, and the subagent loop gained `ContinuableActivationRegistry`. Merging without a resolution rule would have resurrected deleted apiproxy paths and left the host typecheck broken.

## Decision

`git merge c291e7961a` onto the fork branch, every conflict resolved by one rule — **upstream first** — and landed as the merge commit `af2a1e07ca` (19 conflicted files, 32 conflict blocks; upstream's 1090 commits keep their hashes and messages, so no squash, rebase, or cherry-pick). The rule has three consequences:

- **Upstream structure wins wherever it replaces a fork mechanism.** `SessionController` and the generated Remote declarations replace every apiproxy path; the subagent loop's `ContinuableActivationRegistry` owns continuable child activation lifetime in place of the fork's ask/deliver carrier; `sidebar.panellist` plus `ui-layout`'s root-scoped `main` keyed slot replace the fork's own sidebar region.
- **Content the fork keeps is re-landed on the new seam, never restored beside it.** Each of the eight fork capabilities below was first verified against the merged tree (does the merge already keep it, or does it need re-landing?) and then landed once.
- **Derived artifacts are regenerated, not hand-merged.** The client slot catalog, the Cordis catalog, and `pnpm-lock.yaml` came from upstream as placeholders or stale copies; the generators are the single writer for them.

Session format 3 is adopted as it arrives: `SESSION_FORMAT_VERSION = 3` in `packages/core/session/src/types.ts` is upstream's value, the fork neither bumps nor lowers it, and [`docs/session-format-status.md`](../../../../docs/session-format-status.md) stays the authority for what the released generation means. Released Session data stays frozen, measured on both sides of the merge. The target side is untouched: `git diff --name-only c291e7961a HEAD -- '*.jsonl*' 'snapshots/**'` is empty, so the merged tree carries exactly upstream's bytes for those paths and the sync introduces nothing there. The base side is not untouched: across the whole merge face (`git diff --name-status 4712eeff98 HEAD -- '*.jsonl*' 'snapshots/**'`, the equivalent superset range) 371 entries are modified, renamed, or deleted — the corpus delta between the fork point and the target, none of it introduced by a fork commit (the target-side check above is empty). This is therefore a superset measurement over the merge face, not a claim that those paths were never touched. The application entry point stays single — the sync adds no package `bin`, no executable source, and no root demo.

### Capability re-landing

| # | Capability | Landing after the merge |
|---|---|---|
| ① | Session tags | `packages/session/session-tags` (the fork package, kept whole) plus the three `@Remote` verbs `tagsList` / `tagsSet` / `tagsRemove` on `SessionController`; the browser reads the durable list back through `session.tags.list` pulls into `SessionManager.tagsBySession`, and no host-stream frame carries tag changes |
| ② | Structured-output wrap-up suppression | `packages/goal/tool-goal/src/wrapup.ts`, driven by the `structuredOutputPresets` **`Config` field** so deployments name their own presets; no package constant lists lmtech preset names |
| ③ | `reasoningTokens` | the generic wire mapping in `packages/llm/llm-pi-ai/src/stream.ts` and its reasoning-usage tests, unchanged |
| ④ | `cacheHitRatio` | three view-layer additions in `packages/llm/token-meter` (an optional projection field, the `tokenUsageViewSchema` entry, `withCacheHitRatio`); compaction semantics are upstream's |
| ⑤ | Non-current-turn reasoning stripping | the pure `stripReasoning` in `packages/core/session/src/surface.ts`, applied by `deriveMessages` to non-current-turn assistant messages only, with the incremental per-node cache intact and no event or format change |
| ⑥ | Sidebar pipeline panel | upstream's `sidebar.panellist` list plus the root-scoped `main` keyed slot and `ctx.layout.selectPanel`; the fork's own sidebar region is gone and the pipeline UI itself lives in the plugins repository (spec 025) |
| ⑦ | HoverCard pin | the pin behaviour re-landed on the upstream component, with required `pinLabel` / `unpinLabel` props supplied through `t(...)` at every mount point instead of a hard-coded Chinese label |
| ⑧ | speckit skills | the ten `.agents/skills/dsh-lmtech-speckit-*` skills kept unchanged; upstream has none |

The fork's composer Hindsight seat and its sidebar region both lose their reason to exist under this rule: the merge keeps upstream's composer seats and upstream's panel list instead, and the fork stops declaring its own.

### Retirement of the decision-answer channel

The subagent decision-answer channel was built against the apiproxy plane, which upstream deleted. Its carrier, its RPCs, and its wire types are gone from this tree; the removal and the rationale it preserved are recorded in [the decision-answer retirement note](../simplification/2026-09-12-subagent-decision-answer-retirement.md).

## Verification

- `pnpm run verify-application-entrypoints` (no new entry point), `pnpm run verify-client-packages` (client contract face), and `pnpm run verify-session-format-catalog` (writer version record) pin the three structural claims above.
- `pnpm run verify-translation-pairing` and `pnpm run verify-agent-note-classification` / `verify-agent-note-format` pin the documentation side of the sync.
- The capability rows are pinned by their focused suites: `packages/session/session-tags`, `packages/goal/tool-goal`, `packages/llm/llm-pi-ai`, `packages/llm/token-meter`, `packages/core/session/tests`, `packages/client/ui-primitives`, `packages/client/ui-sidebar`.

## Alternatives considered

- **Rebase the fork commits onto `c291e7961a`** — rejected: the fork commits touch paths upstream deleted (apiproxy, the fork's sidebar region), so a rebase would have to re-resolve the same conflicts per commit and would rewrite the fork's own published history.
- **Merge with fork-first resolution** — rejected: it would restore the apiproxy-shaped carrier and the fork's sidebar region next to upstream's replacements, leaving two live mechanisms for one job and a host typecheck that cannot pass.
- **Defer the sync and port capability by capability later** — rejected: the gap grows with every upstream release, and the fork's own packages (`session-tags`, the pipeline seam consumers) are the ones that must land on the new seam regardless of when the sync happens.
- **Squash the merge into one fork commit** — rejected: upstream's 1090 commits must keep their hashes and messages so the fork's history stays comparable with upstream and the divergence stays auditable.

## Consequences

- A future upstream sync starts from a tree that already speaks upstream's vocabulary: one controller, one panel list, one activation registry, and no apiproxy remnants to re-resolve.
- The fork's deliberate divergences are now a small measured set (ledger: [`docs/lmtech-fork-decisions.md`](../../../../docs/lmtech-fork-decisions.md)), and the two slots the fork no longer needs are recorded as superseded there rather than silently dropped.
- The cost is one large merge commit and a manual re-landing pass over eight capabilities; a capability whose upstream seam later changes must be re-checked against that seam instead of assuming the merge kept it.
- `pnpm-lock.yaml` is the one file the sync leaves for a fresh `pnpm install` to rewrite, so the merge commit and the lockfile truth are deliberately separate commits.
