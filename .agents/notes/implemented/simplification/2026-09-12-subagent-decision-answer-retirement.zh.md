# Agent Note: 子代理 decision-answer 通道退役

Status: implemented

[English](2026-09-12-subagent-decision-answer-retirement.md) | 中文

## 问题

本 fork 曾构建一条 decision-answer 通道，让子代理在真正的抉择点（两条实现路线、缺少某项输入）暂停，提出带类型的问题，并携带父侧答复作为上下文续跑。此前操作者只能把临时文本插入子代理转录，既不产生类型，也无法确定性地回灌。该通道实现在宿主 apiproxy 平面上：`packages/subagent/subagent/src/decision-answer.ts` 持有 `DecisionAnswer` 能力，`continuation.ts` 把答复回灌转录，`packages/host/apiproxy` 经 RPC 暴露 `subagents.questions` / `subagents.answer`，并由 `packages/api/remotes/src/agent-lookup.ts` 把答复路由到正确的子代理。

此后上游把 apiproxy 平面拆解为 `packages/api/session-controller`，并以 `ContinuableActivationRegistry` 加 `ContinuableStart` 重建子代理续跑。若保留该通道，就意味着恢复一个上游已删除的传输层，并在新的 controller 内维护第二条并行答复路径。

## 决策

该通道被移除，其决策收编于本 note。

- `packages/subagent/subagent/src/decision-answer.ts` 已删除；`SubagentRuntime` 不再携带 `pendingQuestions`，`SubagentSendMessageOptions` 不再携带 `answers`。
- `subagents.questions` / `subagents.answer` 两个 RPC 与 `DecisionAnswer*` / `DecisionAskQuestion` wire 类型已无处安放：它们原本住在被删除的 apiproxy 包里，而 session controller 不声明其中任何一个。
- `packages/api/remotes/src/agent-lookup.ts` 只保留其余调用方仍在用的子代理查找；答复路由职责已消失。
- 锁定线上结构的契约测试随传输层一并消失。如今告诉操作者子代理正在等待的，是上游的 continuable-activation 表面，其驻留与投递由 `ContinuableActivationRegistry` 持有。

### 为什么这项能力没有缺位

该通道最初的动机是 `agent-busy` 卡滞：暂停在问题上的子代理必须与单纯忙碌的子代理区分开，而文本回复无法确定性地让它续跑。上游的 continuable-activation 模型同时回答了这两半 —— Activation 的驻留是带 owner 的显式进程内状态，`ContinuableStart` / `sendMessage` 是带类型的入口 —— 因此不再需要第二条通道来唤醒暂停的子代理。

### 保留的理由与再引入

- **fork 放弃了什么：** 一个由父侧轮询的提问队列（`subagents.questions`），以及一份 UI 可渲染、取代自由文本的带类型答复载荷（`options`、`context`、`custom`）。
- **被否决的替代处置：** 把文件与类型留在兼容 shim 之后（harness 禁止 shim），或在 `SessionController` 上重新声明这两个 RPC（那是新功能而非同步，且会与 activation 表面重复）。
- **再引入条件：** 未来若某个 spec 需要子代理向人类提出模型可见的结构化问题，应从 continuable-activation 表面与 session controller 自身的 Remote 声明出发，绝不可复活 apiproxy 形态的那一对。
- **完全缺席的验证：** 对 `DecisionAnswer`、`SubagentDecisionAnswerTable`、`DecisionAskQuestion`、`pendingQuestions`、`decision-answer` 执行 `git grep`，在生产源码、配置、schema 与测试文件中均无命中；唯一残留的文本痕迹是生成的 Cordis 目录，它会在同一 spec 内重跑目录时丢掉这些条目，子代理子系统页中的 decision-answer 页面也随之退役。

## 备选方案

- **保留文件、只删 RPC** —— 否决：`decision-answer.ts` 的存在只为服务那条通道，保留它只会变成 typecheck 与目录仍在携带的死代码。
- **在 `SessionController` 上重新声明两个 RPC** —— 否决：那是需要新评审的新能力，不属于上游同步，且会与 continuable-activation 的投递路径重复。
- **整体否决移植并静默丢弃该能力** —— 否决：一项操作者可见的能力值得留下成文理由与再引入条件，本 note 即是。

## 后果

- 子代理包只交付一套续跑模型而非两套，fork 在其上剩余的差异只有 `list-children` 排序行为一项。
- 生成的 Cordis 目录与子代理子系统页失去其 decision-answer 条目；重跑目录正是抹去最后文本痕迹的动作。
- 已记录的代价：在某个 spec 于 activation 表面上重新引入之前，操作者可渲染的结构化提问面不复存在。
