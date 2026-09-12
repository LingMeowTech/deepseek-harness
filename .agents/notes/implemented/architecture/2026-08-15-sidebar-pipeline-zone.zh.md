# Agent Note: 侧边栏管线区、双区搜索与会话标签刷新（ui-lmo-pipeline）

Status: implemented

[English](2026-08-15-sidebar-pipeline-zone.md) | 中文

> 范围：侧边栏的管线浏览区、壳拥有的双区搜索框，以及两个区域共同刷新的客户端持久标签投影。所消费的管线 wire 面见 [LMO pipeline seam note](2026-08-15-lmo-pipeline-cordis-seam.zh.md)；该区域的退役由[上游同步 Agent Note](2026-09-12-024-upstream-sync.zh.md)持有。

## Problem

DSH 侧边栏原本只有一个浏览区域（工作区），并自带搜索框。管线区需要第二个区域、一种只在管线区显示管线会话（工作区列表永不出现）的机制、一个同时搜索两个区域且支持分区前缀的搜索框，以及 tag 编辑后让两个区域读同一权威源——而 wire 面上会话标签是逐会话 RPC，没有批量标签端点。

## Decision

**区域归上游面板列表所有；fork 自有的区已消失。** 本 note 最初的决策声明了一个 fork 自有的 `sidebar.pipelines` 区域（位于 `ui-sidebar`）并把 `ui-lmo-pipeline` 的 `PipelineBrowser` 注册进去。[上游同步](2026-09-12-024-upstream-sync.zh.md)取代了这一半：fork 不再声明 `sidebar.pipelines`，`ui-sidebar` 渲染上游 root 作用域的 `sidebar.panellist` 列表，对应 `ui-layout` 的 root 作用域 `main` keyed 插槽（经 `ctx.layout.selectPanel` 切换），而管线浏览 UI 本体位于 `dsh-lmtech-plugins` 仓并注册进该列表。本树不承载任何管线会话过滤：本仓只保留管线会话所携带的标签数据面。

**壳的唯一搜索行属 A 类 fork 代码。** `SidebarRoot` 仍持有原始 query，并经 section owner share 下发给浏览区域，e2e 车道也驱动该行（该行归 spec 013 US2 所有）。区域移除后，本仓已没有消费方读取它下发的 `searchQuery` 成员，且 `SidebarSectionOwnerProps` 本身只声明 `wide` 与 `expandSidebar` —— 这是一个已登记的缺口，其收敛归属与搜索行相同的 owner（T019/T020/T042 后续）。

**持久标签住进会话列表快照。** `SessionManager` 维护逐会话标签索引：每次列表刷新后按行调用一次 `session.tags.list` 播种，作为引用稳定的 `tagsBySession` 投影发布在 `SessionListState` 上，且从不在本地更新。`ISessions` 暴露 `setSessionTags` / `removeSessionTags`，经 `session.tags.set/remove` RPC 写入，刻意不碰本地索引。没有任何 host 流帧发布标签变更；客户端在下一次刷新拉取时收敛，期间已消失会话的响应会被丢弃。

## Consequences

- 浏览器的标签视图来自拉取而非推送：不存在 `host/session-tags-changed` 帧，因此写入在客户端下一次列表刷新时才可见，而一次失败的标签读取会让该行保持无标签，而不是让列表失败。
- 浏览器中没有任何代码 value-import 主机包 `@lingmeow.tech/dsh-session-tags`；消费方从会话列表快照读取 `tagsBySession`。
- fork 保留一条壳搜索行、不保留区域：侧栏的浏览表面是上游的面板列表，若要再加第二个区域，必须相对它重新论证。

## Alternatives considered

| Rejected | One-line reason |
|---|---|
| 独立 `ctx.sessionTags` service 供 inject hooks 舱消费 | 标签是会话行自身的属性；列表快照已经走全局 `useSessions` hook，第二个 service 重复了同一通道还多出跨插件 hook 接线 |
| 搜索框归管线浏览器或 ui-workspace 所有 | 要么出现两个搜索框，要么需要跨插件 query 通道；壳本来就拥有列 chrome，owner share 是既定的父→子通道 |
| 本地乐观标签更新 + 手动刷新按钮 | 违反单一权威源规则，写入与刷新之间两个视图可能分叉 |
| 在上游面板列表旁保留 fork 自有的侧栏区域 | 同一件事存在两套活机制；上游列表加 `main` keyed 插槽本就是该插入点，区域再无存在理由 |
