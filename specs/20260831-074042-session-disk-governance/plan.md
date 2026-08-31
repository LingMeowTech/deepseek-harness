# Implementation Plan: Session Disk Governance (B17)

**Branch**: `dev-20260831-b17-spec` | **Date**: 2026-08-31 | **Spec**: [spec.md](spec.md)

**Input**: Feature specification from `specs/20260831-074042-session-disk-governance/spec.md`

## Summary

dsh 宿主磁盘疯狂读写与卡死治理。三个独立功能块（各自独立实现/验证/演示）：

1. **projcache 增量落盘**：`session/session-projection-cache` 包当前在每次事件全量重写投影缓存（约 5.6MB/次），改为增量脏块标记 + 批量合并落盘，高频事件下写次数有上限。
2. **session.list 轻量化**：1100+ 会话导致列表加载超时（约 120s），增加轻量模式仅返回元数据（id/title/updated），<200ms。
3. **旧会话归档**：680MB jsonl 归档仅加载元数据，历史消息按需分页加载。

## Technical Context

**Language/Version**: TypeScript（Node.js 宿主，pnpm workspace）

**Primary Dependencies**: cordis（宿主框架）、vitest（测试）、dsh-lmtech-plugins（插件包）

**Storage**: 文件系统（`session/*.jsonl` 会话存储 + `session/session-projection-cache` 投影缓存文件）

**Testing**: vitest（`*.spec.ts`）+ e2e（`web/tests/*.e2e.ts`），TDD RED→GREEN→REFACTOR

**Target Platform**: DSH 宿主（Node.js 桌面宿主，Windows 开发环境）

**Project Type**: 宿主核心包（session 存储/投影缓存）+ web UI（会话列表）

**Performance Goals**: 高频事件写次数有上限（写放大消除）；session.list 轻量模式 <200ms（1100+ 会话）；归档仅元数据加载

**Constraints**: <200ms 列表耗时；不破坏既有会话/缓存数据格式兼容；每功能块独立可测

**Scale/Scope**: 1100+ 会话、680MB jsonl、5.6MB/次投影缓存写放大

## Constitution Check

- ✅ Token Budget：spec ≤1 页、plan/tasks 精简，禁止巨型文档
- ✅ Test-First：三功能块均有 RED→GREEN→REFACTOR 验收断言
- ✅ 独立可测：P1 用户场景各自独立实现/验证/演示
- ✅ 仓库约束：deepseek-harness + dsh-lmtech-plugins

## Project Structure

### Documentation (this feature)

```text
specs/20260831-074042-session-disk-governance/
├── spec.md              # 需求真源（本文件）
├── plan.md              # 技术方案（本文件）
└── tasks.md             # bite-sized 任务分解（/speckit-tasks）
```

### Source Code (repository root)

```text
session/
├── session-projection-cache/     # 功能块 1：投影缓存增量落盘
│   ├── src/index.ts              # 缓存写入逻辑（全量→增量+批量合并）
│   └── tests/cache.spec.ts       # 写次数上限断言测试
├── session-store/                # 功能块 3：会话存储/归档（*）
└── *.jsonl                       # 会话文件（680MB 级）

apps/web/
├── src/                          # 功能块 2：session.list 轻量模式
└── tests/*.e2e.ts               # 列表耗时/元数据断言

packages/dsh-lmtech-plugins/      # 相关插件包（如涉 session 列表/归档 UI）
```

**Structure Decision**: 复用既有包结构，不新增顶层目录；功能块 1/2/3 分别在
`session/session-projection-cache`、`apps/web`、`session` 存储层实施，
避免跨文件冲突。

## Implementation Strategy (per user story)

### US1 projcache 增量落盘（P1）— 独立实现
1. RED：`tests/cache.spec.ts` 断言高频事件（≥100 事件/秒）窗口内写盘次数 ≤ 上限
2. GREEN：脏块标记 + 批量合并（防抖/节流窗口），写次数受控
3. REFACTOR：验证缓存内容与全量重写一致，跑包测试

### US2 session.list 轻量化（P1）— 独立实现
1. RED：断言 ≥1100 会话轻量模式耗时 <200ms
2. GREEN：轻量列表仅返回元数据（id/title/updated），跳过消息体加载
3. REFACTOR：全量/轻量双模式并存，验证不回归

### US3 旧会话归档（P2）— 独立实现
1. RED：断言归档会话仅加载元数据（无全量文件 IO）
2. GREEN：归档 jsonl 元数据索引 + 历史按需分页加载
3. REFACTOR：兼容未归档会话路径

## Complexity Tracking

无违规。三功能块均复用既有包，无新增项目/架构层。
