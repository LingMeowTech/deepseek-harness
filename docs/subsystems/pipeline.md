# LMO Pipeline

English | [中文](pipeline.zh.md)

The LMO pipeline capability — its service seam, HTTP provider, model-facing `pipeline_*` tools, and the `Lmo*` record/status wire types — lives in the `dsh-lmtech-plugins` repository as the three packages the spec 015 requirement moved there: `@lingmeow.tech/dsh-lmtech-pipeline`, `@lingmeow.tech/dsh-lmtech-pipeline-http`, and `@lingmeow.tech/dsh-lmtech-tool-pipeline`. The `lmtech-dev` branch carries none of it: running `git ls-files` on `packages/pipeline/lmo-pipeline`, `packages/pipeline/lmo-pipeline-http`, and `packages/pipeline/tool-lmo-pipeline` in that worktree returns 0 files, while the harness `dev` line still tracks 19 files under `packages/pipeline/`, and no ref points at a deletion commit for those paths — the fork copies never came onto `lmtech-dev` and were never deleted from the other line. This branch's official bundles mount no `dsh-lmo-pipeline-http` / `dsh-tool-lmo-pipeline` rows. What stays harness-side is the session-tag data plane those sessions carry.

## Session tags

Pipeline sessions are ordinary DSH sessions plus durable tags from [`dsh-session-tags`](../../packages/session/session-tags): `pipeline_id`, `state_id`, `job_id`, and `node_id`. Tag writes go straight to the `session_tags` storage domain and echo the stored list back in the RPC result; no host stream frame carries them, so a reader picks up another client's write on its next `session.tags.list`.

<!-- BEGIN GENERATED cordis-surface (gen-cordis-catalog.ts) — do not edit between markers -->

<a id="cordis-surface"></a>

## Cordis API

Generated from source by `scripts/gen-cordis-catalog.ts` (verified fresh by `pnpm run verify-cordis-catalog` in doc-sync; regenerate with `pnpm run gen-cordis-catalog`) — the language sides differ only in locale-specific paired document paths. Signature blocks use a `ts cordis-catalog` fence and keep the original source JSDoc; dispatch modes are defined in the [primer](../cordis-primer.md#dispatch-modes), and the framework-inherited `ctx` API lives in [cordis-api/inherited.md](../cordis-api/inherited.md).

<a id="ctxsessiontags--sessiontagregistry"></a>

### `ctx.sessionTags` — `SessionTagRegistry`

Durable session tag registry. Set writes the complete tag list for a session; remove deletes the named tags and drops the row when none remain.

```ts cordis-catalog
/**
 * Read one session's durable tag list.
 * @param sessionId - the tagged session.
 * @returns the tags in stored order; empty for an untagged session.
 */
list(sessionId: SessionId): Promise<readonly string[]>

/**
 * Replace one session's complete tag list. The normalized list is written
 * durably before the `domain/changed` notification publishes.
 * @param sessionId - the tagged session.
 * @param tags - new complete tag list; empty deletes the tag row.
 * @returns the stored normalized tags.
 */
async set(sessionId: SessionId, tags: readonly string[]): Promise<readonly string[]>

/**
 * Remove named tags from one session, keeping the remaining order. Removing
 * the last tag deletes the row; absent sessions are idempotent no-ops.
 * @param sessionId - the tagged session.
 * @param tags - tags to remove.
 * @returns the remaining stored tags.
 */
async remove(sessionId: SessionId, tags: readonly string[]): Promise<readonly string[]>
```

Types: [SessionId](core.md)

Source: [`packages/session/session-tags/src/index.ts`](../../packages/session/session-tags/src/index.ts)
<!-- END GENERATED cordis-surface -->
