# Relay: [实现2][TDD] session.list 轻量模式（B17 US2, T007-T012）

日期：2026-08-31 ｜ 分支：`dev-20260831-list-light` ｜ 任务：session.list 1100+ 会话 <200ms

## 交付内容

- `session.list` 请求新增 `projection: 'none'`（`z.literal('none').optional()`），缺省语义与 v1 完全一致。
- `listVisibleSessionSummaries(signal?, includeProjections = true)`：轻量模式下 attached 臂跳过
  `listProjectionsFor` fold、cold 臂跳过持久化投影缓存读取，仅省略 `projections` 列（updatedAt/blank 等
  元数据提示保留）。`session.search` 保持完整投影（传 true）。
- schema 信封（`sessionListRequestSchema`）同步加字段——zod 会剥离未声明字段，不加则 payload 到不了 handler。
- client `sessions/manager.ts` 轮询改用 `{ projection: 'none' }`（UI 高频轮询点）；无投影块时种子循环跳过，
  per-session 投影 store 仍由 history tail 与 `session/projection` 推送帧喂给。
- 文档：`packages/host/apiproxy/README.md` / `README.zh.md` 投影契约段补充轻量模式说明。

## 验证（全绿）

- 目标测试 `packages/host/apiproxy/tests/api-proxy-list-light.spec.ts`：2/2 通过
  （1100 attached 会话 rows 无 `projections` 字段、snapshot spy 零调用、耗时 <200ms；默认 `{}` 仍触发 snapshot）
- apiproxy 全量：21 文件 / 380 测试通过；`tsc -b packages/host/apiproxy` exit 0
- client `sessions-service.client.spec.ts`：43/43；oxlint（本次改动文件）0 错误
- client runtime `tsc -b` 报错经 stash 基线对比确认为存量问题（缺 `dsh-message-feedback/remote`、
  `dsh-session-reference/remote` lib 构建），与本次改动无关
- 性能：1100 会话轻量列表两用例合计 239ms（单用例 <200ms 断言通过）

## 模式契约

- `projection: 'none'`：响应 rows 无 `projections` 字段；host 不读投影 fold/缓存；其余元数据（id/title 状态、
  updatedAt、agent 状态、cold 提示）不变。
- 缺省 `{}`：完整 v1 行为（attached fold + cold 缓存读取 + `projections` 块）。
- title 种子：`session.list` 从不携带 title（标题走通用投影对：history tail + `session/projection` 帧）；
  轻量模式下客户端 per-session store 依赖既有推送帧/tail 基线，不做列表侧重播种。

## 下一步

- T013+：按 `specs/20260831-074042-session-disk-governance/tasks.md` 继续后续任务。
- client runtime tsc 存量错误可由依赖包 lib 构建修复（与本任务无关）。
