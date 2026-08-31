# Feature Specification: Session Disk Governance (B17)

**Feature Branch**: `dev-20260831-b17-spec`

**Created**: 2026-08-31

**Status**: Draft

**Input**: dsh 宿主磁盘疯狂读写与卡死治理：投影缓存增量落盘 + session.list 轻量化 + 旧会话归档

## User Scenarios & Testing *(mandatory)*

### User Story 1 - 投影缓存增量落盘（Priority: P1）

高频事件（工具调用/状态变更）触发 projcache 全量重写（约 5.6MB/次），磁盘写放大导致宿主卡死。

**Why this priority**: 写放大是磁盘疯狂读写与卡死的根因，治理收益最大，必须最先落地。

**Independent Test**: 模拟高频事件流（≥100 事件/秒），断言固定事件窗口内 projcache 写盘次数有上限（增量/批量合并，写次数不随事件数线性增长）。

**Acceptance Scenarios**:

1. **Given** 高频事件流持续产生，**When** 事件累积 N 次（如 200），**Then** projcache 实际写盘次数 ≤ 上限（如 20），写次数上限断言通过（RED→GREEN 度量）
2. **Given** 缓存内容被增量修改，**When** 触发合并落盘，**Then** 重新加载后缓存内容与全量重写一致（无丢失）

---

### User Story 2 - session.list 轻量化（Priority: P1）

1100+ 会话导致会话列表加载超时（约 120s 超时），无法快速切会话。

**Why this priority**: 列表加载是高频入口操作，超时直接阻塞日常使用，与 P1 并列优先。

**Independent Test**: 构造 ≥1100 会话环境，断言轻量模式下列表请求耗时 <200ms。

**Acceptance Scenarios**:

1. **Given** 1100+ 会话数据，**When** 使用轻量模式请求 session.list，**Then** 耗时 <200ms（耗时断言）
2. **Given** 轻量模式，**When** 请求列表，**Then** 仅返回元数据（id/title/updated），不加载完整消息体

---

### User Story 3 - 旧会话归档（Priority: P2）

680MB jsonl 会话文件加载导致宿主卡死，归档后应只加载元数据。

**Why this priority**: 归档是容量治理的兜底手段，P1 两项之后实施。

**Independent Test**: 对归档会话（680MB jsonl 级）断言仅加载元数据（不整体读入消息体），历史消息按需分页加载。

**Acceptance Scenarios**:

1. **Given** 680MB 归档 jsonl，**When** 打开该会话，**Then** 仅加载元数据（无全量文件 IO/内存占用，度量断言）
2. **Given** 归档会话已打开，**When** 请求历史消息，**Then** 按需分页加载，不一次性读全

### Edge Cases

- 高频事件流中进程异常退出：增量缓存未合并部分如何恢复（保守策略：下次启动全量重建）
- 轻量模式下会话数为 0 / 超大（>10000）：边界不退化
- 归档文件损坏/缺失：降级为仅元数据 + 明确错误提示

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: projcache 落盘 MUST 采用增量/批量合并，高频事件下写次数有上限断言
- **FR-002**: session.list MUST 提供轻量模式，≥1100 会话耗时 <200ms
- **FR-003**: 归档 jsonl 会话 MUST 仅加载元数据，历史消息按需分页加载
- **FR-004**: 三个功能块 MUST 各自具备 RED→GREEN→REFACTOR 验收断言（先写失败测试转绿）
- **FR-005**: P1 用户场景 MUST 独立可测（可单独实现/验证/演示）

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: 高频事件写次数上限断言通过（写放大消除，宿主不再卡死）
- **SC-002**: session.list 轻量模式耗时 <200ms 断言通过（1100+ 会话）
- **SC-003**: 归档仅元数据加载断言通过（680MB jsonl 不整体读入）
- **SC-004**: 三功能块 TDD 全绿（RED 先红 → GREEN 转绿 → REFACTOR 清理），验证命令通过

## Assumptions

- 目标仓库：deepseek-harness（宿主）+ dsh-lmtech-plugins（相关插件包）
- 兼容既有会话/缓存数据格式，不破坏旧数据可读性
- v1 范围：三项治理各自独立实现与验证，不做联动重构
