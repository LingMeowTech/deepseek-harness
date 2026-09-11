# Subagent Decision-Answer Channel

**Status**: Implemented (B13, branch `dev-20260831-b13-subagent-decision-answer`)

English | [中文](subagent-decision-answer.zh.md)

The decision-answer channel lets a parent agent or an external API client answer
an `ask_user_question` issued by a subagent session, so the child resumes with
the chosen option instead of hanging. It reuses the host questions domain
contract (`AskUserQuestionAnswer` zod schema, rpcId echo, pending-table
semantics) and bypasses the `hasApiRemoteSubagentOwner` agent-busy fence only on
the decision-answer path — ordinary `session.prompt` behavior is unchanged.

## Channel Endpoints / RPC Shapes

The channel is exposed through the subagent delivery API (`subagent` namespace of
the host apiproxy). Two schemes are implemented:

- **Scheme a (preferred)**: `subagents.prompt` accepts an optional `answers`
  batch and forwards it into the delivery channel. Answers settle the child's
  parked ask instead of enqueuing content.
- **Scheme b (fallback contract)**: `subagents.answer` and `subagents.questions`
  RPCs carry the same shape.

### `subagent.prompt` request payload (with `answers`)

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

### `subagent.answer` request payload

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

Response: `{ "accepted": true }`.

### `subagent.questions` request payload

```jsonc
{
  "parentSessionId": "parent-session",
  "childSessionId": "child-session",
  "mode": "continuable"
}
```

Response:

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

## `AskUserQuestionAnswer` Parameter Shape

Every answer item carries `id` + `selected` (`custom` optional), aligned with
`packages/host/apiproxy/src/api/questions.schema.ts` (`askUserQuestionAnswerItemSchema`,
zod-strict):

```ts
type AskUserQuestionAnswerItem = {
  id: string          // the ask rpcId, echoed verbatim
  selected: number[] | string[] // chosen option label(s), or indices
  custom?: string
}
```

The delivery layer (`SubagentDecisionAnswerTable`) parks the child's ask as a
shadow `userQuestions` service so the ask promise resolves with the submitted
batch; the rpcId must match a pending ask or the channel surfaces `NOT_PENDING`.

## Error Shapes

| Condition | Error |
| --- | --- |
| rpcId with no pending ask / expired | `NOT_PENDING` (delivery) → `not-found` (RPC) |
| invalid batch (missing `id`, bad `selected`) | zod `bad-request` (structured, never silently accepted) |
| parent session not live | `subagent-parent-unavailable` |
| child not a continuable child of the parent | catalog verification error |

A rpcId with no pending ask is never a silent success — the caller always
receives a structured error so it can distinguish "answered" from "expired".

## Alignment with the Host Questions Domain

- Same zod schema as `/api/respond` (`questions.schema.ts`) — error messages and
  validation semantics match.
- The ask is forwarded to the host questions domain without the owned-agent
  field so it renders without the `DELEGATED_CALLER` fence; the parked promise
  alone drives the child.
- Regression reference: `packages/host/apiproxy/tests/api-proxy-question.spec.ts`,
  `packages/host/apiproxy/tests/decision-answer-contract.spec.ts`.

## agent-busy Fence

`packages/api/remotes/src/agent-lookup.ts` (`hasApiRemoteSubagentOwner`) keeps
rejecting ordinary `session.prompt` for subagent-owned sessions. The
decision-answer path resolves through `resolveDecisionAnswerAgent` and is
allowed through. Regression red lines in
`packages/api/remotes/tests/agent-lookup-decision-answer.spec.ts` pin both
behaviors.

## Examples

**Parent agent** (in-process): deliver answers through the followup channel:

```ts
await ctx.subagents.followup(parent, childId, [], {
  source: { kind: 'user', rpcId },
  signal,
  answers: [{ id: 'ask-rpc-id', selected: ['Code'] }],
})
```

**External client**: `subagent.answer` RPC (see payload above); `subagent.questions`
lists the pending asks before answering.
