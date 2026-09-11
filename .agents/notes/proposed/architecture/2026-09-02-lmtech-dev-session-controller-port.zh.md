# Agent Note: Port s-series and B13 features onto the upstream Session Controller

状态：提案

[English](2026-09-02-lmtech-dev-session-controller-port.md) | 中文

## 问题

`lmtech-dev` 跟踪上游 `master`（零差距）。上游 8/22–27 的重构（`d26acfa2e3`…）
移除了 `packages/host/apiproxy`，把 API 面重建为 `packages/api/session-controller`
——11 个聚合文件，`SessionController extends TypertRemoteService` 之下有
`SessionCommandController`（业务命令）、`SessionControlController`（事件流广播），
线上类型全部集中在 `types.ts`。client 侧重建为快照/基线/队列镜像模型
（`client/contract/`、`client/sessions/`），`ui-conversation` 拆分为
`ui-chat`/`ui-session`/`ui-schedule`/`ui-approval`，`client/store` 从 runtime 拆出。

`dev` 分支携带 55 个本地提交，同样的功能建在被移除的 apiproxy 地基上。
`dev` 合入 `lmtech-dev` 产生 81 个冲突：27 个 modify/delete（本地改了上游已删的
路径）、54 个内容冲突。决策：完整移植（方案 A）——所有保留的本地功能适配上游结构，
不放弃、不暂缓。

## 提案

### 移植映射

| # | 本地功能（旧位置） | 上游新家 | 动作 |
|---|---|---|---|
| 1 | subagents.answer/questions RPC（apiproxy） | `session-controller/src/agent.ts` + `types.ts` | 按上游风格新增 2 个控制器方法；复用 `SubagentAddress`（types.ts:371） |
| 2 | `subagent/decision-answer.ts`、`continuation.ts` | 同路径 | 保留；核对上游衔接点 |
| 3 | `agent-lookup.ts` 决策路由（api/remotes） | 同路径（上游有演进） | 以上游为底并入本地路由增量 |
| 4 | `packages/session/session-tags` 域 | 同路径（新包） | 保留；在 session-controller 注册 tags 表 |
| 5 | sessions tags RPC schema（apiproxy） | `list.ts` + `types.ts` | 按新 types 重声明三个 tags 方法 |
| 6 | pipelines service（client/runtime） | 上游 runtime 演进版 | 上游为底 + `PipelineRuntime` 接线 |
| 7 | `sidebar.pipelines` 插槽（ui-sidebar） | 同路径 | 保留本地版 |
| 8 | pipeline-worker bundle + preset | 同路径（新增） | 保留；注册方式对齐新 bundle（sdk-app 等） |
| 9 | list-light `projection: 'none'`（apiproxy） | `session-controller/src/list.ts` | 按快照 list 模型重实现；首个移植项——上游无轻量模式 |
| 10 | goal_complete 收尾抑制（tool-goal） | 同路径 | 对比合并 |
| 11 | HoverCard pinned、悬停面板、hindsight 插槽、inventory 行槽 | 拆包后（ui-chat 等） | 逐组件放回新包结构 |
| 12 | token-meter cacheHitRatio、surface current_turn | 同路径 | 对比合并 |
| 13 | speckit skills、docs 清理 | 同路径 | 原样保留 |

### 执行批次

1. 纯上游演进冲突按上游优先解决；移除 apiproxy 残留。
2. 直接保留类落位（第 2/4/7/8/13 行）。
3. controller 移植（第 1/5/9 行）——先读 `agent.ts`/`list.ts`/`types.ts` 风格再实现。
4. client 侧（第 3/6/10/11/12 行）——上游 runtime 模型 + 拆包后 UI。
5. 包图（package.json 依赖、tsconfig.base paths、pnpm install），随后全 face
   typecheck + 受影响 vitest。

### B17 待办有效性

磁盘治理待办（外层 LingMeowObservatory specs 的 `T001-T020`）在重构后依然有效：
上游 `projection-store.ts` 是 client 内存模型（push、higher-seq-wins），不是 US1
需要的 host 侧写放大修复；`history-records.ts` 是 client 线上传输对齐，不是 US3
的 host 归档索引。US2（list-light）随本次移植闭环（第 9 行）。US1/US3 保持待办，
host 层落点不变，对接面重指 controller projection 框架。

## 验收标准

`pnpm run typecheck:contracts-ready` 零错误、`tsc -b tsconfig.host.json` 零错误、
受影响 vitest 套件全绿、pre-push hooks 通过。

## 风险

- B13 本次**只落 park 侧**：`SubagentDecisionAnswerTable` 装好了提问影子并暴露
  `pendingQuestions`，但投递半边（`followup({ answers })` / `subagent.answer`）
  尚无生产者，`SubagentSendMessageOptions` 上的 `answers` 字段暂无人消费。
  B13 关掉的 `agent-busy` 空转仍处于关闭态，但决策通道尚未端到端可用。
- B17 的 US1/US3 仍待办 —— host 侧写放大修复与归档索引都未实现，其外层 spec
  （`008-session-disk-governance`）也还是 Draft。
- 本次由手工放回 11 项功能；移植映射的每一行都是下次 rebase 时上游与本地形态
  再次静默分叉的候选点。
- 改名后的 `@lingmeow.tech/dsh-session-tags` 包经由 `tsconfig.base.json` 的
  **手写别名**到达消费方，而不在生成区里，故 `verify-tsconfig-paths` 覆盖不到它。

## 备选方案

- **上游优先 + 功能暂缓（方案 B）** — 否决：决策通道与 session-tags RPC 是 lmtech
  管线的承重能力；缺口会重新打开 B13 已消除的 `agent-busy` 空转。
- **分批合并、每批各自移植（方案 C）** — 现阶段否决：拆批仍要做同样的 controller
  工作，两个合并态让冲突面簿记翻倍。
