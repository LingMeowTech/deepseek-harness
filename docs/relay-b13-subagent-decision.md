# Relay: B13 子代理决策答复通道

## 状态: spec 完成 ✅

**更新时间**: 2026-08-31 06:50 UTC+8

## 分支信息

- **分支名**: `dev-20260831-b13-subagent-decision-answer`
- **worktree**: `C:/Users/miao/AppData/Local/Programs/LingMeowTech/LingmeowObservatory/app/deepseek-harness/dev`

## 已产出（spec-kit 产物目录 $SPEC_DIR）

- `specs/20260831-064900-subagent-decision-answer/spec.md` — 需求目标/范围/验收标准（RED-GREEN-REFACTOR）+ input_spec
- `specs/20260831-064900-subagent-decision-answer/plan.md` — 技术方案与 TDD 实施步骤
- `specs/20260831-064900-subagent-decision-answer/tasks.md` — bite-sized 任务清单（RED→GREEN→REFACTOR）

## API 契约草案

**通道端点/RPC 形状**（二选一，实现阶段定）：
- **方案 a**（优先）: subagent 投递 API（subagent.prompt）支持结构化决策应答参数 `answers: AskUserQuestionAnswer`（一次 ask 一批答，不拆单问）。
- **方案 b**（备选）: 新增 `subagent.answer` / `subagent.questions` RPC。

**参数形状**: `AskUserQuestionAnswer` = `{ id: rpcId, selected: number[] | string, custom?: string }`（与宿主 `packages/host/apiproxy/src/api/questions.schema.ts` zod schema 对齐）。

**错误形状**:
- rpcId 不存在/已过期（pending table 无记录）→ not-found。
- selected 越界 / 缺 id / custom 超长 → zod 校验失败，统一结构化错误。
- 重复作答 → 幂等或冲突错误（实现时定）。

**与宿主 questions 域对齐**: 复用 `packages/host/apiproxy` `/api/respond` pending table 路由或等价 RPC 形状；`QuestionResponsePayload` 契约见 `src/api/questions.ts`；校验见 `questions.schema.ts`；回归参考 `tests/api-proxy-question.spec.ts`。

**agent-busy 放行**: `packages/api/remotes/src/agent-lookup.ts` 的 `hasApiRemoteSubagentOwner` fence 对决策应答路径放行；普通 `session.prompt` 的 agent-busy 行为保持不变（回归红线）。

## 下一步

**TDD-RED**：按 `tasks.md` Phase 1 写失败测试（packages/subagent/subagent/tests/、packages/host/apiproxy/tests/、packages/api/remotes/tests/），覆盖主链路：子代理发问→父代理代答→按选项续跑；跑测试确认 RED 并记录失败输出到本文件。
