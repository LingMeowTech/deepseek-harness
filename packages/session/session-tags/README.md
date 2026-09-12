---
description: "Durable per-session string tags for pipeline sessions: store a tag list once, read it back from the Host RPC or the client session list, and filter pipeline work out of ordinary session browsing."
kind: "package-reference"
---

# @lingmeow.tech/dsh-session-tags

English | [中文](README.zh.md)

## Summary

Store a durable list of string tags on any session and read it back after a restart. Pipeline sessions carry the four frozen names `pipeline_id`, `state_id`, `job_id`, and `node_id`, so a browser can separate pipeline work from ordinary sessions. Callers reach one `session_tags` storage-domain row through `ctx.sessionTags` on the Host or the `session.tags.*` RPCs on a client. A write replaces the whole list and fails loud on empty, over-long, or over-cap input. Tags never reach a model, and clients pull changes instead of receiving a frame.

## Table of Contents

- [Use this package](#use-this-package)
- [Understand the implementation](#understand-the-implementation)
- [Further Exploration](#further-exploration)
- [Model Experience](#model-experience)
- [Known Limitations and Deferred Work](#known-limitations-and-deferred-work)
- [Dev Note](#dev-note)

-----

<a id="use-this-package"></a>
## Use this package

Mount this plugin beside a storage-domain service. It opens the `session_tags` domain, keeps one `tags` table keyed by session id, and publishes the `sessionTags` service that this repository's Host RPC and browser session list read.

### When to choose it

Choose it for labels a session must keep across restarts while staying out of the session log: durable correlation tags, ownership marks, and the pipeline zone's own four names. Reach for session events instead when the model must see the value in its context, and for workspace settings when the value belongs to the deployment rather than to one session. Tags are auxiliary data-plane state, so a failed or slow tag read never blocks the session list.

### Minimal configuration

```yaml
- id: session-tags
  name: '@lingmeow.tech/dsh-session-tags'
  config:
    maxTagsPerSession: 64
    maxTagChars: 128
```

| Field | Default | Meaning |
|---|---|---|
| `maxTagsPerSession` | `64` | Maximum tags one session can hold |
| `maxTagChars` | `128` | Maximum characters in one tag |

Both bounds accept any positive safe integer, and the constructor rejects any other value. The plugin needs no other configuration.

### Reading and writing tags

`ctx.sessionTags` exposes three operations, and the Host RPCs and browser list consume the same ones.

| Member | Semantics |
|---|---|
| `list(sessionId)` | Read the stored tags in insertion order |
| `set(sessionId, tags)` | Replace the complete tag list; empty input deletes the row |
| `remove(sessionId, tags)` | Remove named tags; deleting the last one deletes the row |

Tags are trimmed and deduplicated in input order, and a write fails loud when a tag is empty after trimming, longer than `maxTagChars`, or pushes the list past `maxTagsPerSession`. Removing tags from a session with no row is an idempotent no-op.

Every write lands in the storage domain first and then emits the domain's in-process `domain/changed` notification for the `session_tags` domain. No host-stream frame carries tag changes, and no reader watches such a frame: a client reads the authoritative list back with `session.tags.list`, the browser session list seeds its `tagsBySession` projection with one `session.tags.list` per row after each list refresh, and a write is never echoed locally. A read that fails leaves the row untagged until the next refresh, and a response for a session that disappeared meanwhile is dropped.

The Host side is three `@Remote` verbs on `SessionController` — `tagsList`, `tagsSet`, and `tagsRemove` — declared in [`dsh-api-session-controller`](../../api/session-controller/README.md). Pipeline consumers key off `PIPELINE_SESSION_TAGS`, the frozen `pipeline_id` / `state_id` / `job_id` / `node_id` names this package exports.

-----

<a id="understand-the-implementation"></a>
## Understand the implementation

<details>
<summary>Implementation internals — click to expand</summary>

This section explains the design behind the registry; the observable behavior is fully covered in [Use this package](#use-this-package).

### Design philosophy

One durable row per session, reached through the storage domain rather than the session log. The log is append-only and a cold session cannot be mutated without preparing a live owner, while a domain table accepts a write for any session id — which is what lets a runner tag a session it does not own. The registry holds no cache of its own: `list` reads the domain table, `set` and `remove` write it, and the domain's write chain makes durability precede the `domain/changed` notification. Normalization runs before any write, so an invalid input leaves the previous row untouched.

### Source map

| File | Role |
|---|---|
| [`src/index.ts`](src/index.ts) | The `SessionTagRegistry` service: bounds, normalization, `list` / `set` / `remove`, and `PIPELINE_SESSION_TAGS` |
| [`src/spec.ts`](src/spec.ts) | The `session_tags` domain declaration and its `tags` table record |
| — | No runtime invariant companion is published; the registry keeps no separately derived observation, because `list` reads the same `session_tags` domain row that `set` and `remove` write and the domain's `domain/changed` feed is the notification contract. |
| [`tests/session-tags.spec.ts`](tests/session-tags.spec.ts) | Persistence across registry reopen, and one `domain/changed` per write |

### Storage domain usage

The domain is declared as `session_tags` version 1 with one `tags` table keyed by `SessionId` and a record of `{ tags, updatedAt }`. `Service.init` opens the domain through `ctx.storageDomain` and closes it through `ctx.effect`, so unmounting the plugin releases the handle; the table handle stays private, and every read returns a copy of the stored array.

</details>

-----

<a id="further-exploration"></a>
## Further Exploration

Read these pages when the package-level contract is not enough.

- [LMO pipeline subsystem](../../../docs/subsystems/pipeline.md) — the pipeline sessions and tag names this data plane serves.
- [LMO pipeline seam Agent Note](../../../.agents/notes/implemented/architecture/2026-08-15-lmo-pipeline-cordis-seam.md) — why durable tags are a domain table instead of session events.
- [`dsh-storage-domain`](../../storage/storage-domain/README.md) — the domain table, write chain, and `domain/changed` contract the registry builds on.
- [`dsh-api-session-controller`](../../api/session-controller/README.md) — the Host RPC verbs and the browser `tagsBySession` projection.
- [Web app bundle](../../bundle/web-app/README.md) — the composition that mounts this plugin's row.

-----

<a id="model-experience"></a>
## Model Experience

Indirectly, through host and client consumers that render pipeline sessions; this registry registers no prompt or tool schema.

#### KV Cache effect

No direct invalidation; model-facing consumers own any request-prefix changes.

## Known Limitations and Deferred Work

<a id="known-limitations-and-deferred-work"></a>

These limits define where the tag store stops and future work begins.

- **No tag-value validation beyond bounds** — any non-empty string within `maxTagChars` is storable; pipeline id formats remain the writer's contract.
- **No session-existence check** — orphan tags are allowed and consumers filter them against their session listing.
- **No change notification on the host stream** — a reader outside the browser session list must re-read with `session.tags.list`; the domain's `domain/changed` event is in-process only.

<a id="dev-note"></a>
### Dev Note

<details>
<summary>Working context for maintainers — click to expand</summary>

This Dev Note is non-authoritative working context: notes for maintainers and open questions.

- Tag reads are fail-open by design; a transient read failure shows a row as untagged rather than failing the session list, and the next refresh converges it.
- `pipeline_id` is mirrored as a literal in the browser consumers, which never value-import this host package; keep the four frozen names aligned with `PIPELINE_SESSION_TAGS` when the pipeline contract grows.

</details>
