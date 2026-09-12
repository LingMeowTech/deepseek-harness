# Agent Note: s 系列在 dev 上的合并范围

Status: implemented

[English](2026-09-02-s-series-merge-scope.md) | 中文

## 问题

8/15 的 lmtech relay 工作（分支 `dev-20260815-s1/s2/s4/s9`）建在重构前的地基上：lmtech UI 插件（`ui-lmtech-dsh-chat-width`、`ui-lmtech-client-backend-state`、`ui-lmo-pipeline`）放在 harness 树内，其 apiproxy 接线（`WEB_SETTINGS_NAMESPACES`、web-app bundle 注册）伸进宿主代码。18 天后官方 `dsh-lmtech-plugins` 仓库已携带三个 UI 插件更晚的发布版本（v0.1.0-rc.5），且上游重构删除了接线所指向的 apiproxy。整支合并 s 分支会复活被取代的插件副本并破坏宿主 typecheck。

## 决策

s 系列合并（提交 `354e18dcc6`）按提交逐个 cherry-pick，并按归属拆分：

- **保留（harness 所有）**：`session/session-tags` 持久标签域、session-tag RPC 契约、pipeline-worker agent preset（`apps/cli/config/agent-presets/pipeline-worker`），以及 SDK exit-drain 修复。
- **剔除（plugins 所有）**：三份树内 UI 插件副本及其全部宿主侧注册（`WEB_SETTINGS_NAMESPACES`、web-app bundle 依赖、slot-catalog occupant 行）。`dsh-lmtech-plugins` 版本是交付载体；harness 只保留这些插件注入所需的插槽缝。
- b13 合并（`c3373896ce`）做了同样的拆分：代码与 Agent Note 进入，spec/relay/autoPlan 过程文档按 one-home-per-fact 规则移至外层 LingMeowObservatory docs。

**后续更正 —— 以上清单不再权威，以本树为准。** spec 015/020 已把 `packages/pipeline/` seam 三包迁至 `dsh-lmtech-plugins` 仓，而[上游同步](2026-09-12-024-upstream-sync.zh.md)退役了 fork 自有的那些缝：`sidebar.pipelines` 渲染插槽与客户端 pipelines service 已消失，改由上游的 `sidebar.panellist` 面板列表承担；`lmo-pipeline-worker` bundle 与 profile 模板在两棵树中都已不存在。s 系列保留下来的 session-tag RPC 契约，今天以 `SessionController` 上的三个 `@Remote` 动词 `tagsList` / `tagsSet` / `tagsRemove` 声明。

## 后果

harness 树内不再有 lmtech UI 插件源码；插件交付经 `dsh-lmtech-plugins` 与插件清单机制进行。s 系列的 seam 面中，本树仍拥有的是 session-tag 数据面与 pipeline-worker agent preset；pipeline UI、pipeline seam 三包与面板本身归属 plugins 仓与上游面板列表，因此后续移植重定位的是标签数据面，而非插件本身。三个 s 分支的 worktree 与分支在合并后已删除；Windows 拒绝删除 `node_modules` 的目录可能需要手动 `rm`。

## 备选方案

- **整支合并 s 分支** — 否决：会重新引入三份被取代的插件副本，并对上游重构的宿主 typecheck 失败。
- **完全放弃 s 系列** — 否决：session-tags 域、pipeline-worker agent preset 与 session-tag RPC 契约是插件所依赖的 harness 所有能力。
