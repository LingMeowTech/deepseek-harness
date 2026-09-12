# Agent Note: s-series merge scope on dev

Status: implemented

English | [中文](2026-09-02-s-series-merge-scope.zh.md)

## Problem

The 8/15 lmtech relay work (branches `dev-20260815-s1/s2/s4/s9`) built on the pre-refactor floor: lmtech UI plugins (`ui-lmtech-dsh-chat-width`, `ui-lmtech-client-backend-state`, `ui-lmo-pipeline`) lived inside the harness tree, and their apiproxy wiring (`WEB_SETTINGS_NAMESPACES`, web-app bundle registration) reached into host code. Eighteen days later the official `dsh-lmtech-plugins` repo carries later, released versions of all three UI plugins (v0.1.0-rc.5), and the upstream refactor removed the apiproxy the wiring targeted. Merging the s-branches wholesale would have resurrected superseded plugin copies and broken the host typecheck.

## Decision

The s-series merge (commit `354e18dcc6`) cherry-picked per commit and split each one by ownership:

- **Kept (harness-owned)**: the `session/session-tags` durable-tags domain, the session-tag RPC contracts, the pipeline-worker agent preset (`apps/cli/config/agent-presets/pipeline-worker`), and the SDK exit-drain fix.
- **Dropped (plugins-owned)**: the three in-tree UI plugin copies and every host-side registration written for them (`WEB_SETTINGS_NAMESPACES`, web-app bundle dependencies, slot-catalog occupant rows). The `dsh-lmtech-plugins` versions are the delivery vehicles; the harness keeps only the seams those plugins inject into.
- The b13 merge (`c3373896ce`) made the same split: code and Agent Note in, spec/relay/autoPlan process docs moved to the outer LingMeowObservatory docs per the one-home-per-fact rule.

**Later corrections — this tree, not the list above, is the authority.** Spec 015/020 re-homed the `packages/pipeline/` seam packages into the `dsh-lmtech-plugins` repository, and the [upstream sync](2026-09-12-024-upstream-sync.md) retired the fork's own seams: the `sidebar.pipelines` render slot and the client pipelines service are gone in favour of upstream's `sidebar.panellist` panel list, and the `lmo-pipeline-worker` bundle and profile template no longer exist in either tree. The session-tag RPC contracts the s-series kept are declared today as the three `@Remote` verbs `tagsList` / `tagsSet` / `tagsRemove` on `SessionController`.

## Consequences

The harness tree carries no lmtech UI plugin sources; plugin delivery runs through `dsh-lmtech-plugins` and the plugin inventory mechanism. Of the s-series seam surface, what this tree still owns is the session-tag data plane and the pipeline-worker agent preset; the pipeline UI, the pipeline seam packages, and the panel itself belong to the plugins repository and upstream's panel list, so a later port re-seats the tag data plane rather than the plugins. The three s-branch worktrees and their branches were deleted after the merge; the physical directories may need a manual `rm` where Windows denies `node_modules` removal.

## Alternatives considered

- **Merge the s-branches whole** — rejected: it would re-introduce three superseded plugin copies and fail the host typecheck against the upstream refactor.
- **Drop the s-series entirely** — rejected: the session-tags domain, the pipeline-worker agent preset, and the session-tag RPC contracts are harness-owned capability the plugins depend on.
