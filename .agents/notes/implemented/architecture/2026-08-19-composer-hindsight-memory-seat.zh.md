# Agent Note：Composer Hindsight 记忆槽 —— 访问模式控件旁的插件槽

状态：已实现

[English](2026-08-19-composer-hindsight-memory-seat.md) | 中文

## 问题

LMTech 的 `@lingmeow.tech/dsh-hindsight-memory` 插件需要一个按会话的开关，位于
composer 的访问模式控件旁，用于启用长期记忆并选择要使用的记忆库。composer 工具行
暴露了两个具名单例控制槽（`conversation.input.plan`、`conversation.input.model`），
二者都由 `ui-conversation` 声明并由各自插件填充。访问模式控件旁没有可供插件挂载
记忆功能的槽，因此插件没有受支持的方式在输入栏放置开关与记忆库多选。

## 决策

新增第三个具名单例槽 `conversation.input.hindsight`，渲染在 composer 工具行中 plan
槽右侧、访问模式控件旁。它遵循与 plan/model 槽相同的契约：

- 在 `ui-conversation` 的 `SlotMap` 中声明，owner 为 `InputControlOwnerProps`
  （仅 `locked`）；
- 在 `conversation.composer.bar` 条目的 `children` 表中声明；
- 在 `InputBar` 的 `.modes` 行中通过 `renderSlot('conversation.input.hindsight', { locked })`
  渲染；
- 空槽渲染为空，无注册者时不产生布局成本。

该槽按会话作用域，匹配插件按会话的启用与记忆库选择状态。`ui-conversation` 只拥有扩展点；
Hindsight 记忆开关与记忆库多选由消费方插件提供。

## 影响

- composer bar 新增公共槽 `conversation.input.hindsight`。
- `ComposerBarProps.renderSlot` 分派第三个槽；owner 分享为 bar 的 `locked` 禁用态，
  填充条目据此处理。
- 更新 `ui-conversation` 组件测试，覆盖该槽的分派，以及注册条目能填充它并收到
  `locked` owner 属性。

## 备选方案

- **复用 `conversation.input.left`** —— 该槽是工具行内的 `list`，但其条目不保证紧邻
  访问模式控件（plan 槽已占据该相邻位置），且插件需要带稳定 `locked` owner 属性的
  具名单例槽。具名单例槽与 plan/model 先例一致，并为消费方提供精确的挂载点。
- **不做改动，把开关留在输入栏外** —— 用户明确要求记忆开关位于 Full access 旁；
  没有该槽，插件将不得不触及核心 composer 内部，这正是槽系统所禁止的。
