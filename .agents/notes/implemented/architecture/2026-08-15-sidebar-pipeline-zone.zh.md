# Agent Note：侧边栏管线区、双区搜索与会话标签刷新（ui-lmo-pipeline）

Status: implemented

[English](2026-08-15-sidebar-pipeline-zone.md) | 中文

> 范围：`sidebar.pipelines` 槽及其 `ui-lmo-pipeline` 注册者、壳拥有的双区搜索框、工作区对管线会话的过滤，以及两个区域共同刷新的客户端持久标签索引。所消费的管线 wire 面见 [LMO pipeline seam note](2026-08-15-lmo-pipeline-cordis-seam.zh.md)。

## Problem

DSH 侧边栏原本只有一个浏览区域（工作区），并自带搜索框。管线区需要第二个区域、一种只在管线区显示管线会话（工作区列表永不出现）的机制、一个同时搜索两个区域且支持分区前缀的搜索框，以及 tag 编辑后两个区域都从主机刷新、不做本地回显——而 wire 面上会话标签是逐会话 RPC 加一个推送帧，没有批量标签端点。

## Decision

**一个槽、一个注册者、一个 store。** `ui-sidebar` 声明 `sidebar.pipelines`（single/root，owner 共享 `SidebarSectionOwnerProps`），渲染在 `sidebar.workspaces` 下方。`ui-lmo-pipeline` 把 `PipelineBrowser` 注册进去，带一个持久化浏览 store（导航单元 `projects` / `pipelines` / `detail` 加本区自己的折叠状态）。浏览器把 `ctx.pipelines` 投影为 inject 面里的普通回调，各视图的加载状态保持组件私有。

**壳拥有唯一搜索框。** `SidebarRoot` 持有原始 query，通过 `SidebarSectionOwnerProps` 新增的 `searchQuery` 成员下发给两个区域。每个区域解析自己的范围前缀——`workspace:` 留在 ui-workspace，`pipeline:` 在 ui-lmo-pipeline——无前缀查询同时搜索两区。query 走框架的 owner-prop 通道，不经过共享 service 或第二个 store。

**持久标签住进会话列表快照。** `SessionManager` 维护逐会话标签索引：每次列表刷新后按行调用一次 `session.tags.list` 播种，之后由 `host/session-tags-changed` 帧 last-wins 更新，并作为引用稳定的 `tagsBySession` 投影发布在 `SessionListState` 上。`ISessions` 新增 `setSessionTags` / `removeSessionTags`，经 `session.tags.set/remove` 写入，刻意不碰本地索引——主机的变更帧是唯一刷新路径，两个区域因此收敛到同一持久真源。`ui-workspace` 通过 `withoutPipelineSessions` helper 把管线会话（标签含 `pipeline_id` 的行）从树、平铺列表和搜索结果中过滤掉；`ui-lmo-pipeline` 从同一快照派生自己的会话行。

## Consequences

- 管线会话只在管线区出现一次；标签编辑由一条主机帧同时刷新两个区域；工作区原来的搜索输入机制被删除，改由壳的搜索框承担。
- 客户端从不 value-import 主机包 `@deepseek-ai/dsh-session-tags`：`pipeline_id` 在 `ui-workspace`/`tree.ts` 与 `ui-lmo-pipeline`/`PipelineBrowser.tsx` 中以字面量镜像，两处都有注释说明。
- 冷启动标签拉取是逐会话的辅助行为：单次读取失败让该行保持无标签直到下一帧或下一次刷新；已删除行的迟到响应会被丢弃。

## Alternatives considered

| Rejected | One-line reason |
|---|---|
| 独立 `ctx.sessionTags` service 供 inject hooks 舱消费 | 标签是会话行自身的属性；列表快照已经走全局 `useSessions` hook，第二个 service 重复了同一通道还多出跨插件 hook 接线 |
| 搜索框归 ui-lmo-pipeline 或 ui-workspace 所有 | 要么出现两个搜索框，要么需要跨插件 query 通道；壳本来就拥有列 chrome，owner share 是既定的父→子通道 |
| 本地乐观标签更新 + 手动刷新按钮 | 违反单一权威源规则，写入与帧到达之间两个区域的视图可能分叉 |
