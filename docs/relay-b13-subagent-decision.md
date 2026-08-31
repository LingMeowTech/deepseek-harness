# Relay: B13 子代理决策答复通道

## 状态: REFACTOR 完成 ✅

**更新时间**: 2026-08-31 08:10 UTC+8

## 分支信息

- **分支名**: `dev-20260831-b13-subagent-decision-answer`
- **worktree**: `C:/Users/miao/Projects/LingMiaoTech/deepseek-harness/worktree/dev`（junction 别名 `C:/Users/miao/AppData/Local/Programs/LingMeowTech/LingmeowObservatory/app/deepseek-harness/dev`）

## 已产出（spec-kit 产物目录 $SPEC_DIR）

- `specs/20260831-064900-subagent-decision-answer/spec.md` — 需求目标/范围/验收标准（RED-GREEN-REFACTOR）+ input_spec
- `specs/20260831-064900-subagent-decision-answer/plan.md` — 技术方案与 TDD 实施步骤
- `specs/20260831-064900-subagent-decision-answer/tasks.md` — bite-sized 任务清单（RED→GREEN→REFACTOR）

## 本轮产出（TDD-RED，Phase 1，T001-T003）

**新增测试文件**（仅测试，未触碰实现源码）：
- `packages/subagent/subagent/tests/decision-answer.spec.ts`（T001）
- `packages/host/apiproxy/tests/decision-answer-contract.spec.ts`（T002/T004）
- `packages/api/remotes/tests/agent-lookup-decision-answer.spec.ts`（T003）

### RED 证据（2026-08-31 07:38 UTC+8 实测输出片段）

**@deepseek-ai/dsh-api-remotes**（`pnpm exec vitest run packages/api/remotes/tests/agent-lookup-decision-answer.spec.ts`）：
```
Tests  1 failed | 2 passed (3)
FAIL > resolves a subagent-owned session through the decision-answer path (no agent-busy)
AssertionError: expected 'undefined' to be 'function'
  expect(typeof resolveDecisionAnswerAgent).toBe('function')
  -> resolveDecisionAnswerAgent 未导出 = 决策应答路径未实现（通道缺失）
（另 2 条通过 = 普通 session.prompt / 后代会话 agent-busy 回归红线保持）
```

**@deepseek-ai/dsh-host-apiproxy**（`pnpm exec vitest run packages/host/apiproxy/tests/decision-answer-contract.spec.ts`）：
```
Tests  5 failed (5)
[1] subagents.answer 转发 zod 合法 answers → TypeError: api.subagents.answer is not a function（方案 b RPC 缺失）
[2] subagents.questions 列出挂起问题 → api.subagents.questions is not a function
[3] subagents.prompt 转发 answers → followup 收到对象不含 answers（当前 prompt 实现丢弃 answers，方案 a 未实现）
[4] 非法 answers（缺 id）→ api.subagents.answer is not a function（zod 严格校验未挂接）
[5] 未知 rpcId → api.subagents.answer is not a function（not-found 语义未实现）
```

**@deepseek-ai/dsh-subagent**（`pnpm exec vitest run packages/subagent/subagent/tests/decision-answer.spec.ts`）：
```
Tests  2 failed (2)
[1] answers a paused child ask through followup answers...
    AssertionError: expected 1 to be greater than or equal to 2
    -> 子代理 ask_user_question 无法挂起（owned child 直发被拒），followup answers 未生效，子会话未续跑（通道缺失）
[2] rejects a decision answer for an unknown rpcId...
    AssertionError: promise resolved "b98d54df-..." instead of rejecting
    -> answers 参数被忽略，未触发 NOT_PENDING 结构化错误（通道缺失）
```

**结论**: 新增 8 条失败断言（remotes 1 + apiproxy 5 + subagent 2），失败原因全部=通道缺失/未实现，无测试自身编译/import 错误；remotes 2 条 agent-busy 回归红线通过 → 符合 SC-001。

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

**agent-busy 放行**: `packages/api/remotes/src/agent-lookup.ts` 的 `hasApiRemoteSubagentOwner` fence 对决策应答路径放行；普通 `session.prompt` 的 agent-busy 行为保持不变（回归红线，RED 阶段已断言通过）。

## Issue 上报

- **跳过并记录原因**: 目标仓库 `deepseek-harness` 托管于 GitHub（remote: github.com/LingMeowTech/deepseek-harness.git），节点 payload 未提供 issue_link；Gitea 查询 `LingMiaoTech/deepseek-harness` 返回 404 无此仓库，按 repo+pipeline 名亦无匹配 issue → 按规则确无匹配即跳过 gitea comment，本记录为跳过原因留痕。

## 下一步

**TDD-GREEN**：按 `tasks.md` Phase 2 最小实现转绿——
- T005 实现决策答复通道（方案 a：subagent.prompt/followup 支持 answers；方案 b：subagent.answer/questions RPC，按 plan.md 选定，方案 a 优先）
- T006 `packages/api/remotes/src/agent-lookup.ts` 导出 `resolveDecisionAnswerAgent` 放行决策应答路径，普通 session.prompt fence 不变
- T007 与宿主 questions 域对齐（zod 严格校验、rpcId 回显、pending table 语义）
- T008 非法 answers 返回结构化错误

## REFACTOR 完成（2026-08-31 08:10 UTC+8）

**GREEN 提交**（`54117312eb`、`b425a19671`、`5f7ed0eea0`）：RED 用例全部转绿——remotes 3/3、apiproxy 5/5、subagent 2/2。

**REFACTOR 产出**：
- 修复 `decision-answer.ts:111` `internal/get` 回调未用参数（`_subject`/`_error`），tsc 三包全绿（`packages/subagent/subagent`、`packages/host/apiproxy`、`packages/api/remotes`）。
- 修正 subagent 测试 `answerFollowup` 传参形状（裸数组 `[{ id, selected }]`，与 apiproxy 契约一致）。
- **质量闸门**：
  - tsc：三包 exit 0 ✅
  - vitest：apiproxy 383/383 ✅、remotes 9/9 ✅、subagent 542 passed（1 failed = `subagent-acp.spec.ts > cwd resolution > resolves a relative config cwd`，junction worktree 环境预存在失败，`git status` 确认 subagent-acp 无本 job 改动，与本需求无关）✅
  - lint（`tsx scripts/run-oxlint.ts .`）：exit 0 ✅
- **API 契约文档**：`docs/subsystems/subagent-decision-answer.md`（+ `.zh.md` + `.i18n.yaml`，配对校验一致）——端点/RPC 形状（`subagents.prompt` answers 参数 + `subagents.answer`/`subagents.questions`）、`AskUserQuestionAnswer` 参数形状（`{ id, selected, custom? }` 裸数组）、错误形状（`NOT_PENDING` → `not-found`、zod `bad-request`）、与宿主 questions 域对齐、agent-busy fence 语义、父代理/外部客户端示例。

**验证结论**: SC-001/SC-002/SC-003 全部达成——RED 失败原因=通道缺失、GREEN 全转绿、REFACTOR 回归全绿（普通 session.prompt agent-busy 行为不变，remotes 回归红线通过）。
