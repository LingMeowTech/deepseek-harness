# Tasks: Subagent Decision Answer Channel

**Input**: Design documents from `/specs/20260831-064900-subagent-decision-answer/`

**Prerequisites**: plan.md (required), spec.md (required for user stories)

**Tests**: 按 spec 要求含测试任务（TDD：先写失败测试）。

**Organization**: Tasks 按 user story 分组；US1 为 P1 MVP。

## 格式: `[ID] [P?] [Story] 描述`

- **[P]**: 可并行（不同文件、无依赖）
- **[Story]**: 所属 user story（US1/US2）
- 含精确文件路径

## Phase 1: TDD-RED（失败测试，下游 job 执行）

**Purpose**: 先写失败测试确认通道缺失

- [ ] T001 [US1] 主链路集成测试（RED）：packages/subagent/subagent/tests/ 新增子代理 ask_user_question 挂起 → 父代理经决策答复通道提交 answers → 子会话按选项续跑并回报（断言 rpcId 回显）
- [ ] T002 [US1] 契约测试（RED）：packages/host/apiproxy/tests/ 新增决策答复与宿主 questions 域对齐断言（zod AskUserQuestionAnswer 严格校验：id/selected/custom；非法输入返回结构化错误；pending table 无记录 → not-found）
- [ ] T003 [US1] agent-busy 放行测试（RED）：packages/api/remotes/tests/ 新增决策应答路径不再返回 agent-busy，普通 session.prompt 仍 agent-busy
- [ ] T004 [P] [US2] 方案 b RPC 形状契约测试（RED，备选）：subagent.answer/questions RPC 形状断言（若实现阶段选方案 b 才落地）

**Checkpoint**: `pnpm --filter <对应包名> test` 全部失败且失败原因=通道缺失/未实现 → 记录 RED 证据到 relay

## Phase 2: TDD-GREEN（最小实现，下游 job 执行）

**Purpose**: 最小实现转绿，不提前重构

- [ ] T005 [US1] 实现决策答复通道：方案 a=subagent 投递 API（subagent.prompt）支持结构化决策应答（answers: AskUserQuestionAnswer，一次 ask 一批答）；方案 b=新增 subagent.answer/questions RPC——按 plan.md 选定（方案 a 优先）
- [ ] T006 [US1] packages/api/remotes/src/agent-lookup.ts 为决策应答路径放行 subagent-owned 会话，普通 session.prompt 的 agent-busy fence 不变
- [ ] T007 [US1] 与宿主 questions 域对齐：复用 /api/respond pending table 路由或等价 RPC 形状、zod 严格校验、rpcId 回显
- [ ] T008 [US1] 非法 answers（缺 id/selected 越界/custom 超长）返回结构化错误

**Checkpoint**: RED 用例（T001-T003）全部转绿；受影响包全量测试通过；`pnpm exec tsc -b <受影响包>` 无错误

## Phase 3: REFACTOR & 验收（下游 job 执行）

**Purpose**: 清理 + 回归 + 契约说明 + 上报

- [ ] T009 重构清理（命名/重复/死代码/注释），保持行为不变，每步跑测试确认
- [ ] T010 质量闸门：`pnpm exec tsc -b <受影响包>` → `pnpm --filter <包> test`（回归：api-proxy-question.spec.ts、agent-lookup.spec.ts、subagent 用例）→ lint
- [ ] T011 docs/ 写入 API 契约说明：通道端点/RPC 形状、AskUserQuestionAnswer 参数（id/selected/custom）、错误形状、与宿主 questions 域对齐关系、父代理与外部客户端示例调用；写入 spec 附录
- [ ] T012 docs/autoPlan/{YYYY}/{MM}/{DD}/ 追加验收结论（分支/commit/回归结果）
- [ ] T013 issue 上报（lmo_server_api.py gitea comment：start/end/State Summary）；.lmo/output.json 落地；pipeline_report_node 上报

## Dependencies & Execution Order

### Phase Dependencies

- **TDD-RED (Phase 1)**: 无依赖，可立即开始（下游 job 1）
- **TDD-GREEN (Phase 2)**: 依赖 Phase 1 全部 RED 用例（下游 job 2）
- **REFACTOR & 验收 (Phase 3)**: 依赖 Phase 2 转绿（下游 job 3）

### 并行机会

- T001/T002/T003/T004 不同文件可并行（同一 job 内）
- T005/T006/T007 同一文件面需串行（agent-lookup.ts 与投递 API）

## Implementation Strategy

1. Phase 1 先写失败测试（RED）→ 记录失败证据
2. Phase 2 最小实现转绿（方案 a 优先，方案 b 备选）
3. Phase 3 重构 + 回归 + 契约 + 上报（REFACTOR）
4. 每阶段 commit 一次（[Add]/[Feature]/[Fix] 标题 + 项目符号正文），push origin

## Notes

- 禁止修改 packages/ 源码与公共文件（本 spec/plan/tasks 阶段仅文档；实现见下游 job）
- 普通 session.prompt 的 agent-busy 行为是回归红线，必须保持
- 每次验证先跑最贴近的用例，再扩大范围
