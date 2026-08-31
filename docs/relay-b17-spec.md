# Relay: B17 dsh 宿主磁盘治理（spec 阶段完成）

## 状态: 完成 ✅

**结束时间**: 2026-08-31 08:15 UTC+8

## 分支信息

- **分支**: `dev-20260831-b17-spec`
- **worktree**: `C:/Users/miao/Projects/LingMiaoTech/deepseek-harness/wt-dev-20260831-b17-spec`

## 已产出（spec-kit 规格目录 $SPEC_DIR）

`specs/20260831-074042-session-disk-governance/`：

- `spec.md` — 需求目标/范围/验收标准（RED-GREEN-REFACTOR）+ 用户场景（P1 优先独立可测）
- `plan.md` — 技术方案（三功能块，含技术上下文/约束/实现策略）
- `tasks.md` — bite-sized 任务清单（T001-T020，三功能块各含 RED→GREEN→REFACTOR 与验证命令）

## 三个实现任务入口（供下游 job 引用）

### 任务 1: projcache 增量落盘（US1, P1）
- **文件范围**: `session/session-projection-cache/`（src/index.ts + tests/cache.spec.ts）
- **验收**: 高频事件（≥100 事件/秒）200 次变更写盘次数 ≤ 20；增量合并后内容与全量一致
- **测试命令**: `pnpm --filter session-projection-cache test`
- **tasks 引用**: T001-T006

### 任务 2: session.list 轻量化（US2, P1）
- **文件范围**: `apps/web/` + session 列表服务（轻量查询路径）
- **验收**: ≥1100 会话轻量模式耗时 <200ms；仅返回元数据（id/title/updated）
- **测试命令**: 列表相关单测/e2e（`pnpm exec vitest run <affected>`）
- **tasks 引用**: T007-T012

### 任务 3: 旧会话归档（US3, P2）
- **文件范围**: `session/` 存储层（归档元数据索引 + 分页读取）
- **验收**: 680MB jsonl 归档仅加载元数据；历史消息按需分页加载
- **测试命令**: 归档相关测试（`pnpm --filter <session 包> test`）
- **tasks 引用**: T013-T017

## 验证结论

- spec.md/plan.md/tasks.md 存在且覆盖三功能块 TDD 验收 ✅
- 分支 `dev-20260831-b17-spec` 已推送 origin ✅
- AutoPlan 留痕：`docs/autoPlan/2026/08/31/[B17]dsh-宿主磁盘治理-spec阶段.md`
