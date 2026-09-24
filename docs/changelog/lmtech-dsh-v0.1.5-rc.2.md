[中文](#cn-lmtech-dsh-v0.1.5-rc.2) | [English](#en-lmtech-dsh-v0.1.5-rc.2)

## <a id="cn-lmtech-dsh-v0.1.5-rc.2">新增功能</a>

- **会话格式演进（破坏性）**：`@deepseek-ai/dsh-session` 新增已发布格式的迁移链路、把助手流按格式 v2 内嵌，并把 V2 提示词迁入 V3 的 system surface；`@deepseek-ai/dsh-session-persistence` 改为句柄化接缝与生命周期持有的写入路径（见 `feat(session)!` 与 `refactor(session-persistence)!`） [@Ricardo2001ZG](https://github.com/Ricardo2001ZG)
- **同会话消息编辑**：`@deepseek-ai/dsh-session`、`@deepseek-ai/dsh-agent` 与 web 侧协同支持在同一会话内编辑历史消息并重放 [@Ricardo2001ZG](https://github.com/Ricardo2001ZG)
- **持久化写入所有权租约**：`@deepseek-ai/dsh-session-persistence-jsonl` 新增跨进程写入所有权租约，避免多进程同时写同一会话日志 [@Ricardo2001ZG](https://github.com/Ricardo2001ZG)
- **客户端界面扩充**：文档预览与侧栏默认项、全局侧栏面板、共享文件类型图标、composer 菜单新增 plan/compact/shield 图标、统计条改为双图标按钮与可点击对话框、可点击链接语言统一；新增 Dockkit 可逆停靠引擎、响应式右栏与会话头角槽 [@Ricardo2001ZG](https://github.com/Ricardo2001ZG)
- **文件与资源面**：`@deepseek-ai/dsh-fs` / `fs-local` / `fs-e2b` 新增有界字节区间读取，客户端新增资源注册表与保留订阅，workspace 文件操作经 Remote 暴露给客户端 [@Ricardo2001ZG](https://github.com/Ricardo2001ZG)
- **工具与运行时**：`str_replace_editor` 在 base/sdk/minimal 与默认工具集中关闭；新增预编译 Node-API flock、macOS x64 Python 运行时轮子，CLI 支持由随包模板创建 profile [@Ricardo2001ZG](https://github.com/Ricardo2001ZG)
- **模型与网络**：Chat Completions 默认模型改为 DeepSeek V41 Flash（同时保留 V4 系列并恢复 V4 Flash Vision catalog）；所有出站请求统一走配置代理 [@Ricardo2001ZG](https://github.com/Ricardo2001ZG)

## 问题修复

- **子进程与终端（73 条 `fix(subprocess)`）**：Linux scope 已无进程仍被判为活跃、取消在 bootstrap 消费前未保留、PTY scope 启动环境未规范化、原生 runner bootstrap 未隔离等 [@Ricardo2001ZG](https://github.com/Ricardo2001ZG)
- **会话与格式（21 条 `fix(session)`）**：V3 迁移前未审计全部历史内容载体、未知必需事件未保留、相邻迁移未统一 V3 信封、空队列编辑未拒绝等 [@Ricardo2001ZG](https://github.com/Ricardo2001ZG)
- **Web 与客户端（48 + 29 条）**：待决与已链接技能预览未处理、内联文件预览标签不统一、composer 引用高度与基线、侧栏文档预览滚动位置、图标校验门禁等 [@Ricardo2001ZG](https://github.com/Ricardo2001ZG)
- **模型接入（9 条 `fix(llm)`）**：重放时未保留 Anthropic 已解析模型、模型发现范围过宽等 [@Ricardo2001ZG](https://github.com/Ricardo2001ZG)
- **桌面端（10 条 `fix(desktop)`）**：并行公证检查、启动恢复与打包重建可重试、生成工程允许 `fs-ext` 等 [@Ricardo2001ZG](https://github.com/Ricardo2001ZG)

## 体验优化

- **会话与持久化迁移流式化**：已发布 v0→v2 迁移、迁移发布与校验、历史读取的预先准备均改为流式，长会话迁移开销明显下降 [@Ricardo2001ZG](https://github.com/Ricardo2001ZG)
- **嵌入助手流逐条读取**：`perf(llm,host)` 按压缩记录读取内嵌的助手流，不再整段解码 [@Ricardo2001ZG](https://github.com/Ricardo2001ZG)
- **客户端避免重放已结束的流**：`perf(client)` 对已结束的助手流不再重放 [@Ricardo2001ZG](https://github.com/Ricardo2001ZG)
- **agent-loop 复用消息冻结**：`perf(agent-loop)` 复用已验证的消息冻结结果 [@Ricardo2001ZG](https://github.com/Ricardo2001ZG)
- **脚本门禁提速**：`perf(scripts)` 只解析可能命中违规的文件 [@Ricardo2001ZG](https://github.com/Ricardo2001ZG)

## 其他变更

- **插件 manifest 声明**：包 manifest 声明插件格式、标签与宿主兼容性，并把包元数据与公开 DSH 字段分离（`feat(manifest)` / `refactor(manifest)`） [@Ricardo2001ZG](https://github.com/Ricardo2001ZG)
- **构建与持续集成**：客户端静态门禁去重、静态评审归属自动化，以及托管镜像与自托管执行器相关的稳定化提交 [@Ricardo2001ZG](https://github.com/Ricardo2001ZG)
- **技能与工作流**：新增以 Playwright 录制浏览器画面的技能、以证据驱动的性能优化工作流技能 [@Ricardo2001ZG](https://github.com/Ricardo2001ZG)
- **快照与测试夹具**：PowerShell 会话夹具与就绪判定批量更新，浏览器时区等易变因素在快照中被固定 [@Ricardo2001ZG](https://github.com/Ricardo2001ZG)
- **文档与本地化**：README 双语校对与 BibTeX 引用、生成目录的双语源链接统一、i18n 术语打磨 [@Ricardo2001ZG](https://github.com/Ricardo2001ZG)
- **依赖与版本跟随**：pi-ai 升级到 0.85.1，多处包跟随 `0.1.2-alpha.5` 与 master 的版本号 [@Ricardo2001ZG](https://github.com/Ricardo2001ZG)

## <a id="en-lmtech-dsh-v0.1.5-rc.2">New Features</a>

- **Session format evolution (breaking):** `@deepseek-ai/dsh-session` adds the released-format migration path, embeds assistant streams in format v2, and moves V2 prompts into the V3 system surface; `@deepseek-ai/dsh-session-persistence` moves to a handle-based seam with a lifecycle-owned write path (see `feat(session)!` and `refactor(session-persistence)!`). [@Ricardo2001ZG](https://github.com/Ricardo2001ZG)
- **Same-session message editing:** `@deepseek-ai/dsh-session`, `@deepseek-ai/dsh-agent` and the web face support editing an earlier message in the same session and replaying it. [@Ricardo2001ZG](https://github.com/Ricardo2001ZG)
- **Cross-process write-ownership lease:** `@deepseek-ai/dsh-session-persistence-jsonl` adds a write-ownership lease so two processes cannot write one session log at once. [@Ricardo2001ZG](https://github.com/Ricardo2001ZG)
- **Client surface expansion:** document previews and sidebar defaults, global sidebar panels, a shared file-type icon set, new plan/compact/shield glyphs in the composer menu, the stats strip replaced by two icon pills with click-open dialogs, unified clickable-link language, plus the reversible Dockkit docking engine, a responsive right column, and the session header corner slot. [@Ricardo2001ZG](https://github.com/Ricardo2001ZG)
- **Files and resources:** bounded byte-range reads in `@deepseek-ai/dsh-fs` / `fs-local` / `fs-e2b`, a Client resource registry with retained subscriptions, and workspace file operations exposed to the Client over Remote. [@Ricardo2001ZG](https://github.com/Ricardo2001ZG)
- **Tools and runtime:** `str_replace_editor` is off in base/sdk/minimal and the default tool set; prebuilt Node-API flock, macOS x64 Python runtime wheels, and CLI profile creation from shipped templates. [@Ricardo2001ZG](https://github.com/Ricardo2001ZG)
- **Models and network:** Chat Completions defaults to DeepSeek V41 Flash while the V4 line stays available and the V4 Flash Vision catalog entry returns; every outbound request goes through the configured proxy. [@Ricardo2001ZG](https://github.com/Ricardo2001ZG)

## Bug Fixes

- **Subprocess and terminals (73 `fix(subprocess)` commits):** a Linux scope left active with no processes, cancellation lost before bootstrap consumption, PTY scope launcher environment, native runner bootstrap isolation, and more. [@Ricardo2001ZG](https://github.com/Ricardo2001ZG)
- **Session and format (21 `fix(session)` commits):** every historical content carrier is now audited before V3 migration, unknown required events survive vocabulary validation, V3 envelopes go through adjacent migration, empty queue edits are rejected. [@Ricardo2001ZG](https://github.com/Ricardo2001ZG)
- **Web and client (48 + 29 commits):** pending and linked skill previews, inline file-preview labels, composer reference heights and baselines, sidebar document-preview scroll position, icon validation gates. [@Ricardo2001ZG](https://github.com/Ricardo2001ZG)
- **Model access (9 `fix(llm)` commits):** the Anthropic resolved model is retained during replay, model discovery is scoped to the discovery path. [@Ricardo2001ZG](https://github.com/Ricardo2001ZG)
- **Desktop (10 `fix(desktop)` commits):** parallel notarization checks, retryable startup recovery and package rebuilds, `fs-ext` in generated projects. [@Ricardo2001ZG](https://github.com/Ricardo2001ZG)

## Improvements

- **Streamed session and persistence migrations:** released v0-to-v2 migrations, migration publication and verification, and historical read preparation all stream now, so long sessions migrate far cheaper. [@Ricardo2001ZG](https://github.com/Ricardo2001ZG)
- **Embedded assistant streams read per record:** `perf(llm,host)` reads embedded streams per compact record instead of decoding them whole. [@Ricardo2001ZG](https://github.com/Ricardo2001ZG)
- **Client avoids replaying settled streams:** `perf(client)` stops replaying assistant streams that already finished. [@Ricardo2001ZG](https://github.com/Ricardo2001ZG)
- **agent-loop reuses message freezes:** `perf(agent-loop)` reuses proven message freezes per agent. [@Ricardo2001ZG](https://github.com/Ricardo2001ZG)
- **Faster script gates:** `perf(scripts)` parses only the files a violation could live in. [@Ricardo2001ZG](https://github.com/Ricardo2001ZG)

## Chores

- **Plugin manifest declarations:** package manifests declare the plugin format, tags, and host compatibility, and separate package metadata from public DSH fields (`feat(manifest)` / `refactor(manifest)`). [@Ricardo2001ZG](https://github.com/Ricardo2001ZG)
- **Build and CI:** deduplicated client static gates, automated static-review ownership, and stabilization work around hosted and self-hosted runners. [@Ricardo2001ZG](https://github.com/Ricardo2001ZG)
- **Skills and workflows:** a skill that records browser sessions as Playwright video, and an evidence-driven performance-optimization workflow skill. [@Ricardo2001ZG](https://github.com/Ricardo2001ZG)
- **Snapshots and fixtures:** batch updates to the PowerShell session fixtures and readiness expectations, pinning volatile factors such as the browser timezone in snapshots. [@Ricardo2001ZG](https://github.com/Ricardo2001ZG)
- **Docs and localization:** proofreading the bilingual README corpus with BibTeX citations, aligning generated catalog source links across locales, and polishing i18n terminology. [@Ricardo2001ZG](https://github.com/Ricardo2001ZG)
- **Dependencies and version follow-ups:** pi-ai upgraded to 0.85.1, with several packages following the `0.1.2-alpha.5` and master version bumps. [@Ricardo2001ZG](https://github.com/Ricardo2001ZG)

Full Changelog: [dsh-v0.1.2-alpha.4...lmtech-dsh-v0.1.5-rc.2](https://github.com/LingMeowTech/deepseek-harness/compare/lmtech-dsh-v0.1.2-alpha.4...lmtech-dsh-v0.1.5-rc.2)
