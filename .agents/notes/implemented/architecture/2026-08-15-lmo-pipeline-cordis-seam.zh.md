# Agent Note: LMO pipeline Cordis seam and durable session tags

Status: implemented

[English](2026-08-15-lmo-pipeline-cordis-seam.md) | 中文

## Problem

DSH 平台迁移需要宿主与模型都能访问 lmo-server 的管线数据（project → pipeline → state → job），并且需要一种持久方式标识哪些普通 DSH 会话属于某个管线 job。两个能力都必须工作，且不能让 Go runner 维护第二套会话权威。

## Decision

仓库新增 `pipeline` 包组，包含三个能力角色：`@deepseek-ai/dsh-lmo-pipeline`（Service Definition `ctx.lmoPipeline`）、`@deepseek-ai/dsh-lmo-pipeline-http`（HMAC HTTP Provider）、`@deepseek-ai/dsh-tool-lmo-pipeline`（面向模型的 `pipeline_*` 工具）。浏览器侧访问沿用现有 apiproxy 领域模式：`pipeline.*` RPC 方法、zod wire schema，以及客户端运行时中暴露为 `ctx.pipelines` 的 React-free `PipelineRuntime`。

HTTP Provider 直接使用 Node 全局 `fetch`。`ctx.web` fetch 是匿名公开资源的 GET-only 检索，没有自定义请求头、没有 POST/PATCH，且把非 2xx 当作结果返回，因此无法承载签名管线请求。Provider 自己负责 `METHOD\nPATH\nQUERY\nBODY_SHA256\nTIMESTAMP\nNONCE` canonical request 与 `X-Secret-Id`/`X-Timestamp`/`X-Nonce`/`X-Signature` 请求头。

会话标签存储在 storage-domain 表中，而不是 session log 事件：log 是 append-only，冷会话无法在不绑定 live owner 的情况下写入；domain 表可以为任意会话 id 写入。`@deepseek-ai/dsh-session-tags` 拥有 `session_tags` domain、`ctx.sessionTags` 注册表，以及冻结的管线标签名 `pipeline_id` / `state_id` / `job_id` / `node_id`。宿主 API proxy 把 `domain/changed` 表写入投影为现有 host stream 的 `host/session-tags-changed` 帧，订阅客户端无需轮询即可更新。

## Alternatives considered

- **让 Provider 走 `ctx.web`** — 否决，因为该 seam 的 fetch 契约无法表达带签名的 POST/PATCH 请求，且把 HTTP 404/401/403 当作检索结果，会抹掉任务冻结的错误分类。
- **把会话标签作为 session 事件追加** — 否决，因为 append-only log 无法在冷会话上变更，且标签变化不应进入对话历史投影。
- **只在客户端内存保存标签状态** — 否决，因为冻结的会话契约要求持久化，并要求通过现有 host 通知通道实现跨标签页/跨进程可见。

## Consequences

- seam 新增四个包与一个 host-stream 帧变体。S2 与 S4 消费 `pipeline.*` wire 类型与 `host/session-tags-changed`，无需导入 lmo-server 传输细节。
- Provider 传输保持在 `ctx.lmoPipeline` 之后可替换；模型工具面在 Provider 切换时保持稳定。
- 标签写入先持久化后通知，删除最后一个标签会删除存储行；`session.tags.list` 仍是重连基线。
- 生成的 Cordis 目录在 `docs/subsystems/pipeline.md` 记录 `ctx.lmoPipeline`，并在 session 子系统页记录 `ctx.sessionTags`。
