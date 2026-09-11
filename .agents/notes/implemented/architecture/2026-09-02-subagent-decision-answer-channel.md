# Agent Note: Subagent decision-answer channel

Status: implemented

English | [中文](2026-09-02-subagent-decision-answer-channel.zh.md)

## Problem

A subagent reached a decision point (for example, choosing between two implementation arms) and had to surface the question to the human operator. The agent loop offered no structured way for a subagent to ask a question, receive the parent's answer, and resume execution with that answer as context. Operators had to interleave ad-hoc text replies into subagent transcripts, which neither typed the question nor fed the answer back into the subagent's continuation deterministically.

## Decision

A decision-answer channel spans the subagent and the host API plane:

- `packages/subagent/subagent/src/decision-answer.ts` defines the `DecisionAnswer` capability: a subagent raises a typed `DecisionQuestion` (id, question, options, context) and the loop surfaces it as a pending decision. When the parent answers, `continuation.ts` feeds the answer back into the subagent's transcript and the subagent resumes.
- `packages/host/apiproxy` exposes `subagents.questions` (poll pending questions) and `subagents.answer` (submit the chosen answer) over RPC; `rpc-map.ts` registers both, and `questions.schema.ts` / `subagents.schema.ts` type the wire payloads.
- `packages/api/remotes/src/agent-lookup.ts` resolves the subagent to which an answer is routed.
- Contract tests lock the wire shape: `decision-answer-contract.spec.ts` (apiproxy) and `decision-answer.spec.ts` (subagent), plus `agent-lookup-decision-answer.spec.ts` for routing.

The channel is pull-based: the parent polls `subagents.questions` rather than receiving push events, matching the existing apiproxy polling surface.

## Consequences

A subagent can now pause on a genuine decision, present typed options, and continue with the parent's answer without the operator hand-editing transcripts. The typed question payload carries options and context, so UI surfaces can render the decision instead of free text. The `goal_complete` wrap-up message is suppressed in structured-output sessions (pure JSON delivery, lazy-decomposition jobs), so a finishing subagent no longer emits prose that breaks downstream JSON parsing.

## Alternatives considered

- **Push events for questions** — rejected: the apiproxy plane is polling-based; adding a push path would duplicate session event plumbing for one capability.
- **Reuse the goal service for decisions** — rejected: goals model task state, not interactive two-way questions; overloading it would blur the goals contract.
