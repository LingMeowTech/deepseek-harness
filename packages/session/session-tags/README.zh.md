---
description: "面向 pipeline 会话的持久化逐会话字符串标签：一次写入标签列表，随后经宿主 RPC 或客户端会话列表读回，并把 pipeline 工作从普通会话浏览中筛出。"
kind: "package-reference"
---

# @lingmeow.tech/dsh-session-tags

[English](README.md) | 中文

## 概述

在任意会话上存储一份持久的字符串标签列表，并在重启后读回。pipeline 会话携带四个冻结名称 `pipeline_id`、`state_id`、`job_id` 与 `node_id`，浏览器据此把 pipeline 工作与普通会话区分开。调用方经宿主侧的 `ctx.sessionTags` 或客户端的 `session.tags.*` RPC 到达同一个 `session_tags` 存储域行。一次写入会替换整份列表，并在输入为空、超长或超出数量上限时 fail loud。标签永不进入模型，客户端以拉取而非接收帧的方式获知变更。

## 目录

- [使用本包](#use-this-package)
- [理解实现](#understand-the-implementation)
- [进一步探索](#further-exploration)
- [模型体验](#model-experience)
- [已知限制与延期工作](#known-limitations-and-deferred-work)
- [开发备注](#dev-note)

-----

<a id="use-this-package"></a>
## 使用本包

把本插件挂载在存储域服务旁边。它打开 `session_tags` domain，维护一张以会话 id 为键的 `tags` 表，并发布 `sessionTags` 服务，供本仓的宿主 RPC 与浏览器会话列表读取。

### 何时选择

当会话需要跨重启保留标签、同时又不进入会话日志时选择它：持久关联标签、归属标记，以及 pipeline 区域自己的四个名称。当模型必须在其上下文中看到该值时，改用会话事件；当该值属于部署而非单个会话时，改用工作区设置。标签属于辅助性的数据面状态，因此一次失败或缓慢的标签读取不会阻塞会话列表。

### 最小配置

```yaml
- id: session-tags
  name: '@lingmeow.tech/dsh-session-tags'
  config:
    maxTagsPerSession: 64
    maxTagChars: 128
```

| 字段 | 默认值 | 含义 |
|---|---|---|
| `maxTagsPerSession` | `64` | 单个会话可持有的标签上限 |
| `maxTagChars` | `128` | 单个标签的字符上限 |

两个上限都接受任意正安全整数，构造函数会拒绝其他取值。本插件不需要其他配置。

### 读写标签

`ctx.sessionTags` 暴露三个操作，宿主 RPC 与浏览器列表消费的是同一组操作。

| 成员 | 语义 |
|---|---|
| `list(sessionId)` | 按插入顺序读取已存标签 |
| `set(sessionId, tags)` | 替换完整标签列表；空输入即删除该行 |
| `remove(sessionId, tags)` | 移除指定标签；删除最后一个标签即删除该行 |

标签按输入顺序裁剪并去重；当某个标签裁剪后为空、超过 `maxTagChars`，或使列表超过 `maxTagsPerSession` 时，写入 fail loud。对没有行的会话执行移除是幂等 no-op。

每次写入都先落到存储域，随后为该 `session_tags` domain 发出进程内的 `domain/changed` 通知。没有任何 host 流帧承载标签变更，也没有读取方在监听这类帧：客户端用 `session.tags.list` 读回权威列表，浏览器会话列表在每次列表刷新后按行各拉取一次 `session.tags.list` 来播种其 `tagsBySession` 投影，写入永不产生本地回声。读取失败会让该行保持未打标签状态直到下一次刷新，期间已消失会话的响应会被丢弃。

宿主侧是 `SessionController` 上的三个 `@Remote` 动词 —— `tagsList`、`tagsSet` 与 `tagsRemove` —— 声明于 [`dsh-api-session-controller`](../../api/session-controller/README.zh.md)。pipeline 消费方以本包导出的 `PIPELINE_SESSION_TAGS` 为准，即冻结的 `pipeline_id` / `state_id` / `job_id` / `node_id`。

-----

<a id="understand-the-implementation"></a>
## 理解实现

<details>
<summary>实现内部细节 —— 点击展开</summary>

本节解释注册表背后的设计；可观察行为已由 [使用本包](#use-this-package) 完整覆盖。

### 设计理念

每个会话一行持久记录，经存储域而非会话日志到达。日志是 append-only 的，冷会话无法在不绑定 live owner 的情况下写入；而 domain 表可以接受任意会话 id 的写入——这正是让 runner 能给并非由它持有的会话打标签的原因。注册表自身不持有缓存：`list` 读取 domain 表，`set` 与 `remove` 写入它，domain 的写入链保证持久化先于 `domain/changed` 通知。归一化在任何写入之前完成，因此非法输入不会触碰原有的行。

### 源文件索引

| 文件 | 作用 |
|---|---|
| [`src/index.ts`](src/index.ts) | `SessionTagRegistry` 服务：上限、归一化、`list` / `set` / `remove`，以及 `PIPELINE_SESSION_TAGS` |
| [`src/spec.ts`](src/spec.ts) | `session_tags` domain 声明及其 `tags` 表记录 |
| — | 不发布运行时不变量伴生入口；注册表没有可独立发散的观测可供比对：`list` 读取的正是 `set` 与 `remove` 写入的同一张 `session_tags` domain 行，而该 domain 的 `domain/changed` 事件流即通知契约。 |
| [`tests/session-tags.spec.ts`](tests/session-tags.spec.ts) | 注册表重开后的持久性，以及每次写入各一条 `domain/changed` |

### 存储域用法

该 domain 声明为 `session_tags` version 1，含一张以 `SessionId` 为键的 `tags` 表，记录形态为 `{ tags, updatedAt }`。`Service.init` 经 `ctx.storageDomain` 打开该 domain，并通过 `ctx.effect` 关闭它，因此卸载插件即释放句柄；表句柄保持私有，每次读取都返回已存数组的副本。

</details>

-----

<a id="further-exploration"></a>
## 进一步探索

当包级契约不够用时，阅读这些页面。

- [LMO pipeline 子系统](../../../docs/subsystems/pipeline.zh.md) —— 本数据面所服务的 pipeline 会话与标签名。
- [LMO pipeline seam Agent Note](../../../.agents/notes/implemented/architecture/2026-08-15-lmo-pipeline-cordis-seam.zh.md) —— 为什么持久标签是 domain 表而不是会话事件。
- [`dsh-storage-domain`](../../storage/storage-domain/README.zh.md) —— 注册表所依赖的 domain 表、写入链与 `domain/changed` 契约。
- [`dsh-api-session-controller`](../../api/session-controller/README.zh.md) —— 宿主 RPC 动词与浏览器 `tagsBySession` 投影。
- [Web 应用 bundle](../../bundle/web-app/README.zh.md) —— 挂载本插件 row 的装配。

-----

<a id="model-experience"></a>
## 模型体验

间接可见：经渲染 pipeline 会话的宿主侧与客户端侧消费方；本注册表不注册任何 prompt 或工具 schema。

#### KV Cache 影响

无直接失效；面向模型的消费方自行负责任何请求前缀变更。

## 已知限制与延期工作

<a id="known-limitations-and-deferred-work"></a>

这些限制界定了标签存储的边界与后续工作的起点。

- **除边界外无标签值校验** —— 任何在 `maxTagChars` 内的非空字符串都可存储；pipeline id 格式仍属写入方的契约。
- **无会话存在性校验** —— 允许孤儿标签，由消费方按各自的会话清单过滤。
- **host 流上没有变更通知** —— 浏览器会话列表之外的读取方必须用 `session.tags.list` 重新读取；domain 的 `domain/changed` 事件仅在进程内可见。

<a id="dev-note"></a>
### 开发备注

<details>
<summary>面向维护者的工作上下文 —— 点击展开</summary>

本开发备注是不具权威性的工作上下文：维护者备注与开放问题。

- 标签读取刻意 fail-open：瞬时读取失败会把该行显示为未打标签，而不是让会话列表失败，下一次刷新即可收敛。
- 浏览器消费方把 `pipeline_id` 镜像为字面量，绝不值导入本宿主包；pipeline 契约扩展时，请保持四个冻结名称与 `PIPELINE_SESSION_TAGS` 一致。

</details>
