# Agent Note: 上游同步 024 —— 将 c291e7961a 并入 lmtech-dev

Status: implemented

[English](2026-09-12-024-upstream-sync.md) | 中文

## 问题

本 fork 自己的 13 个提交 —— 015/018/020 的落地，加上 013/016/007 的能力工作 —— 已经包含在基点 `4712eeff98` 之内，而上游在此期间前进了 1090 个提交，到达 `c291e7961a`。上游的工作替换了本 fork 曾经依赖的若干结构：宿主 apiproxy 平面被拆解为 `packages/api/session-controller`（一个由生成式 Remote 声明支撑的聚合），`ui-conversation` 被重建且客户端包进一步拆分，侧栏新增了 `sidebar.panellist` 与 root 作用域的 `main` keyed 插槽，Session 格式写入方版本升到 3，子代理循环新增了 `ContinuableActivationRegistry`。若不带裁决规则地合并，就会复活已被删除的 apiproxy 路径，并让宿主 typecheck 无法通过。

## 决策

在 fork 分支上执行 `git merge c291e7961a`，每一处冲突都以同一条规则裁决 —— **上游优先** —— 并落地为合并提交 `af2a1e07ca`（19 个冲突文件、32 个冲突块；上游 1090 个提交的 hash 与提交信息原样保留，因此不做 squash、rebase 或 cherry-pick）。该规则有三个后果：

- **凡上游结构取代了 fork 机制的，一律以上游结构为准。** `SessionController` 与生成式 Remote 声明取代每一条 apiproxy 路径；子代理循环的 `ContinuableActivationRegistry` 接管可继续子 Activation 的生命周期，取代 fork 自己的提问/投递载体；`sidebar.panellist` 加上 `ui-layout` 的 root 作用域 `main` keyed 插槽，取代 fork 自有的侧栏区域。
- **fork 要保留的内容一律在新 seam 上重落，绝不与新 seam 并置恢复。** 下文八项能力逐项先在合并树上核实（合并是否已保留，或需要重落），然后只落一次。
- **派生物重跑生成，而非手工合并。** 客户端插槽目录、Cordis 目录与 `pnpm-lock.yaml` 以占位或陈旧副本形态随上游进来；生成器是它们唯一的写入方。

Session 格式 3 按原样采用：`packages/core/session/src/types.ts` 中的 `SESSION_FORMAT_VERSION = 3` 是上游的取值，fork 既不提升也不降低；已发布代际的含义以 [`docs/session-format-status.md`](../../../../docs/session-format-status.zh.md) 为权威。已发布 Session 数据保持冻结，两侧分别实测。目标侧未被触碰：`git diff --name-only c291e7961a HEAD -- '*.jsonl*' 'snapshots/**'` 为空，故合并树在这些路径上携带的正是上游字节，本次同步未在其上引入任何改动。基座侧则**并非**未被触碰：在整个合并面（`git diff --name-status 4712eeff98 HEAD -- '*.jsonl*' 'snapshots/**'`，即等价的超集区间）上有 371 条记录为 modified / renamed / deleted —— 这是 fork 基点与目标之间的语料差异，且没有任何一条由 fork 提交引入（上方目标侧检查为空）。因此这是覆盖整个合并面的**超集**口径判定，而非「这些路径从未被触碰」的主张。应用启动面保持唯一 —— 本次同步不新增包 `bin`、不新增可执行源、不新增根级 demo。

### 能力重落

| # | 能力 | 合并后的落点 |
|---|---|---|
| ① | 会话标签 | `packages/session/session-tags`（fork 包，整体保留）加上 `SessionController` 上的三个 `@Remote` 动词 `tagsList` / `tagsSet` / `tagsRemove`；浏览器经 `session.tags.list` 拉取读回持久列表并写入 `SessionManager.tagsBySession`，没有任何 host 流帧承载标签变更 |
| ② | 结构化输出收尾抑制 | `packages/goal/tool-goal/src/wrapup.ts`，由 `structuredOutputPresets` 这个 **`Config` 字段**驱动，让部署自行命名 preset；包内不再有列出 lmtech preset 名的常量 |
| ③ | `reasoningTokens` | `packages/llm/llm-pi-ai/src/stream.ts` 中的通用 wire 映射及其 reasoning 用量测试，保持不变 |
| ④ | `cacheHitRatio` | `packages/llm/token-meter` 的 view 层三处新增（可选投影字段、`tokenUsageViewSchema` 条目、`withCacheHitRatio`）；压缩语义以上游为准 |
| ⑤ | 非当前轮思维链剥离 | `packages/core/session/src/surface.ts` 中的纯函数 `stripReasoning`，由 `deriveMessages` 只对非当前轮 `assistant/message` 应用，逐节点增量缓存保持不动，事件与格式版本不变 |
| ⑥ | 侧栏 pipeline 面板 | 上游的 `sidebar.panellist` 列表加上 root 作用域 `main` keyed 插槽与 `ctx.layout.selectPanel`；fork 自有的侧栏区域已消失，pipeline UI 本体位于 plugins 仓（spec 025） |
| ⑦ | HoverCard 固定 | 在上游组件上重落固定行为，新增 required props `pinLabel` / `unpinLabel`，由每个挂载点经 `t(...)` 传入，取代硬编码中文标签 |
| ⑧ | speckit skills | 十个 `.agents/skills/dsh-lmtech-speckit-*` skill 原样保留；上游没有对应物 |

在这条规则下，fork 的 composer Hindsight 座位与侧栏区域都失去了存在理由：合并保留上游的 composer 座位与上游的面板列表，fork 不再声明自己的那些。

### decision-answer 通道的退役

子代理 decision-answer 通道是建立在 apiproxy 平面之上的，而上游已删除该平面。它的载体、RPC 与 wire 类型都已从本树消失；这次移除及其保留的理由记录在[decision-answer 退役 note](../simplification/2026-09-12-subagent-decision-answer-retirement.zh.md)中。

## 验证

- `pnpm run verify-application-entrypoints`（无新增启动入口）、`pnpm run verify-client-packages`（客户端契约面）与 `pnpm run verify-session-format-catalog`（写入方版本记录）固定上述三条结构主张。
- `pnpm run verify-translation-pairing` 与 `pnpm run verify-agent-note-classification` / `verify-agent-note-format` 固定本次同步的文档面。
- 能力各行由其 focused 套件固定：`packages/session/session-tags`、`packages/goal/tool-goal`、`packages/llm/llm-pi-ai`、`packages/llm/token-meter`、`packages/core/session/tests`、`packages/client/ui-primitives`、`packages/client/ui-sidebar`。

## 备选方案

- **把 fork 提交 rebase 到 `c291e7961a`** —— 否决：fork 提交触碰的是上游已删除的路径（apiproxy、fork 侧栏区域），rebase 仍要逐提交重解同一批冲突，还会重写 fork 自己的已发布历史。
- **以 fork 优先的口径合并** —— 否决：它会把 apiproxy 形态的载体与 fork 侧栏区域恢复到上游替代物旁边，让同一件事存在两套活机制，宿主 typecheck 也不可能通过。
- **暂缓同步，稍后逐能力移植** —— 否决：缺口随每次上游发布扩大，而 fork 自己的包（`session-tags`、pipeline seam 消费方）无论何时同步都必须落到新 seam 上。
- **把合并压成一个 fork 提交（squash）** —— 否决：上游 1090 个提交必须保留 hash 与提交信息，fork 历史才能与上游可比、分歧才可审计。

## 后果

- 未来的上游同步从一个已经讲上游词汇的树出发：一个 controller、一个面板列表、一个 activation 注册表，没有需要重解的 apiproxy 残留。
- fork 的有意分歧如今是一份经实测的小集合（台账：[`docs/lmtech-fork-decisions.md`](../../../../docs/lmtech-fork-decisions.zh.md)），fork 不再需要的两个插槽在台账中登记为被取代，而不是被静默删除。
- 代价是一个大型合并提交，以及覆盖八项能力的人工重落遍；某项能力若其上游 seam 之后变动，必须对该 seam 重新核实，而不能假设合并已经保留它。
- `pnpm-lock.yaml` 是本次同步唯一留给全新 `pnpm install` 重写的文件，因此合并提交与锁文件真值刻意拆成两个提交。
