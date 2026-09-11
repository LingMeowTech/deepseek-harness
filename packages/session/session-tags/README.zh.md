# @lingmeow.tech/dsh-session-tags

[English](README.md) | 中文

**`SessionTagRegistry`**（`ctx.sessionTags`）在存储域表中按会话存放持久化的字符串标签。pipeline 会话契约命名四个标签：`pipeline_id`、`state_id`、`job_id` 与 `node_id`。

## 服务 API（`ctx.sessionTags`）

| 成员 | 语义 |
|---|---|
| `list(sessionId)` | 按插入顺序读取已存标签 |
| `set(sessionId, tags)` | 替换完整标签列表；空输入即删除该行 |
| `remove(sessionId, tags)` | 移除指定标签；删除最后一个标签即删除该行 |

每次写入都先经存储域落盘，随后由该域权威的 `domain/changed` 事件流发布变更。宿主 API 代理把该事件流投影为 `host/session-tags-changed` 帧。

## 配置

| 键 | 默认值 | 含义 |
|---|---|---|
| `maxTagsPerSession` | `64` | 单个会话可持有的标签上限 |
| `maxTagChars` | `128` | 单个标签的字符上限 |

标签会被裁剪、去重，并在为空、超长或超出数量上限时 fail loud。

## 模型体验

间接可见：经渲染 pipeline 会话的宿主侧与客户端侧消费方；本注册表不注册任何 prompt 或工具 schema。

#### KV Cache 影响

无直接失效；面向模型的消费方自行负责任何请求前缀变更。

## 已知限制与后续工作

- **除边界外无标签值校验** —— 任何非空字符串都可存储；pipeline id 格式仍属写入方的契约。
- **无会话存在性校验** —— 允许孤儿标签，由消费方按各自的会话清单过滤。
