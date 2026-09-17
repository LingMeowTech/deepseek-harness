# Agent Note: Sidebar pipeline zone, dual-zone search, and session-tag refresh (ui-lmo-pipeline)

Status: implemented

English | [中文](2026-08-15-sidebar-pipeline-zone.zh.md)

> Requirement moved: the pipeline browsing UI now lives in the `dsh-lmtech-plugins` repository, which registers it into `ui-sidebar`'s `sidebar.panellist` list, and this repository no longer implements it. `ui-lmo-pipeline` has no implementation on `lmtech-dev` (0 files there) and `ui-sidebar`'s source declares no `sidebar.pipelines` slot. What stays implemented here is the tag data plane both zones read — `SessionManager`'s `tagsBySession` projection, seeded by one `session.tags.list` per row on each refresh in `packages/api/session-controller` — and the shell's single search row in `SidebarRoot`.

> Scope: the sidebar pipeline browsing region, the shell-owned dual-zone search box, and the client-side durable-tag projection both zones refresh from. The pipeline wire surface this consumes is settled in the [LMO pipeline seam note](2026-08-15-lmo-pipeline-cordis-seam.md); the region's retirement is owned by the [upstream-sync Agent Note](2026-09-12-024-upstream-sync.md).

## Problem

The DSH sidebar had one browsing region (workspaces) with its own search box. The pipeline zone needed a second region below it, a way to show only pipeline sessions there (and never in the workspace lists), one search box that searches both zones with per-zone scope prefixes, and tag edits that leave both zones reading one authoritative source — all on top of a wire surface where session tags are per-session RPCs with no batch tag endpoint.

## Decision

**Upstream's panel list owns the zone; the fork's region is gone.** This note's original decision declared a fork-owned `sidebar.pipelines` region in `ui-sidebar` and registered `ui-lmo-pipeline`'s `PipelineBrowser` into it. The [upstream sync](2026-09-12-024-upstream-sync.md) supersedes that half: the fork no longer declares `sidebar.pipelines`, `ui-sidebar` renders upstream's root-scoped `sidebar.panellist` list against `ui-layout`'s root-scoped `main` keyed slot (switched with `ctx.layout.selectPanel`), and the pipeline browsing UI itself lives in the `dsh-lmtech-plugins` repository and registers into that list. No pipeline-session filtering lives in this tree: this repository keeps the tag data plane the pipeline sessions carry.

**The shell's single search row is A-class fork code.** `SidebarRoot` still owns the raw query and passes it to the browsing region through the section owner share, and the e2e lane drives that row (spec 013 US2 owns the row). After the region's removal the repository has no consumer of the `searchQuery` member it passes, and `SidebarSectionOwnerProps` itself declares only `wide` and `expandSidebar` — a recorded gap whose convergence belongs to the same owner as the row (T019/T020/T042 follow-up).

**Durable tags live in the session list snapshot.** `SessionManager` keeps a per-session tag index: seeded after every list refresh by one `session.tags.list` per row, published on `SessionListState` as a reference-stable `tagsBySession` projection, and never updated locally. `ISessions` exposes `setSessionTags` / `removeSessionTags`, which write through `session.tags.set/remove` RPCs and deliberately leave the local index alone. No host-stream frame publishes tag changes; a client converges on the next refresh pull, and a response for a session that disappeared meanwhile is dropped.

## Consequences

- The browser's tag view comes from a pull, not a push: there is no `host/session-tags-changed` frame, so a write is visible to a client on its next list refresh, and a failed tag read leaves the row untagged instead of failing the list.
- Nothing in the browser value-imports the host `@lingmeow.tech/dsh-session-tags` package; consumers read `tagsBySession` off the session list snapshot.
- The fork keeps one shell search row and no region: the sidebar's browsing surface is upstream's panel list, and a second region would have to be re-justified against it.

## Alternatives considered

| Rejected | One-line reason |
|---|---|
| A dedicated `ctx.sessionTags` service feeding inject hooks compartments | Tags are session rows' own attribute; the list snapshot already rides the global `useSessions` hook, so a second service duplicates one channel and adds cross-plugin hook wiring |
| Search box owned by the pipeline browser or ui-workspace | Two search boxes or a cross-plugin query channel; the shell already owns the column chrome and the owner share is the sanctioned parent→child route |
| Local optimistic tag updates plus a manual refresh affordance | Violates the one-authoritative-source rule and can fork two views between write and refresh |
| Keep the fork's own sidebar region beside upstream's panel list | Two live mechanisms for one job; upstream's list plus the `main` keyed slot already is the insertion point, so the region had no remaining reason to exist |
