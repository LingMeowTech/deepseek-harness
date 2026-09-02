# @deepseek-ai/dsh-session-tags

The **`SessionTagRegistry`** (`ctx.sessionTags`) stores durable string tags per session in a storage-domain table. The pipeline session contract names four tags: `pipeline_id`, `state_id`, `job_id`, and `node_id`.

## Service API (`ctx.sessionTags`)

| Member | Semantics |
|---|---|
| `list(sessionId)` | Read the stored tags in insertion order |
| `set(sessionId, tags)` | Replace the complete tag list; empty input deletes the row |
| `remove(sessionId, tags)` | Remove named tags; deleting the last one deletes the row |

Every write lands through the storage domain first, then the domain's authoritative `domain/changed` feed publishes the change. The host API proxy projects that feed into `host/session-tags-changed` frames.

## Config

| Key | Default | Meaning |
|---|---|---|
| `maxTagsPerSession` | `64` | Maximum tags one session can hold |
| `maxTagChars` | `128` | Maximum characters in one tag |

Tags are trimmed, deduplicated, and fail loud when empty, over-long, or beyond the count cap.

## Model Experience

Indirectly, through host and client consumers that render pipeline sessions; this registry registers no prompt or tool schema.

#### KV Cache effect

No direct invalidation; model-facing consumers own any request-prefix changes.

## Known Limitations and Deferred Work

- **No tag-value validation beyond bounds** — any non-empty string is storable; pipeline id formats remain the writer's contract.
- **No session-existence check** — orphan tags are allowed and consumers filter them against their session listing.
