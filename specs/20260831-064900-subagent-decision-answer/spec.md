# Feature Specification: Subagent Decision Answer Channel

**Feature Branch**: `dev-20260831-b13-subagent-decision-answer`

**Created**: 2026-08-31

**Status**: Draft

**Input**: User description: "为 subagent 会话的 ask_user_question 提供标准决策答复通道：父代理（PM）或外部客户端可经 API 对选项作答并让子会话续跑"

## User Scenarios & Testing *(mandatory)*

### User Story 1 - 父代理/外部客户端代答子代理决策问题并续跑 (Priority: P1)

子代理会话（subagent 路由）发出 `ask_user_question` 后挂起；父代理（PM）或外部客户端经 API 对选项作答；子会话按所选选项续跑并回报结果。当前 `hasApiRemoteSubagentOwner` 对 subagent-owned 会话返回 agent-busy 拒绝直发（实证 2026-08-31 会话 d4a67102），本通道消除该空转。

**Why this priority**: 决策答复是子代理流程不空转的必需能力，缺失即任务悬挂。

**Independent Test**: 可独立测试——构造子代理 ask 挂起 → 经新通道作答（answers: AskUserQuestionAnswer）→ 断言子会话续跑并返回按选项执行的结果；断言决策应答路径不再返回 agent-busy，普通 session.prompt 行为不变。

**Acceptance Scenarios**:

1. **Given** 子代理会话发出 ask_user_question 且挂起，**When** 父代理经决策答复通道提交 answers（id/selected/custom），**Then** 会话按所选选项续跑并回报结果，rpcId 回显一致。
2. **Given** 决策答复请求到达 subagent-owned 会话，**When** 通道放行，**Then** 不再返回 agent-busy；普通 session.prompt 仍返回 agent-busy。
3. **Given** 提交非法 answers（缺 id/选项越界），**When** zod 严格校验，**Then** 返回结构化错误（错误形状），不写入 pending table。

---

### User Story 2 - 与宿主 questions 域对齐 (Priority: P2)

决策答复通道复用宿主 questions 域契约：`packages/host/apiproxy/src/api/questions.ts`（QuestionResponsePayload）+ `questions.schema.ts`（zod AskUserQuestionAnswer）+ `/api/respond` pending table 路由；方案 a=subagent.prompt 支持决策应答（answers 参数）；方案 b=新增 subagent.answer/questions RPC——实现阶段二选一，均须对齐。

**Why this priority**: 契约复用避免双轨漂移。

**Independent Test**: 断言新通道请求/响应形状与 `tests/api-proxy-question.spec.ts` 的 AskUserQuestionAnswer 校验一致。

**Acceptance Scenarios**:

1. **Given** 决策答复经新通道提交，**When** 校验，**Then** 与宿主 /api/respond 同一 zod schema，错误消息一致。
2. **Given** 通道端点，**When** 请求，**Then** 形状符合 QuestionResponsePayload / RPC 契约。

### Edge Cases

- 问题 rpcId 不存在/已过期（pending table 无记录）→ 返回 not-found 错误形状，不静默成功。
- 选项 selected 越界或 custom 超长 → zod 拒绝并返回统一错误形状。
- 重复作答同一 rpcId → 幂等或明确冲突错误（实现时定）。

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: 系统 MUST 提供决策答复通道，父代理/外部客户端可对子代理 ask_user_question 作答。
- **FR-002**: 通道 MUST 与宿主 questions 域对齐（zod AskUserQuestionAnswer 严格校验、rpcId 回显）。
- **FR-003**: 决策应答路径 MUST 对 subagent-owned 会话放行（不再 agent-busy）；普通 session.prompt 的 agent-busy fence 保持不变。
- **FR-004**: 系统 MUST 在答案提交后让子会话按所选选项续跑并回报结果。
- **FR-005**: 系统 MUST 对非法 answers 返回结构化错误。

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**（RED）: 新增测试运行失败，失败原因=通道缺失/未实现（agent-busy 或端点 404）。
- **SC-002**（GREEN）: 新增 RED 用例全部转绿；受影响包 `pnpm exec tsc -b` 无错误。
- **SC-003**（REFACTOR）: 回归全绿——`packages/host/apiproxy tests/api-proxy-question.spec.ts`、`packages/api/remotes tests/agent-lookup.spec.ts`、subagent 相关用例通过；lint 通过；普通 session.prompt agent-busy 行为不变。

## Assumptions

- 实现方案 a（subagent.prompt 决策应答 answers 参数）优先，方案 b（subagent.answer/questions RPC）为备选，最终按 plan.md 选定。
- 目标仓库 deepseek-harness；issue 引用：节点 payload 未配置 issue_link，Gitea 无该仓库（GitHub 托管），input_spec 以占位记录，下游验收节点按 repo+pipeline 名查询匹配。

## Input Data Spec (input_spec)

```json
{"result":[{"type":"json","value":{"issue":"(payload 未配置 issue_link；仓库托管于 GitHub)","repo":"deepseek-harness","branch":"dev-20260831-b13-subagent-decision-answer"},"name":"b13_input","note":"子代理决策上下文：问题 rpcId/选项/发起者（父代理或外部客户端）"}]}
```
