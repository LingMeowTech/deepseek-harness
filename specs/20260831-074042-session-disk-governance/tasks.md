# Tasks: Session Disk Governance (B17)

**Input**: Design documents from `specs/20260831-074042-session-disk-governance/`

**Prerequisites**: plan.md（必填）、spec.md（用户故事）

**Tests**: 每个功能块先写失败测试（RED），再实现（GREEN），最后清理验证（REFACTOR）。

**Organization**: Tasks 按三个用户故事分组，各自独立实现/测试/交付。

## Format: `[ID] [P] [Story] Description`

- **[P]**: 可并行（不同文件、无依赖）
- **[Story]**: 所属用户故事（US1=projcache 增量落盘 / US2=session.list 轻量化 / US3=旧会话归档）

---

## Phase 1: US1 - 投影缓存增量落盘（Priority: P1）🎯 MVP

**Goal**: projcache 从每事件全量重写（5.6MB/次）改为增量脏块 + 批量合并落盘，消除写放大。
**独立测试**: 模拟高频事件流，断言固定窗口内写盘次数有上限。

### Tests for US1（RED，先写失败测试）⚠️

- [ ] T001 [P] [US1] `session/session-projection-cache/tests/cache.spec.ts`：新增「高频事件写次数上限」测试——触发 ≥100 事件/秒共 200 次变更，断言实际写盘次数 ≤ 20（写放大消除）
- [ ] T002 [P] [US1] `session/session-projection-cache/tests/cache.spec.ts`：增量合并后缓存内容与全量重写一致（无丢失）

### Implementation for US1（GREEN）

- [ ] T003 [US1] `session/session-projection-cache/src/index.ts`：引入脏块标记（dirty-diff），仅记录变更块
- [ ] T004 [US1] `session/session-projection-cache/src/index.ts`：批量合并落盘（防抖窗口，如 100ms 内合并为一次写）
- [ ] T005 [US1] `session/session-projection-cache/src/index.ts`：写次数上限保护（窗口内写次数硬上限）

### REFACTOR 验证

- [ ] T006 [US1] 运行 `pnpm --filter session-projection-cache test` 全绿；`pnpm exec tsc -b session/session-projection-cache` 通过

**Checkpoint**: US1 独立可测——高频写放大消除，宿主磁盘读写显著下降。

---

## Phase 2: US2 - session.list 轻量化（Priority: P1）

**Goal**: 1100+ 会话下列表加载从 ~120s 超时降至 <200ms（轻量模式仅元数据）。
**独立测试**: 构造 ≥1100 会话环境，断言轻量模式耗时 <200ms。

### Tests for US2（RED）⚠️

- [ ] T007 [P] [US2] `apps/web/tests/`（或 session 列表服务测试）：新增「轻量模式耗时 <200ms」断言——≥1100 会话，轻量模式列表请求耗时 <200ms
- [ ] T008 [P] [US2] 轻量模式响应仅含元数据（id/title/updated），不含消息体字段

### Implementation for US2（GREEN）

- [ ] T009 [US2] session 列表服务：新增轻量查询路径（仅读元数据索引，跳过 jsonl 消息体）
- [ ] T010 [US2] `apps/web/src/`：列表请求支持 `light=1`（或等价）参数走轻量路径
- [ ] T011 [US2] 元数据缓存（如内存索引/预生成元数据文件），避免每次全量扫描

### REFACTOR 验证

- [ ] T012 [US2] 运行列表相关单测/e2e 全绿；全量模式与轻量模式并存，不回归既有行为

**Checkpoint**: US1+US2 独立可用——列表秒开、磁盘写放大消除。

---

## Phase 3: US3 - 旧会话归档（Priority: P2）

**Goal**: 680MB jsonl 归档会话仅加载元数据，历史消息按需分页加载。
**独立测试**: 打开归档会话断言仅元数据加载（无全量 IO）。

### Tests for US3（RED）⚠️

- [ ] T013 [P] [US3] 归档加载测试：680MB 级 jsonl 归档，打开会话断言仅加载元数据（无全量文件读入）
- [ ] T014 [P] [US3] 历史消息按需分页测试：请求第 N 页仅读取对应区间

### Implementation for US3（GREEN）

- [ ] T015 [US3] 归档元数据索引：归档时生成轻量元数据文件（id/title/updated/消息偏移）
- [ ] T016 [US3] 打开归档会话仅读元数据；历史消息经偏移量按需分页读取

### REFACTOR 验证

- [ ] T017 [US3] 运行归档相关测试全绿；未归档会话路径不回归

**Checkpoint**: 三功能块全部独立完成——磁盘治理闭环。

---

## Phase 4: 收尾

- [ ] T018 [P] AutoPlan 留痕更新（docs/autoPlan/2026/08/31/）与 relay 接力标记
- [ ] T019 质量闸门：`pnpm exec tsc -b <受影响包>` → `pnpm --filter <包名> test` → `pnpm run lint` 全绿
- [ ] T020 提交规范：`[{Tag}]` 标题 + 项目符号正文，仅 add 本功能块文件

---

## Dependencies & Execution Order

### Phase Dependencies

- **US1/US2/US3**: 相互独立、无前置阻塞，可并行（不同包/目录，[P] 标记任务可并行）
- **收尾（Phase 4）**: 依赖三个用户故事完成

### 执行顺序

1. 每个功能块内部：测试先行（RED）→ 最小实现（GREEN）→ 清理验证（REFACTOR）
2. 三个功能块按 P1→P1→P2 优先序，可由不同 agent 并行实现
3. 每个任务完成后独立提交（仅 add 本功能块文件）

### Parallel Opportunities

- T001/T002（US1 测试）、T007/T008（US2 测试）、T013/T014（US3 测试）可并行
- 三功能块实现互不依赖（不同文件），可并行扇出

## Notes

- 每个用户故事独立完成验证后即可提交，无需等待其他故事
- 写次数上限/耗时/元数据加载断言是 TDD 验收核心，必须在实现前先红
- 提交标题 Tag 用 `[Feature]`/`[Fix]`，正文项目符号逐条列出
