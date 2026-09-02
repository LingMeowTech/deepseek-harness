# Agent Note: Sidebar pipeline zone, dual-zone search, and session-tag refresh (ui-lmo-pipeline)

Status: implemented

English | [中文](2026-08-15-sidebar-pipeline-zone.zh.md)

> Scope: the `sidebar.pipelines` slot and its `ui-lmo-pipeline` registrant, the shell-owned dual-zone search box, pipeline-session filtering in the workspace region, and the client-side durable-tag index that both zones refresh from. The pipeline wire surface this consumes is settled in the [LMO pipeline seam note](2026-08-15-lmo-pipeline-cordis-seam.md).

## Problem

The DSH sidebar had one browsing region (workspaces) with its own search box. The pipeline zone needed a second region below it, a way to show only pipeline sessions there (and never in the workspace lists), one search box that searches both zones with per-zone scope prefixes, and tag edits that refresh both zones from the Host without local echoes — all on top of a wire surface where session tags are per-session RPCs plus one push frame, with no batch tag endpoint.

## Decision

**One slot, one registrant, one store.** `ui-sidebar` declares `sidebar.pipelines` (single/root, the `SidebarSectionOwnerProps` owner share) and renders it below `sidebar.workspaces`. `ui-lmo-pipeline` registers `PipelineBrowser` into it with a persisted viewing store (navigation cell `projects` / `pipelines` / `detail` plus the zone's own fold). The browser projects `ctx.pipelines` into plain callbacks in the inject face and keeps the per-view load state component-local.

**The shell owns the one search box.** `SidebarRoot` holds the raw query and hands it to both regions through the new `searchQuery` member of `SidebarSectionOwnerProps`. Each region parses its own scope prefix — `workspace:` stays in ui-workspace, `pipeline:` in ui-lmo-pipeline — and a prefix-less query searches both. The query moves through the framework's owner-prop channel, never through a shared service or a second store.

**Durable tags live in the session list snapshot.** `SessionManager` keeps a per-session tag index: seeded after every list refresh by one `session.tags.list` per row, updated last-wins from `host/session-tags-changed`, and published on the `SessionListState` as a reference-stable `tagsBySession` projection. `ISessions` gains `setSessionTags` / `removeSessionTags` that write through `session.tags.set/remove` and deliberately never touch the local index — the Host's changed frame is the only refresh path, so both zones converge on the same durable source. `ui-workspace` filters pipeline sessions (rows whose tags include `pipeline_id`) out of the tree, the flat list, and search results through a `withoutPipelineSessions` helper; `ui-lmo-pipeline` derives its session rows from the same snapshot.

## Consequences

- Pipeline sessions appear exactly once, in the pipeline zone; tag edits refresh both zones from one Host frame; the workspace region's search input machinery is deleted in favor of the shell box.
- The client never value-imports the host `@deepseek-ai/dsh-session-tags` package: `pipeline_id` is mirrored as a literal in `ui-workspace`/`tree.ts` and `ui-lmo-pipeline`/`PipelineBrowser.tsx`, and the mirror is documented at both sites.
- Cold-start tag pulls are per-session and auxiliary: a failed read leaves the row untagged until the next frame or refresh, and a response for a removed row is dropped.

## Alternatives considered

| Rejected | One-line reason |
|---|---|
| A dedicated `ctx.sessionTags` service feeding inject hooks compartments | Tags are session rows' own attribute; the list snapshot already rides the global `useSessions` hook, so a second service duplicates one channel and adds cross-plugin hook wiring |
| Search box owned by ui-lmo-pipeline or ui-workspace | Two search boxes or a cross-plugin query channel; the shell already owns the column chrome and the owner share is the sanctioned parent→child route |
| Local optimistic tag updates plus a manual refresh affordance | Violates the one-authoritative-source rule and can fork the two zones' views between write and frame |
