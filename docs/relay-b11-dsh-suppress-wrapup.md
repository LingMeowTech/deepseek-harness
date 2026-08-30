# Relay: B11-B — 结构化输出会话（懒分解）抑制 goal_complete 收尾消息

- 日期：2026-08-31
- 分支：`dev-20260831-dsh-suppress-wrapup`（基于 `6ce1af8015`）
- 提交：`8b26fdc1cb`
- 范围：`packages/goal/tool-goal/**`（src + tests）

## 背景

dsh 结构化输出会话（如 lmo pipeline runner 的懒分解 agent，preset=`pipeline-worker`）最终交付必须是纯 JSON。但 goal-round 驱动的 `update_goal complete/blocked` 会在回合收尾注入 `<goal_complete>`/`<goal_blocked>` 文本指令（`renderWrapupContext`），诱使模型输出面向用户的散文收尾，破坏机器可读交付。

## 判定标记

- 采用 **`session.header.agentPreset === 'pipeline-worker'`** 作为结构化输出会话标记，无需 runner 协议变更。
- 证据：runner `internal/session/dsh_backend.go:287-306` `session.create` RPC 必填 `agentPreset`（默认 `pipeline-worker`）；dsh `Session.create(id, seed?, header?)` 接受 header（`core/session/src/index.ts:482`），`SessionHeader.agentPreset?: string`（`core/session/src/types.ts:98`）。
- `STRUCTURED_OUTPUT_PRESETS` 常量集中在 `wrapup.ts`，后续新增结构化 preset 只需扩列表。

## 改动

- `src/wrapup.ts`：新增 `STRUCTURED_OUTPUT_PRESETS` 与 `isStructuredOutputSession(header)` 纯函数（可单测）。
- `src/index.ts:313`：注入条件改为 `authority.kind === 'goal-round' && !isStructuredOutputSession(execution.agent.session.header)`；goal 状态流转（complete/blocked 标记）不受影响，仅抑制收尾指令注入。
- `tests/tool-goal.spec.ts`：
  - harness 支持注入带 `agentPreset='pipeline-worker'` header 的 worker session；
  - RED 用例：结构化会话 complete 后 `additionalContexts` 为 undefined、blocked 同理；
  - 既有用例（普通会话仍注入 wrapup、direct-human 不注入）保持；
  - REFACTOR：`isStructuredOutputSession` 直接单测。

## 验证结论

- `pnpm exec vitest run packages/goal/tool-goal/tests/tool-goal.spec.ts` → 26 passed
- `pnpm exec tsc -b packages/goal/tool-goal` → 通过
- `pnpm exec oxlint packages/goal/tool-goal/src packages/goal/tool-goal/tests` → 通过

## 部署说明

- 需重建 dsh host lib：`pnpm run build:lib:host`（或对 runner 部署做等价 rebuild），重启 127.0.0.1:3080 的 dsh web 实例后生效；`pnpm run dev:web` watcher 若未运行，必须 rebuild 后刷新页面。
- 运行中的懒分解 job 若已在目标会话内多次 goal-round，重启后新回合即抑制收尾消息。
