# [B17] dsh 宿主磁盘治理 - spec 阶段（spec-kit 规格与 AutoPlan）

- 日期：2026-08-31（UTC+8）
- 分支：`dev-20260831-b17-spec`
- 工作目录：`C:/Users/miao/Projects/LingMiaoTech/deepseek-harness/wt-dev-20260831-b17-spec`
- 规格目录：`specs/20260831-074042-session-disk-governance/`
- 执行档位：flash+high

## 需求目标

dsh 宿主磁盘疯狂读写与卡死治理，三个功能块：

1. **projcache 增量落盘**：投影缓存约 5.6MB/次全量重写 → 增量脏块 + 批量合并，写次数有上限
2. **session.list 轻量化**：1100+ 会话列表 ~120s 超时 → 轻量模式 <200ms（仅元数据）
3. **旧会话归档**：680MB jsonl 归档仅加载元数据，历史按需分页加载

## 执行计划

| 步骤 | 内容 | 验证 |
|------|------|------|
| 1 | worktree + 分支（已存在沿用） | `git worktree list` 可见 `wt-dev-20260831-b17-spec` / `dev-20260831-b17-spec` |
| 2 | spec-kit 初始化 + create-new-feature（`session-disk-governance`） | `.specify/` + `specs/<feature>/spec.md` 生成 |
| 3 | 填写 spec.md（≤1 页单一真源） | 三功能块目标/范围/验收 RED-GREEN-REFACTOR 全覆盖 |
| 4 | setup-plan.ps1 → plan.md；setup-tasks.ps1 → tasks.md | 三功能块 bite-sized 步骤，含命令与验证 |
| 5 | AutoPlan 留痕 + relay 接力标记 | 文件落盘 |
| 6 | 提交 + 推送 | commit `[Add][Spec] B17 spec-kit 规格与 AutoPlan`，`git ls-remote origin` 可见 |

## TDD 红绿灯（验收断言，供实现 job 引用）

| 功能块 | RED 断言 | GREEN 目标 | REFACTOR 验证 |
|--------|----------|-----------|---------------|
| projcache 治理 | 高频事件（≥100 事件/秒）200 次变更写盘次数 > 20（红） | 增量脏块 + 批量合并，写次数 ≤ 20 | 缓存内容与全量一致；包测试全绿 |
| list 轻量化 | ≥1100 会话轻量模式耗时 ≥200ms（红） | 轻量模式仅元数据 <200ms | 全量/轻量双模式并存不回归 |
| 归档 | 680MB 归档打开时全量加载（红） | 仅元数据加载 + 分页读取 | 未归档会话路径不回归 |

## 验证结论（spec 阶段）

- `spec.md` / `plan.md` / `tasks.md` 存在且覆盖三功能块 TDD 验收 ✅
- 分支 `dev-20260831-b17-spec` 已推送，`git ls-remote origin` 可见 ✅
- 实现 job 入口见 `docs/relay-b17-spec.md`

## 交接

下游三个实现任务：
- US1 projcache 增量落盘 → `session/session-projection-cache/`
- US2 session.list 轻量化 → `apps/web/` + session 列表服务
- US3 旧会话归档 → `session/` 存储层

按 tasks.md 的 T001-T020 执行，每功能块独立 RED→GREEN→REFACTOR，独立提交。
