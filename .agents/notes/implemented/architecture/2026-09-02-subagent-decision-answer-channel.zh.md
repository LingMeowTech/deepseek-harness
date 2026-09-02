# Agent Note：子代理决策答复通道

状态：已实现

[English](2026-09-02-subagent-decision-answer-channel.md) | 中文

## 问题

子代理到达决策点（例如在两条实现路线间选择）时需要向人类操作者提问。agent loop 没有结构化途径让子代理发问、拿到父侧答复并以该答复为上下文续跑。操作者只能把临时文本回复塞进子代理转录，问题既无类型，答复也无法确定性地回灌到子代理的续跑流程。

## 决策

决策答复通道横跨子代理与宿主 API 两层：

- `packages/subagent/subagent/src/decision-answer.ts` 定义 `DecisionAnswer` 能力：子代理提出带类型的 `DecisionQuestion`（id、question、options、context），loop 将其呈现为待决项。父侧答复后，`continuation.ts` 将答复回灌子代理转录，子代理续跑。
- `packages/host/apiproxy` 通过 RPC 暴露 `subagents.questions`（轮询待决问题）与 `subagents.answer`（提交所选答复）；`rpc-map.ts` 注册两者，`questions.schema.ts` / `subagents.schema.ts` 定义线上载荷类型。
- `packages/api/remotes/src/agent-lookup.ts` 解析答复路由至哪个子代理。
- 契约测试锁定线上结构：`decision-answer-contract.spec.ts`（apiproxy）、`decision-answer.spec.ts`（subagent）及路由测试 `agent-lookup-decision-answer.spec.ts`。

通道采用拉取模式：父侧轮询 `subagents.questions`，不推事件，与既有 apiproxy 轮询面一致。

## 后果

子代理现在可以在真正的决策点暂停、给出带类型选项，并携带父侧答复续跑，操作者无需手工改转录。带类型的提问载荷含选项与上下文，UI 可以渲染决策而非自由文本。结构化输出会话（纯 JSON 交付、懒分解 job）中抑制 `goal_complete` 收尾消息，收尾子代理不再输出破坏下游 JSON 解析的散文。

## 备选方案

- **问题推送事件** — 否决：apiproxy 层基于轮询；为此能力增加推送路径会为单一能力重复铺会话事件管道。
- **复用 goal 服务承载决策** — 否决：goal 建模任务状态，不是交互式双向问答；过载会模糊 goals 契约。
