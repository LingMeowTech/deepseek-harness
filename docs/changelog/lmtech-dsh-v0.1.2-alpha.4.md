[中文](#cn-lmtech-dsh-v0.1.2-alpha.4) | [English](#en-lmtech-dsh-v0.1.2-alpha.4)

## <a id="cn-lmtech-dsh-v0.1.2-alpha.4">新增功能</a>

- **会话标签（session tags）**：为 `@lingmeow.tech/dsh-session-tags` 提供会话标签能力，新增 `sessionTags` 服务（`session_tags` 域持久化）、`tagsList`/`tagsSet`/`tagsRemove` 三个 RPC 接口，以及浏览器侧 `tagsBySession` 投影 [@Ricardo2001ZG](https://github.com/Ricardo2001ZG)
- **子代理决策答复通道**：为子代理能把待决问题回传会话，`@deepseek-ai/dsh-subagent` 新增 `SubagentRuntime.pendingQuestions` 接口与 `DecisionAskQuestion` 应答面 [@Ricardo2001ZG](https://github.com/Ricardo2001ZG)
- **侧栏 Pipeline 区**：为 `@lingmeow.tech/dsh-lmtech-pipeline` 提供侧栏管线视图挂载点，`@deepseek-ai/dsh-client-ui-sidebar` 新增 `sidebar.pipelines` 槽位接口（root 作用域、单实例），并打通 lmo-pipeline 接缝 [@Ricardo2001ZG](https://github.com/Ricardo2001ZG)
- **HoverCard 固定态**：为右侧栏卡片不随鼠标移出而关闭，新增「钉子」固定态交互 [@Ricardo2001ZG](https://github.com/Ricardo2001ZG)

## 问题修复

- **pi-ai 用量统计漏算 reasoning tokens**：我们接入的 pi-ai provider 在 `mapUsage` 里只映射了输入/输出/缓存，没有透传 `reasoning`，用量与思维链统计因此偏少；本次补上 `reasoningTokens` 字段（含新增用例 `reasoning-usage.spec.ts`） [@Ricardo2001ZG](https://github.com/Ricardo2001ZG)
- **goal 收尾上下文污染结构化输出会话**：`pipeline-worker` 这类结构化输出预设的会话需要保持纯 JSON 交付，原先仍会注入 `<goal_complete>` 收尾指令；本次新增 `isStructuredOutputSession` 判定（`STRUCTURED_OUTPUT_PRESETS`），命中时跳过该指令 [@Ricardo2001ZG](https://github.com/Ricardo2001ZG)
- **web-app 会话标签装配行**：为让会话标签随 `web-app` 一起装配，新增 `session-tags` 行并指向仓内包 `@lingmeow.tech/dsh-session-tags`（会话级 pipeline 标签，供 Pipeline 区做会话过滤）；lmo-pipeline 接缝（`ctx.lmoPipeline` 与 `pipeline_*` 工具）及侧栏 Pipeline 区由 plugins 仓的 `@lingmeow.tech/dsh-lmtech-pipeline-http`、`@lingmeow.tech/dsh-lmtech-pipeline` 经用户 profile 插件清单装配 [@Ricardo2001ZG](https://github.com/Ricardo2001ZG)

## 体验优化

- **会话思维链回传**：`@deepseek-ai/dsh-session` 新增按 `current_turn` 回传思维链的口径（对齐 Codex ReasoningContext），长会话不再整段重发 [@Ricardo2001ZG](https://github.com/Ricardo2001ZG)
- **token-meter 口径对齐**：`@deepseek-ai/dsh-token-meter` 新增压缩体积度量与 `cacheHitRatio` 字段，对齐 codex 统计口径 [@Ricardo2001ZG](https://github.com/Ricardo2001ZG)

## 其他变更

- 新增 `dsh-lmtech-speckit-*` spec-kit 工作流 skills 与 fork 决策文档、Agent Note 三件套；合并态下的 lockfile 与生成物 catalog 随之一并重算 [@Ricardo2001ZG](https://github.com/Ricardo2001ZG)

## <a id="en-lmtech-dsh-v0.1.2-alpha.4">New Features</a>

- **Session tags:** to give `@lingmeow.tech/dsh-session-tags` its tagging capability, add the `sessionTags` service (persisted in the `session_tags` domain), the `tagsList`/`tagsSet`/`tagsRemove` RPCs, and the `tagsBySession` client projection. [@Ricardo2001ZG](https://github.com/Ricardo2001ZG)
- **Subagent decision-answer channel:** to let subagents return pending questions into the session, `@deepseek-ai/dsh-subagent` adds the `SubagentRuntime.pendingQuestions` interface and the `DecisionAskQuestion` answer surface. [@Ricardo2001ZG](https://github.com/Ricardo2001ZG)
- **Sidebar pipeline zone:** to give `@lingmeow.tech/dsh-lmtech-pipeline` a mount point for its pipeline views, `@deepseek-ai/dsh-client-ui-sidebar` adds the `sidebar.pipelines` slot (root scope, single instance) and wires the lmo-pipeline seam. [@Ricardo2001ZG](https://github.com/Ricardo2001ZG)
- **Pinned HoverCard:** to keep right-sidebar cards open after the pointer leaves, add the pin-button state. [@Ricardo2001ZG](https://github.com/Ricardo2001ZG)

## Bug Fixes

- **pi-ai usage missed reasoning tokens:** our pi-ai provider's `mapUsage` mapped input/output/cache only and dropped `reasoning`, under-reporting usage and reasoning-chain totals; pass `reasoningTokens` through (covered by the new `reasoning-usage.spec.ts`). [@Ricardo2001ZG](https://github.com/Ricardo2001ZG)
- **goal wrap-up context polluted structured-output sessions:** sessions on structured-output presets such as `pipeline-worker` must deliver pure JSON, but were still given the `<goal_complete>` closing instruction; add the `isStructuredOutputSession` check (`STRUCTURED_OUTPUT_PRESETS`) and skip it. [@Ricardo2001ZG](https://github.com/Ricardo2001ZG)
- **web-app session-tags bundle row:** to ship session tags with `web-app`, add the `session-tags` row pointing at the in-repo `@lingmeow.tech/dsh-session-tags` (per-session pipeline tags, used to filter sessions in the pipeline zone); the lmo-pipeline seam (`ctx.lmoPipeline` and the `pipeline_*` tools) and the sidebar pipeline zone are assembled from the plugins repo packages `@lingmeow.tech/dsh-lmtech-pipeline-http` and `@lingmeow.tech/dsh-lmtech-pipeline` through the user profile's plugin list. [@Ricardo2001ZG](https://github.com/Ricardo2001ZG)

## Improvements

- **Reasoning chain by turn:** `@deepseek-ai/dsh-session` now returns the reasoning chain by `current_turn` (aligned with Codex ReasoningContext), avoiding full re-sends on long sessions. [@Ricardo2001ZG](https://github.com/Ricardo2001ZG)
- **token-meter alignment:** `@deepseek-ai/dsh-token-meter` adds the compaction volume measurement and the `cacheHitRatio` field, aligned with codex. [@Ricardo2001ZG](https://github.com/Ricardo2001ZG)

## Chores

- Add the `dsh-lmtech-speckit-*` spec-kit workflow skills, fork decision docs, and Agent Note triplets, and regenerate the lockfile and generated catalogs for the merged state. [@Ricardo2001ZG](https://github.com/Ricardo2001ZG)

Full Changelog: [dsh-v0.1.2-alpha.4...lmtech-dsh-v0.1.2-alpha.4](https://github.com/LingMeowTech/deepseek-harness/compare/4e84901e6471b79ec0338099867ebb4606d12bb5...lmtech-dsh-v0.1.2-alpha.4)
