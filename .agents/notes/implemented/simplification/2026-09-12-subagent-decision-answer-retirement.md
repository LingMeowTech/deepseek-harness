# Agent Note: Subagent decision-answer channel retirement

Status: implemented

English | [中文](2026-09-12-subagent-decision-answer-retirement.zh.md)

## Problem

The fork built a decision-answer channel so a subagent could pause on a genuine choice — two implementation arms, a missing input — raise a typed question, and resume with the parent's answer as context. Operators previously had to interleave ad-hoc text into a subagent transcript, which typed nothing and fed nothing back deterministically. The channel was implemented on the host apiproxy plane: `packages/subagent/subagent/src/decision-answer.ts` held the `DecisionAnswer` capability, `continuation.ts` fed the answer back into the transcript, and `packages/host/apiproxy` exposed `subagents.questions` / `subagents.answer` over RPC with `packages/api/remotes/src/agent-lookup.ts` routing an answer to the right subagent.

Upstream then dissolved the apiproxy plane into `packages/api/session-controller` and rebuilt subagent continuation around `ContinuableActivationRegistry` plus `ContinuableStart`. Keeping the channel would have meant restoring a transport upstream deleted and maintaining a second, parallel answer path inside the new controller.

## Decision

The channel is removed and its decision is consolidated here.

- `packages/subagent/subagent/src/decision-answer.ts` is deleted; `SubagentRuntime` no longer carries `pendingQuestions`, and `SubagentSendMessageOptions` no longer carries `answers`.
- The `subagents.questions` / `subagents.answer` RPCs and the `DecisionAnswer*` / `DecisionAskQuestion` wire types have no home: they lived in the deleted apiproxy package, and the session controller declares none of them.
- `packages/api/remotes/src/agent-lookup.ts` keeps only the subagent lookup the remaining callers use; the answer-routing role is gone.
- The contract tests that pinned the wire shape are gone with the transport. What tells the operator a subagent is waiting is now the upstream continuable-activation surface, whose residency and delivery `ContinuableActivationRegistry` owns.

### Why the capability is not missed

The channel's original motivation was the `agent-busy` stall: a subagent that paused on a question had to be distinguished from one that was simply busy, and a text reply could not resume it deterministically. The upstream continuable-activation model answers both halves — an Activation's residency is explicit process-local state with an owner, and `ContinuableStart` / `sendMessage` are typed entry points — so no second channel is needed to resume a paused child.

### Preserved rationale and reintroduction

- **What the fork gave up:** a parent-polled question queue (`subagents.questions`) and a typed answer payload (`options`, `context`, `custom`) that a UI could render instead of free text.
- **Alternatives to full removal that were rejected:** keeping the file and the types behind a compatibility shim (the harness forbids shims), or re-declaring the two RPCs on `SessionController` (a new feature, not a sync, and it would duplicate the activation surface).
- **Reintroduction condition:** a future spec that needs a model-visible, structured question from a subagent to a human starts from the continuable-activation surface and the session controller's own Remote declarations. It must not resurrect the apiproxy-shaped pair.
- **Verification of complete absence:** `git grep` for `DecisionAnswer`, `SubagentDecisionAnswerTable`, `DecisionAskQuestion`, `pendingQuestions`, and `decision-answer` returns no hit in production source, configuration, schema, or test files; the one remaining textual trace is the generated Cordis catalog, which drops its entries when the catalog is regenerated in this same spec, and the subagent subsystem's decision-answer page retires with it.

## Alternatives considered

- **Keep the file and delete only the RPCs** — rejected: `decision-answer.ts` exists only to serve that channel, so it would become dead code the typecheck and the catalogs still carry.
- **Re-declare the two RPCs on `SessionController`** — rejected: that is a new capability with new review, not part of an upstream sync, and it would duplicate the continuable-activation delivery path.
- **Reject the whole port and drop the capability silently** — rejected: an operator-visible capability deserves a recorded rationale and a reintroduction condition, which is what this note is.

## Consequences

- The subagent package ships one continuation model instead of two, and the fork's remaining diff on it is the `list-children` ordering behaviour alone.
- The generated Cordis catalog and the subagent subsystem page lose their decision-answer entries; regenerating the catalog is what removes the last textual traces.
- The recorded cost: a structured question surface an operator could render is gone until a spec reintroduces it on the activation surface.
