# Agent Note: 将 s 系列与 B13 功能移植到上游 Session Controller

Status: proposed

[English](2026-09-02-lmtech-dev-session-controller-port.md) | 中文

## Problem

8/22–27 的上游重构（`d26acfa2e3`…）删除了 `packages/host/apiproxy`，并把 API 平面重建为 `packages/api/session-controller` —— 一个位于 `SessionController extends TypertRemoteService` 之后的聚合，含 `SessionCommandController`、`SessionControlController`，wire 类型集中在 `types.ts`。客户端被重建到 snapshot/baseline/queue-mirror 模型（`client/contract/`、`client/sessions/`），`ui-conversation` 被重建，`client/store` 从 runtime 中拆出。与此同时 `dev` 分支带着约 55 个建立于已删除 apiproxy 地基之上的本地提交，于是两条工作线用互不兼容的措辞描述同一批功能。

[上游同步](../../implemented/architecture/2026-09-12-024-upstream-sync.zh.md)此后已在本 harness 树内执行了该移植：以「上游优先」口径合并 `c291e7961a`，并把每项保留的 fork 能力重落到新 seam 上。仍然待办 —— 也就是本 note 现在提议的内容 —— 是那次合并刻意留在本仓之外的工作：plugins 侧重定位，以及外层 spec 的磁盘治理积压。

## Proposal

### 已由本次同步落地（在此记录，非提议）

| 原本地功能 | 现状落点 |
|---|---|
| `subagents.answer` / `subagents.questions` RPC 与 `decision-answer.ts` | 已退役；continuable-activation 表面（`ContinuableActivationRegistry`、`ContinuableStart`）持有暂停子代理的驻留与投递 |
| apiproxy 的 sessions-tags RPC schema | `SessionController` 的三个 `@Remote` 动词 `tagsList` / `tagsSet` / `tagsRemove`，加上 `client/sessions/manager.ts` 中的浏览器 `tagsBySession` 投影 |
| `packages/session/session-tags` 域 | 保留为 fork 包，经 web-app bundle 的 `session-tags` row 挂载 |
| list-light `projection: 'none'` | 未重新声明：上游 list 模型负责行投影，不再有轻量模式 |
| `sidebar.pipelines` 插槽与 `ui-lmo-pipeline` 注册 | 已退役；上游 root 作用域的 `sidebar.panellist` 列表加布局 `main` keyed 插槽即插入点 |
| pipeline-worker bundle 与 preset | bundle 在两棵树中都已消失；agent preset 保留在 `apps/cli/config/agent-presets/pipeline-worker` |
| goal 收尾抑制 | `packages/goal/tool-goal/src/wrapup.ts`，由 `structuredOutputPresets` 这个 `Config` 字段驱动 |
| HoverCard 固定、hindsight 座位、inventory 行插槽 | 固定行为重落到上游 `HoverCard`，新增 required props `pinLabel` / `unpinLabel`；fork 的 hindsight 座位随其区域退役；`settings.plugin.inventory.item` 仍为 fork 自有插槽 |
| token-meter `cacheHitRatio` 与 surface `current_turn` 过滤 | `packages/llm/token-meter` 的 `cacheHitRatio` view 层新增；`packages/core/session` 中 `stripReasoning` 只作用于非当前轮 `assistant/message` |
| speckit skills 与文档清理 | 不变；十个 `.agents/skills/dsh-lmtech-speckit-*` skill |

### 剩余工作

1. **plugins 侧重定位（spec 025）。** `dsh-lmtech-plugins` 把其管线 UI 注册进上游 root 作用域的 `sidebar.panellist` 列表加布局 `main` keyed 插槽，取代 fork 已被删除的 `sidebar.pipelines` 镜像，并调用 `SessionController` 上的标签动词。全程不涉及 harness 侧插槽。
2. **B17 US1 / US3 仍未关闭。** 外层 `008-session-disk-governance` 积压（Draft）仍持有它们：上游的 `projection-store.ts` 是客户端内存推送模型，不是 US1 所需的宿主侧写放大修复；`history-records.ts` 是客户端 wire 对齐，不是 US3 的宿主归档索引。
3. **别名卫生。** `@lingmeow.tech/dsh-session-tags` 经手写在 `tsconfig.base.json` 的别名（第 54–55 行）解析，位于 `pnpm run verify-tsconfig-paths` 所治理的生成块之外。要么生成器纳入该 fork 包，要么该别名作为已登记例外保留。

## Acceptance criteria

剩余工作完成的判据是：plugins 仓通过 `sidebar.panellist` 加 `main` keyed 插槽注册其管线面板、且 harness 侧不再有插槽（spec 025 自身的验收），以及外层 `008` spec 以宿主层证据关闭 US1/US3。在本仓内，`pnpm run verify-tsconfig-paths` 要么覆盖这些 fork 别名，要么该登记例外点名它们。

## Risks

- 每一项重定位的功能都是下次 rebase 时上游与 fork 形态可能再次分叉的地方；上游同步 note 的能力表就是让下次同步保持诚实的检查清单。
- B17 US1/US3 依赖一个仍为 Draft 的外层 spec，因此磁盘治理缺口会比本次移植活得更久。
- 手写别名仍在生成路径块之外，因此一旦 fork 包改名，失败的是 typecheck 而不是 paths 门禁。

## Alternatives considered

- **上游优先 + 功能延后（方案 B）** — 否决：标签数据面对 lmtech 管线是承重的，缺少它的窗口会重新打开 continuable-activation 模型所关闭的 `agent-busy` 卡滞。
- **分批合并 + 逐批移植（方案 C）** — 否决：该拆分仍会强制同样的 controller 工作，而两个合并态会让冲突面记录翻倍。
