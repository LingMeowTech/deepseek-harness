# 子代理决策答复通道

**状态**: 已实现（B13，分支 `dev-20260831-b13-subagent-decision-answer`）

[English](subagent-decision-answer.md) | 中文

决策答复通道让父代理或外部 API 客户端对子代理会话发出的
`ask_user_question` 作答，使子会话按所选选项续跑而非悬挂。它复用宿主
questions 域契约（`AskUserQuestionAnswer` zod schema、rpcId 回显、pending
table 语义），并且只在决策答复路径上绕过 `hasApiRemoteSubagentOwner`
agent-busy 栅栏——普通 `session.prompt` 行为不变。

## 通道端点 / RPC 形状

通道经子代理投递 API（host apiproxy 的 `subagent` 命名空间）暴露，实现两种
方案：

- **方案 a（首选）**: `subagents.prompt` 接受可选 `answers` 批量并转发进投递
  通道。答案使子代理挂起的 ask 定案，而非入队内容。
- **方案 b（备选契约）**: `subagents.answer` 与 `subagents.questions` RPC 承载
  相同形状。

### `subagent.prompt` 请求负载（含 `answers`）

```jsonc
{
  "parentSessionId": "parent-session",
  "childSessionId": "child-session",
  "mode": "continuable",
  "content": [{ "type": "text", "text": "continue" }],
  "answers": [
    { "id": "ask-rpc-id", "selected": ["Code"], "custom": "optional" }
  ]
}
```

### `subagent.answer` 请求负载

```jsonc
{
  "parentSessionId": "parent-session",
  "childSessionId": "child-session",
  "mode": "continuable",
  "answers": [
    { "id": "ask-rpc-id", "selected": ["Code"] }
  ]
}
```

响应：`{ "accepted": true }`。

### `subagent.questions` 请求负载

```jsonc
{
  "parentSessionId": "parent-session",
  "childSessionId": "child-session",
  "mode": "continuable"
}
```

响应：

```jsonc
{
  "questions": [
    {
      "id": "ask-rpc-id",
      "question": "Which option?",
      "options": [{ "label": "Code", "description": "optional" }],
      "multiSelect": false
    }
  ]
}
```

## `AskUserQuestionAnswer` 参数形状

每个答案项携带 `id` + `selected`（`custom` 可选），与
`packages/host/apiproxy/src/api/questions.schema.ts`
（`askUserQuestionAnswerItemSchema`，zod 严格校验）对齐：

```ts
type AskUserQuestionAnswerItem = {
  id: string          // the ask rpcId, echoed verbatim
  selected: number[] | string[] // chosen option label(s), or indices
  custom?: string
}
```

投递层（`SubagentDecisionAnswerTable`）把子代理的 ask 作为 shadow
`userQuestions` 服务挂起，使 ask 的 promise 以提交的批量解析；rpcId 必须
匹配一个挂起的 ask，否则通道返回 `NOT_PENDING`。

## 错误形状

| 条件 | 错误 |
| --- | --- |
| rpcId 无挂起 ask / 已过期 | `NOT_PENDING`（投递层）→ `not-found`（RPC） |
| 非法批量（缺 `id`、`selected` 错误） | zod `bad-request`（结构化，绝不静默接受） |
| 父会话不在线 | `subagent-parent-unavailable` |
| 子会话不是父会话的 continuable 子会话 | catalog 校验错误 |

rpcId 无挂起 ask 绝不会静默成功——调用方总是收到结构化错误，从而能区分
「已作答」与「已过期」。

## 与宿主 questions 域对齐

- 与 `/api/respond`（`questions.schema.ts`）同一 zod schema——错误消息与校验
  语义一致。
- ask 转发给宿主 questions 域时不带 owned-agent 字段，从而不触发
  `DELEGATED_CALLER` 栅栏渲染；由挂起的 promise 单独驱动子会话。
- 回归参考：`packages/host/apiproxy/tests/api-proxy-question.spec.ts`、
  `packages/host/apiproxy/tests/decision-answer-contract.spec.ts`。

## agent-busy 栅栏

`packages/api/remotes/src/agent-lookup.ts`（`hasApiRemoteSubagentOwner`）继续
拒绝 subagent-owned 会话的普通 `session.prompt`。决策答复路径经
`resolveDecisionAnswerAgent` 解析并放行。`packages/api/remotes/tests/agent-lookup-decision-answer.spec.ts`
中的回归红线同时钉住两种行为。

## 示例

**父代理**（进程内）：经 followup 通道提交答案：

```ts
await ctx.subagents.followup(parent, childId, [], {
  source: { kind: 'user', rpcId },
  signal,
  answers: [{ id: 'ask-rpc-id', selected: ['Code'] }],
})
```

**外部客户端**：`subagent.answer` RPC（负载见上）；作答前可先
`subagent.questions` 列出挂起的 ask。
