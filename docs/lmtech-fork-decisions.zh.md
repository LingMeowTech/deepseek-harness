# LMTech fork 决策记录（harness `lmtech-dev`）

[English](lmtech-fork-decisions.md) | 中文

本页是本 fork 相对 `upstream/master` 所保留的**每一处有意分歧**的单一索引，逐条附实测证据与归属裁决。由 spec `020-dsh-plugins-audit-cleanup`（US5）产出；本链门禁为 plugins 仓的 `scripts/check-harness-diff.mjs`。自 T094 终态起，该门禁断言：

- 差异包集合（`git diff --name-only upstream/master...HEAD -- 'packages/**'`）落在 B 类白名单内 —— 16 包外加 [G1](#g1-generated-client-slot-catalog-b-class-derivative) 的生成插槽目录 —— 且每个 B 类包钉死允许文件集与新增行数上限；
- `015` 归属的 A 类 3 包已从差异中消失，两个已归零登记保持归零（[A1](#a1-spec-015-landing-the-fork-pipeline-copies-leave)、[Z1](#z1-already-zeroed-registrations)）；
- 任何 B 类官方包都不依赖 lmtech 包；
- Draft 归属的 A 类残留以警告（而非失败）报出（[R1](#r1-draft-owned-a-class-residuals-registered-not-executed)）。

两条规则裁决每一条目：

- **A 类** —— lmtech 业务语义进入官方包、官方**已有** seam 被就地改写，或官方包依赖 lmtech 包。这些**离开 fork**：归属 spec 迁出或还原。
- **B 类** —— 官方包确实缺该插入点，fork 只加了插槽声明、类型与渲染点（或等价的最小 seam）。这些**保留**，记录于此。

## 索引

| 条目 | 类型 | 包或插槽 | 裁决 |
| --- | --- | --- | --- |
| [C1](#c1-thirty-row-classification-t094) | 分类表 | 30 个盘点包 | 唯一裁决表：A 6 + B 4 + 待评估 20（A 8 + B 12） |
| [B1](#b1-packagesclientui-sidebar) | B 类，A+B 混合 | `packages/client/ui-sidebar` | 保留 `sidebar.pipelines` region；共享搜索行属 A 类，登记归 013 |
| [B2](#b2-packagesclientui-conversation) | B 类 | `packages/client/ui-conversation` | 保留 `conversation.input.hindsight` |
| [B3](#b3-packagesclientui-tool) | B 类，fixture 连带 | `packages/client/ui-tool` | 保留；残留行是会话标签 fixture 补字段，而非 priority 覆盖 |
| [B4](#b4-packagesclientui-settings-plugin-inventory) | B 类 | `packages/client/ui-settings-plugin-inventory` | 保留 `settings.plugin.inventory.item` |
| [P1](#p1-packagesllmllm-pi-ai) | B 类 | `packages/llm/llm-pi-ai` | 保留通用 `reasoningTokens` wire 映射 |
| [P2](#p2-packagessdkserver) | B 类 | `packages/sdk/server` | 保留 `agentPreset` seam 与 Windows 退出排水修复 |
| [P3](#p3-packagesclientui-settings-plugins) | B 类 | `packages/client/ui-settings-plugins` | 保留加宽的值组件导出 |
| [P4](#p4-packagescompactioncompaction-basic) | B 类，无业务语义 | `packages/compaction/compaction-basic` | 保留新增测试 |
| [P5](#p5-packagestest-supportclient-runtime) | B 类，编译连带 | `packages/test-support/client-runtime` | 保留 no-op 双打；随 016 一起删除 |
| [P6](#p6-six-client-packages-with-fixture-coupling) | B 类，编译连带 | `packages/client/{ui-workflow-run,ui-trajectory,ui-theme,ui-subagent,ui-jobs,locale}` | 保留 fixture 字段；随 016 一起删除 |
| [P7](#p7-packagesclientui-renderer) | B 类，无业务语义 | `packages/client/ui-renderer` | 保留 `types: ["node"]` 构建配置 |
| [S1](#s1-sidebarpipelines) | 新增插槽 | `sidebar.pipelines` | 最小原生扩展，消费侧镜像在 plugins 仓 |
| [S2](#s2-conversationinputhindsight) | 新增插槽 | `conversation.input.hindsight` | 最小原生扩展 |
| [S3](#s3-settingsplugininventoryitem) | 新增插槽 | `settings.plugin.inventory.item` | 最小原生扩展，消费侧镜像在 plugins 仓 |
| [M1](#m1-consumer-side-slot-contract-mirror-us5-c) | 机制 | 插件主包 | 消费侧自持同形状 `src/slots.ts` 镜像、经 `./slots` 消费；fork 仍是唯一渲染点 |
| [G1](#g1-generated-client-slot-catalog-b-class-derivative) | B 类，生成产物 | `packages/extensions/cordis-client-runner` | 保留生成的插槽目录；它是三个新增插槽的投影 |
| [A1](#a1-spec-015-landing-the-fork-pipeline-copies-leave) | A 类，已收敛 | `packages/pipeline/{lmo-pipeline,lmo-pipeline-http,tool-lmo-pipeline}` | 按 spec 015 迁出至 plugins 仓 |
| [R1](#r1-draft-owned-a-class-residuals-registered-not-executed) | A 类，仅登记 | 11 包 | 归属 Draft spec；登记回 PM，020 不代执行 |
| [Z1](#z1-already-zeroed-registrations) | 仅登记，已归零 | `packages/client/ui-workspace`, `packages/api/remotes` | 基线无差异；仅登记 |

## C1 三十行分类表（T094）

盘点的范围是三十个包 —— `A 6 + B 4 + 待评估 20`（spec FR-022）。每行都带实测证据（`git -C <harness> diff --numstat upstream/master...HEAD -- <包>`）与归属裁决。第 1-3 行是本 spec 唯一收敛的行；第 4-6 行与第 11-18 行因归属 spec 仍为 Draft 而登记回 PM；第 7-10 行与第 19-30 行留在 fork。

| # | 包 | 类 | 依据（实测） | 归属（状态） | 差异 |
| --- | --- | --- | --- | --- | --- |
| 1 | `packages/pipeline/lmo-pipeline` | A | lmtech 管线业务（service + tool + invariant）进官方 pipeline 树 | 015（Approved）—— 已收敛 | 0 文件 |
| 2 | `packages/pipeline/lmo-pipeline-http` | A | lmtech HTTP 传输面（client + 配置 schema） | 015（Approved）—— 已收敛 | 0 文件 |
| 3 | `packages/pipeline/tool-lmo-pipeline` | A | lmtech 管线工具（`defineTool` 业务工具） | 015（Approved）—— 已收敛 | 0 文件 |
| 4 | `packages/api/session-controller` | A | lmtech 会话控制面（Remote 贡献点 + 会话路由语义） | 011（Draft）—— 登记 | 8 文件，+225 |
| 5 | `packages/session/session-tags` | A | `SessionTags*` remotes 与持久化标签存储 | 016（Draft）—— 登记 | 10 文件，+487 |
| 6 | `packages/bundle/lmo-pipeline-worker` | A | 仅属 lmtech 的 bundle 被放进官方 bundle 树 | 018（Draft）/ 012 US3 —— 登记 | 16 文件，+1559 |
| 7 | `packages/client/ui-sidebar` | B（A+B 混合） | `sidebar.pipelines` region = 声明 + 类型 + 渲染点；shell 级共享搜索行属 A 类 | 020 FR-024（B 面）/ 013 US2（A 面） | 8 文件，+303 |
| 8 | `packages/client/ui-conversation` | B | `conversation.input.hindsight` —— 官方 composer 没有插件输入座位 | 020 FR-024 | 8 文件，+27 |
| 9 | `packages/client/ui-tool` | B | 无源码行：这六行是一行的 `tagsBySession` fixture 补字段（会话标签编译连带）；spec 的「toolview priority 覆盖」读法无实测差异支撑（[B3](#b3-packagesclientui-tool)） | 020 FR-024（B 类）/ 016（fixtures） | 6 文件，+13 |
| 10 | `packages/client/ui-settings-plugin-inventory` | B | `settings.plugin.inventory.item` —— fork 独有插槽 | 020 FR-024 | 4 文件，+128 |
| 11 | `packages/subagent/subagent` | 待评估 → A | `decision-answer.ts`（新增 236 行）内联进官方 subagent，外加 `list-children` 排序反转 | 007（Draft）+ 013 US4 —— 登记 | 5 文件，+290 |
| 12 | `packages/client/ui-primitives` | 待评估 → A | 无条件注入的 HoverCard pin，外加硬编码中文 `aria-label` | 013 US1 —— 登记 | 3 文件，+118 |
| 13 | `packages/llm/token-meter` | 待评估 → A | 在官方 projection view 内新增派生字段 `cacheHitRatio` | 013 US3 —— 登记 | 3 文件，+31 |
| 14 | `packages/core/session` | 待评估 → A | `stripReasoning`，外加 `deriveMessages` 中硬编码的 Codex `current_turn` 过滤 | 013 US4 —— 登记 | 3 文件，+57 |
| 15 | `packages/goal/tool-goal` | 待评估 → A | `STRUCTURED_OUTPUT_PRESETS = ['pipeline-worker']` —— lmtech preset 名进官方包 | 013 US5 —— 登记 | 3 文件，+85 |
| 16 | `packages/bundle/web-app` | 待评估 → A | 三条 `@lingmeow.tech/*` patch row 与配套依赖 | 018（Draft）—— 登记 | 2 文件，+21 |
| 17 | `packages/boot/app-boot` | 待评估 → A | `lmo-pipeline-worker` profile 模板 | 012 US3 / 018 FR-008 —— 登记 | 1 文件，+5 |
| 18 | `packages/extensions/tool-cordis` | 待评估 → A | `src/api-catalog.ts` —— lmtech 条目写进官方目录（条目级归属，见 [R1](#r1-draft-owned-a-class-residuals-registered-not-executed)） | 015 / 016 / 007 —— 登记 | 1 文件，+84 |
| 19 | `packages/llm/llm-pi-ai` | 待评估 → B | 通用 `reasoningTokens` wire 映射（[P1](#p1-packagesllmllm-pi-ai)） | 020 保留 | 3 文件，+52 |
| 20 | `packages/sdk/server` | 待评估 → B | `agentPreset` seam 与 Windows 退出排水（[P2](#p2-packagessdkserver)） | 020 保留 | 1 文件，+17 |
| 21 | `packages/client/ui-settings-plugins` | 待评估 → B | 加宽的 `SecretField` / `ValueField` 导出（[P3](#p3-packagesclientui-settings-plugins)） | 020 保留 | 1 文件，+2 |
| 22 | `packages/compaction/compaction-basic` | 待评估 → B | 纯测试新增，无产品行为（[P4](#p4-packagescompactioncompaction-basic)） | 020 保留 | 1 文件，+19 |
| 23 | `packages/test-support/client-runtime` | 待评估 → B | 会话标签 no-op 双打，编译连带（[P5](#p5-packagestest-supportclient-runtime)） | 020 暂保留 → 随 016 删除 | 1 文件，+6 |
| 24 | `packages/client/ui-workflow-run` | 待评估 → B | 一行测试 fixture `tagsBySession`（[P6](#p6-six-client-packages-with-fixture-coupling)） | 020 暂保留 → 随 016 删除 | 1 文件，+1 |
| 25 | `packages/client/ui-trajectory` | 待评估 → B | 一行测试 fixture `tagsBySession`（[P6](#p6-six-client-packages-with-fixture-coupling)） | 020 暂保留 → 随 016 删除 | 1 文件，+1 |
| 26 | `packages/client/ui-theme` | 待评估 → B | 一行测试 fixture `tagsBySession`（[P6](#p6-six-client-packages-with-fixture-coupling)） | 020 暂保留 → 随 016 删除 | 1 文件，+1 |
| 27 | `packages/client/ui-subagent` | 待评估 → B | 一行测试 fixture `tagsBySession`（[P6](#p6-six-client-packages-with-fixture-coupling)） | 020 暂保留 → 随 016 删除 | 1 文件，+1 |
| 28 | `packages/client/ui-jobs` | 待评估 → B | 一行测试 fixture `tagsBySession`（[P6](#p6-six-client-packages-with-fixture-coupling)） | 020 暂保留 → 随 016 删除 | 1 文件，+1 |
| 29 | `packages/client/locale` | 待评估 → B | 一行测试 fixture `tagsBySession`；inventory 记的 `ui-locale` 即本包（[P6](#p6-six-client-packages-with-fixture-coupling)） | 020 暂保留 → 随 016 删除 | 1 文件，+1 |
| 30 | `packages/client/ui-renderer` | 待评估 → B | `tsconfig.json` 增 `types: ["node"]`，仅构建配置（[P7](#p7-packagesclientui-renderer)） | 020 保留 | 1 文件，+2 |

另有两处登记补全全貌，但不占分类行：

- 两个已归零的盘点条目（`packages/client/ui-workspace`、`packages/api/remotes`）完全没有差异 —— [Z1](#z1-already-zeroed-registrations)；
- 有一个包在三十个盘点包之外却带差异，按「三个新增插槽的生成派生」登记 —— [G1](#g1-generated-client-slot-catalog-b-class-derivative)。

## B 类包：保留 + 决策记录

以下每行均以 `git -C <harness> diff --stat upstream/master...HEAD -- <包>` 实测；记录的行集与该输出逐条对应。

### B1 `packages/client/ui-sidebar`

| 行 | 语义 | 类 |
| --- | --- | --- |
| `src/client/index.ts` | `sidebar.pipelines` 声明（`kind: 'single'`、`scope: 'root'`） | B |
| `src/client/contract/slots.ts` | `sidebar.pipelines` 类型，owner 为 `SidebarSectionOwnerProps` | B |
| `src/client/SidebarRoot.tsx` | 唯一渲染点 | B |
| `src/client/SidebarRoot.module.css`、`src/client/locales.ts` | shell 级共享搜索行的样式与文案 | A |
| `tests/*`（3 文件） | 两个面的覆盖 | 混合 |

裁决：region 面保留 —— 官方 sidebar 没有插件自有的 section region，新增内容恰好是声明 + 类型 + 渲染点。共享搜索行属 A 类（spec 013 US2 裁定 shell 只留 region、不留共享搜索行）；spec 020 只登记，不触碰。

### B2 `packages/client/ui-conversation`

| 行 | 语义 |
| --- | --- |
| `src/client/apply.ts` | `conversation.input.hindsight` 注册 |
| `src/client/contract/slots.ts` | 插槽类型，owner 沿用官方已导出的 `InputControlOwnerProps` |
| `src/client/skeleton/InputBar.tsx` | 唯一渲染点 |
| `tests/*`（5 文件） | 覆盖 |

裁决：保留。官方 composer 没有插件自有输入控件的插入点；新增内容不含 lmtech 业务逻辑，owner props 复用官方 `InputControlOwnerProps`。

### B3 `packages/client/ui-tool`

2026-09-10 实测行：`tests/coverage-tails.client.spec.tsx`、`tests/diff-card.client.spec.tsx`、`tests/read-card.client.spec.tsx`、`tests/search-card.client.spec.tsx`、`tests/terminal-card.client.spec.tsx`、`tests/web-card.client.spec.tsx` —— 六处一行的 `tagsBySession` fixture 补字段，**且没有任何源码行**：本 fork 已不含 toolview priority 覆盖，故 spec 的「toolview priority 覆盖」读法在实测差异中没有对应物。

裁决：按 B 类保留。台账与门禁白名单记录的是类别，而残留行是无产品行为的编译连带，随 spec 016 一并删除。若确有 priority 覆盖，须先补证再据此改写本行。

### B4 `packages/client/ui-settings-plugin-inventory`

裁决：保留。`settings.plugin.inventory.item` 在 `src/client/slot-contract.ts` 声明（owner `PluginInventoryItemOwnerProps` = `{ children?: never }`），经 `src/client/index.ts` 的 `children` 注册，由 `PluginInventorySettingsTab.tsx` 渲染，其行列表由 `src/client/inventory-items.ts` 支撑（+67）。这是三个 fork 独有插槽里 plugins 仓**原缺本地声明**的唯一一个；消费侧镜像负责补齐（见 [S3](#s3-settingsplugininventoryitem)）。

### P1 `packages/llm/llm-pi-ai`

行：`src/stream.ts`、`tests/adapter.spec.ts`、`tests/reasoning-usage.spec.ts`。

裁决：保留。`mapUsage` 透出官方映射丢弃的 `reasoningTokens` wire 字段。这是通用 provider 映射（无 lmtech 词汇），可原样上游化；测试已钉住。

### P2 `packages/sdk/server`

行：`src/index.ts`。

裁决：保留。两处通用修复：官方 server 未暴露的 `agentPreset` 配置 seam，以及 `process.exit` → `process.exitCode`（避免 Windows 原生句柄排水被截断）。均无 lmtech 字样。

### P3 `packages/client/ui-settings-plugins`

行：`src/client/index.ts`。

裁决：保留。官方包只导出 `export type { FieldProps }`；fork 增加 `export { SecretField, ValueField }`。plugins 仓今天因为取不到这两个值组件而在本地重写控件 —— 加宽导出消除该重复，属官方缺失的 seam。

### P4 `packages/compaction/compaction-basic`

行：`tests/compaction-basic.spec.ts`。

裁决：保留。纯测试新增，无产品行为；按「无业务语义」记为 B 类。

### P5 `packages/test-support/client-runtime`

行：`src/sessions.ts`。

裁决：暂保留。该文件补 no-op 双打（`setSessionTags`、`removeSessionTags`）使会话标签读写面可编译。inventory 记的 `packages/client/runtime` 在上游与本 fork **均不存在**；真实包即本包。随 spec 016（session-tags 迁出）一并删除。

### P6 六个 fixture 连带的客户包

包与行：`packages/client/ui-workflow-run/tests/workflow-run.client.spec.tsx`、`packages/client/ui-trajectory/tests/views.client.spec.tsx`、`packages/client/ui-theme/tests/appearance-row.client.spec.tsx`、`packages/client/ui-subagent/tests/conversation-ui.client.spec.tsx`、`packages/client/ui-jobs/tests/job-list-action.client.spec.tsx`、`packages/client/locale/tests/language-row.client.spec.tsx`。

裁决：暂保留；各为一行测试 fixture 补字段（`tagsBySession`），由会话标签面连带。inventory 的 `ui-locale` 实为本 `packages/client/locale`。随 spec 016 一并删除。

### P7 `packages/client/ui-renderer`

行：`tsconfig.json`。

裁决：保留。仅构建配置（`types: ["node"]`）；无运行时或业务语义。

## 三个新增插槽：最小原生扩展

| 插槽 | 声明 | 类型 | 渲染点 | owner props |
| --- | --- | --- | --- | --- |
| `sidebar.pipelines` | `ui-sidebar/src/client/index.ts` | `ui-sidebar/src/client/contract/slots.ts` | `ui-sidebar/src/client/SidebarRoot.tsx` | `SidebarSectionOwnerProps`（`{ wide; expandSidebar }`，官方已导出） |
| `conversation.input.hindsight` | `ui-conversation/src/client/apply.ts` | `ui-conversation/src/client/contract/slots.ts` | `ui-conversation/src/client/skeleton/InputBar.tsx` | `InputControlOwnerProps`（官方已导出） |
| `settings.plugin.inventory.item` | `ui-settings-plugin-inventory/src/client/index.ts`（`children`） | `ui-settings-plugin-inventory/src/client/slot-contract.ts` | `ui-settings-plugin-inventory/src/client/PluginInventorySettingsTab.tsx` | `PluginInventoryItemOwnerProps` = `{ children?: never }`（fork 独有） |

每个插槽恰好只含这三处锚点，无业务代码。三个插槽的唯一渲染点仍在 fork。

## M1 消费侧插槽契约镜像（US5-C）

`@deepseek-ai/dsh-client-ui-*` 的 npm 版领先本 fork，永远不会解析到 fork 声明；fork 也无 `@deepseek-ai` scope 发布权。因此由消费侧自持同形状镜像：

1. 插件主包在自己的 `src/slots.ts` 中，把同 key、同 `kind`、同 `scope`、同 owner 形状合并进 `@deepseek-ai/dsh-client-ui-slots`；
2. 该包经 `./slots` 子入口暴露，`-ui` 包消费该入口（`import type {} from '<主包>/slots'`）—— 无需 fork 发版即可类型可解析；
3. fork 保留唯一渲染点；两侧都不得自造同名新类型、不得使用本地 peer link、不得经 `paths` 跨仓解析（constitution 禁止项③）。

plugins 仓的形状门禁 `scripts/check-slot-contract-mirror.mjs --fork-root <harness>` 逐条比对镜像与 fork 声明。

## G1 生成的客户端插槽目录（B 类派生）

`packages/extensions/cordis-client-runner/src/client/slot-catalog.ts` 不在三十个盘点包之列，却带差异：该目录由 `scripts/gen-client-catalog.ts` 从 fork 的客户端插槽声明生成，而三个新增插槽（[S1](#s1-sidebarpipelines)、[S2](#s2-conversationinputhindsight)、[S3](#s3-settingsplugininventoryitem)）恰好新增三条目（key 52 → 55，+97/-4 行；实测于 015 收敛后官方生成器重跑之后）。`pnpm run verify-client-catalog` 对任何漂移 fail closed，故这些插槽存续期间该文件无法回退；门禁因此把它列为派生产物，而不去加宽十六包 B 类集合。

## A1 spec 015 落点：fork 的 pipeline 副本离开本仓

`packages/pipeline/lmo-pipeline`、`packages/pipeline/lmo-pipeline-http` 与 `packages/pipeline/tool-lmo-pipeline` 是 fork 新增包（上游**完全没有** `packages/pipeline/`），把 lmtech 管线业务语义带进官方树。spec 015（Approved）已把它们重新安置为 `@lingmeow.tech/dsh-lmtech-pipeline`、`@lingmeow.tech/dsh-lmtech-pipeline-http` 与 `@lingmeow.tech/dsh-lmtech-tool-pipeline`，故 spec 020 删除 fork 副本及其全部引用：

| 面 | 改动 |
| --- | --- |
| 三个包目录（22 文件） | 删除 |
| `tsconfig.base.json` 别名、`tsconfig.host.json` references | 移除 |
| `packages/bundle/web-app/{package.json,cordis.patch.yml}` | 摘除 `dsh-lmo-pipeline-http` / `dsh-tool-lmo-pipeline` 依赖与 row（该两 row 指向的包已不存在） |
| `packages/bundle/lmo-pipeline-worker/{package.json,cordis.patch.yml,worker.cordis.yml}` | 摘除同样两条依赖与 row；worker bundle 其余内容仍归 spec 018 |
| `scripts/gen-cordis-catalog.ts` | 摘除已不再被发现的 `lmoPipeline` 页条目与 `Lmo*` 链接条目（该生成器双向 fail-closed） |
| `scripts/verify-package-readme-model-experience.ts` | 摘除两条指向已删路径的 allowlist 条目 |
| `packages/extensions/tool-cordis/src/api-catalog.ts`、`docs/subsystems/pipeline.{md,zh.md}`、`docs/tool-catalog.md` | 用官方生成器重新生成 |
| `pnpm-lock.yaml` | 移除已删工程的 importer 与 link 条目 |

worker bundle 其余 row（`session-tags`、`pipeline-worker-tags`）与 `lmo-pipeline-worker` profile 保持原样：它们归属 Draft 的 018/012，此处只登记。

收敛之外还有一处连带需要修复：`packages/bundle/lmo-pipeline-worker/tests/bundle.spec.ts` 仍断言两个已被删除的 row（patch 列表与 worker 配置各一处），故收敛后该包的测试链（`vitest run packages/bundle/lmo-pipeline-worker/tests/bundle.spec.ts`）以两条 "must mount" 断言失败。现已在期望值内联标注删除与归属 spec，该链恢复绿。删除留下的**功能性问题归 spec 018**：worker profile 已不再挂载任何 `ctx.lmoPipeline` seam —— 收敛前的包名在何处都解析不到；由 018 决定按重安置后的插件名补回该 row。

## R1 Draft 归属的 A 类残留：只登记，不执行

spec 020 只执行归属 spec 为 Approved（`015`）的 A 类面。其余 A 类包归属 Draft spec，一律登记回 PM 而不在此改动 —— 在其归属 spec 落地前，fork 保留其差异。2026-09-10 实测状态（`grep -l 'Status\*\*: Approved' docs/specs/*/spec.md` → 003 / 015 / 020 / 021 / 022）：

| 包 | 文件数 | 归属 spec（状态） | 登记动作 |
| --- | --- | --- | --- |
| `packages/api/session-controller` | 8 | 011（Draft） | 移除对 `dsh-session-tags` 的反向依赖 / RPC 收口 |
| `packages/session/session-tags` | 10 | 016（Draft） | 会话标签业务面迁入 plugins 仓；为 T094 配对门禁补的双语 README 随该包一并删除 |
| `packages/bundle/lmo-pipeline-worker` | 16 | 018（Draft）/ 012 US3 | worker 定义侧移出 dsh、归 lmo runner 侧；并按重安置后的插件名补回 `ctx.lmoPipeline` seam row（收敛前的包名解析不到，故收敛时删除 —— 见 [A1](#a1-spec-015-landing-the-fork-pipeline-copies-leave)） |
| `packages/subagent/subagent` | 5 | 007（Draft）+ 013 US4 | `decision-answer` 迁出；`list-children` 排序还原 |
| `packages/client/ui-primitives` | 3 | 013 US1 | 还原无条件 pin 与硬编码中文 label |
| `packages/llm/token-meter` | 3 | 013 US3 | 还原派生的 `cacheHitRatio` projection |
| `packages/core/session` | 3 | 013 US4 | 还原硬编码的 Codex `current_turn` 过滤 |
| `packages/goal/tool-goal` | 3 | 013 US5 | `pipeline-worker` preset 映射上移插件侧 |
| `packages/boot/app-boot` | 1 | 012 US3 / 018 FR-008 | 删除 `lmo-pipeline-worker` profile 模板 |
| `packages/bundle/web-app` | 2 | 018（Draft） | 余下 row 的 `name` codemod 到独立包 + 依赖段收敛 |
| `packages/extensions/tool-cordis` | 1 | 015 / 016 / 007 | 条目级归属，2026-09-10 实测 `+84/-3`（`src/api-catalog.ts`）：`lmoPipeline` 的 `SERVICE_API` 条目与其 `Lmo*` 类型条目**已经消失** —— 015 收敛时重跑的官方生成器摘掉了这些悬空引用（收敛前读数为 `+223/-3`）—— 故只剩 016 的条目（`@Remote('tagsList'/'tagsSet'/'tagsRemove')` 与 `sessionTags` 服务）与 007 的条目（`SubagentRuntime.pendingQuestions`、`DecisionAnswer*` 类型）保持登记 |

## Z1 已归零登记

`packages/client/ui-workspace` 与 `packages/api/remotes` 出现在 inventory 的 B 类清单中，但基线差异对两者均为零文件。仅登记；两者都不进入门禁包集合。

## 复核命令

```bash
# from dsh-lmtech-plugins/worktree/020-impl — expected exit 0 (warnings only for the Draft-owned rows of R1)
node scripts/check-harness-diff.mjs --harness ../../../../deepseek-harness/worktree/lmtech-dev ; echo "exit=$?"
node scripts/check-harness-diff.mjs --list
node scripts/check-slot-contract-mirror.mjs --fork-root ../../../../deepseek-harness/worktree/lmtech-dev
# from this worktree — expected green: editing this pair must leave every generated catalog in sync
pnpm run verify-cordis-catalog && pnpm run verify-client-catalog && pnpm run verify-cordis-inspect-catalog
pnpm run verify-tool-catalog && pnpm run verify-tsconfig-paths && pnpm run verify-translation-pairing
```

`verify-cordis-catalog` 比较的是工作区字节，故它读取的源文件必须在检出中保持 LF：CRLF 的工作副本（Windows 编辑器、未经过滤的拷贝）会让生成页被判为 stale，即便 `git diff` 报无改动（`eol=lf` 属性把该差异归一化掉了）。把这些源文件规范化为 LF 即可在不改动任何已记录内容的前提下恢复绿。
