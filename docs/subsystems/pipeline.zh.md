# LMO 管线

[English](pipeline.md) | 中文

LMO 管线能力——service seam、HTTP Provider、面向模型的 `pipeline_*` 工具与 `Lmo*` 记录/状态线类型——位于 `dsh-lmtech-plugins` 仓（015 落点：`@lingmeow.tech/dsh-lmtech-pipeline`、`@lingmeow.tech/dsh-lmtech-pipeline-http`、`@lingmeow.tech/dsh-lmtech-tool-pipeline`）。本仓不再保留其中任何一项：020 已把 fork 副本迁出，官方 bundle 也不再挂载 `dsh-lmo-pipeline-http` / `dsh-tool-lmo-pipeline` row。harness 侧仅保留这些会话所携带的会话标签数据面。

## 会话标签

pipeline 会话是普通 DSH 会话加上来自 [`dsh-session-tags`](../../packages/session/session-tags) 的持久标签：`pipeline_id`、`state_id`、`job_id` 与 `node_id`。标签写入直接落到 `session_tags` 存储域，并在 RPC 结果里回传存储后的列表；host 流上没有任何帧承载标签变更，因此读取方要在下一次 `session.tags.list` 才能看到别的客户端写入。

<!-- BEGIN GENERATED cordis-surface (gen-cordis-catalog.ts) — do not edit between markers -->

<a id="cordis-surface"></a>

## Cordis API

Generated from source by `scripts/gen-cordis-catalog.ts` (verified fresh by `pnpm run verify-cordis-catalog` in doc-sync; regenerate with `pnpm run gen-cordis-catalog`) — the language sides differ only in locale-specific paired document paths. Signature blocks use a `ts cordis-catalog` fence and keep the original source JSDoc; dispatch modes are defined in the [primer](../cordis-primer.zh.md#dispatch-modes), and the framework-inherited `ctx` API lives in [cordis-api/inherited.md](../cordis-api/inherited.md).

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

Types: [SessionId](core.zh.md)

Source: [`packages/session/session-tags/src/index.ts`](../../packages/session/session-tags/src/index.ts)
<!-- END GENERATED cordis-surface -->
