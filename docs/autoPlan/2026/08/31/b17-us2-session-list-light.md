# AutoPlan 执行记录：[实现2][TDD] session.list 轻量模式（B17 US2, T007-T012）

- 日期：2026-08-31 ｜ 分支：`dev-20260831-list-light` ｜ 仓库：deepseek-harness
- 任务：session.list 新增 `projection: 'none'` 轻量模式，1100+ 会话 <200ms，不触达投影反序列化；v1 缺省语义不变

## 执行（TDD）

- RED：`packages/host/apiproxy/tests/api-proxy-list-light.spec.ts`（先于实现存在）——1100 attached 会话
  轻量列表断言：rows 无 `projections` 字段、`ctx.sessionProjections.snapshot` spy 零调用、耗时 <200ms；
  第二用例锁默认 `{}` 仍触发 snapshot（v1 不变）。
- GREEN：
  - `src/api/sessions.ts`：`list` payload 类型加 `projection?: 'none'`
  - `src/api/sessions.schema.ts`：`sessionListRequestSchema` 加 `projection: z.literal('none').optional()`
  - `src/api-proxy.ts`：`listVisibleSessionSummaries(signal?, includeProjections = true)`——attached 臂跳过
    `listProjectionsFor` fold、cold 臂跳过持久化投影缓存读；`session.list` 按 payload 传参，
    `session.search` 保持完整投影
  - `packages/client/runtime/src/client/sessions/manager.ts`：轮询改 `{ projection: 'none' }`，
    种子循环对无投影块行跳过
  - `packages/host/apiproxy/README.md` / `README.zh.md`：投影契约段补充轻量模式
- REFACTOR：种子循环注释改为描述轻量模式下的行为契约（无重播种、推送帧/tail 继续喂给）

## 验证结论（全绿）

- 目标测试 2/2；apiproxy 全量 21 文件 / 380 测试通过；`tsc -b packages/host/apiproxy` exit 0
- client `sessions-service.client.spec.ts` 43/43；oxlint 改动文件 0 错误
- client runtime tsc 报错经 stash 基线对比为存量问题（依赖 lib 未构建），与本次无关
- 性能：1100 会话两用例合计 239ms（<200ms 断言通过）

## 产物

- relay：`docs/relay-b17-list-light.md`
