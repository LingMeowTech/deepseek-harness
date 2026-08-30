# Implementation Plan: Subagent Decision Answer Channel

**Branch**: `dev-20260831-b13-subagent-decision-answer` | **Date**: 2026-08-31 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `/specs/20260831-064900-subagent-decision-answer/spec.md`

## Summary

为 subagent 路由的 ask_user_question 提供标准决策答复通道：父代理（PM）或外部客户端经 API 对选项作答，子会话按所选选项续跑。当前 `hasApiRemoteSubagentOwner` 对 subagent-owned 会话返回 agent-busy，session.prompt 直发被拒（实证 2026-08-31 会话 d4a67102）。方案 a（subagent.prompt 决策应答 answers 参数）优先，方案 b（subagent.answer/questions RPC）备选；均复用宿主 questions 域契约（/api/respond pending table + zod AskUserQuestionAnswer）。

## Technical Context

**Language/Version**: TypeScript (pnpm monorepo)

**Primary Dependencies**: packages/subagent、packages/host/apiproxy（questions.ts / questions.schema.ts / /api/respond）、packages/api/remotes（agent-lookup.ts）

**Storage**: 宿主 questions 域 pending table（现有，复用）

**Testing**: vitest（各包 `pnpm --filter <包> test`）；类型检查 `pnpm exec tsc -b <包>`

**Target Platform**: DeepSeek Harness Web/API 服务

**Project Type**: TypeScript monorepo 包

**Performance Goals**: 决策应答低延迟（复用现有 pending 路由，无新存储）

**Constraints**: 普通 session.prompt 的 agent-busy fence 行为保持不变；只允许修改本 job 文件范围

**Scale/Scope**: 单功能通道（spec/tasks 阶段仅文档，实现见下游 job）

## Constitution Check

- 按 spec.md RED-GREEN-REFACTOR 验收执行；bite-sized 步骤每步可独立验证。
- 文件范围：specs/<feature>/、docs/autoPlan/、docs/relay-b13-subagent-decision.md；packages/ 源码与公共文件只读（本阶段）。

## Implementation Steps (TDD order)

### Phase 0: Spec & Plan（本 job）

1. 生成 spec.md（需求/范围/RED-GREEN-REFACTOR 验收）✅
2. 生成 plan.md + tasks.md（bite-sized 步骤，TDD 序）✅
3. AutoPlan 留痕 + relay 接力标记 + 提交推送

### Phase 1: TDD-RED（下游 job）

1. 按 tasks.md 写失败测试：`packages/subagent/subagent/tests/`、`packages/host/apiproxy/tests/`、`packages/api/remotes/tests/` 覆盖主链路（子代理发问→代答→续跑）+ 两方案契约 + agent-busy 放行断言。
2. `pnpm --filter <包> test` 确认 RED，记录失败输出到 relay。

### Phase 2: TDD-GREEN（下游 job）

1. 实现方案 a：subagent 投递 API（subagent.prompt）支持结构化决策应答（answers: AskUserQuestionAnswer，一次 ask 一批答）；或方案 b：subagent.answer/questions RPC。
2. `agent-lookup.ts` 决策应答路径放行 subagent-owned 会话，普通 session.prompt fence 不变。
3. RED 用例转绿 + 受影响包全量测试 + `pnpm exec tsc -b`。

### Phase 3: REFACTOR & 验收（下游 job）

1. 清理最小实现；回归：api-proxy-question.spec.ts、agent-lookup.spec.ts、subagent 用例；lint。
2. API 契约文档（docs/ + spec 附录）；issue 上报；AutoPlan 追加结论。

## Verification

- spec/plan/tasks 三文件存在且含 RED-GREEN-REFACTOR 验收（本 job 验证点）。
- 下游：RED 证据记录、GREEN 转绿、回归全绿、tsc/lint 通过、push origin 成功。
