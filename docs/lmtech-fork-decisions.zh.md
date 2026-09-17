# LMTech fork 决策记录（harness `lmtech-dev`）

[English](lmtech-fork-decisions.md) | 中文

本页是本 fork 相对 `upstream/master` 所保留的**每一处有意分歧**的单一索引，逐条附实测证据与归属裁决。由 spec `020-dsh-plugins-audit-cleanup`（US5）产出；本链门禁为 plugins 仓的 `scripts/check-harness-diff.mjs`。自 T094 终态起，该门禁断言：

- 差异包集合落在 B 类白名单内，且每个 B 类包钉死允许文件集与新增行数上限。上述 024 之前的「16 包外加 [G1](#g1-generated-client-slot-catalog-b-class-derivative) 的生成插槽目录」已不再成立：024 退役了三个 fork 插槽中的两个、收敛了第 11 与第 15 行，并以 `c291e7961a` 为基准重测每一行，故 plugins 仓的白名单须按该实测重新钉定（R7）；
- `015` 归属的 A 类 3 包已从差异中消失，两个已归零登记保持归零（[A1](#a1-spec-015-landing-the-fork-pipeline-copies-leave)、[Z1](#z1-already-zeroed-registrations)）；
- 任何 B 类官方包都不依赖 lmtech 包；
- Draft 归属的 A 类残留以警告（而非失败）报出（[R1](#r1-draft-owned-a-class-residuals-registered-not-executed)）。

两条规则裁决每一条目：

- **A 类** —— lmtech 业务语义进入官方包、官方**已有** seam 被就地改写，或官方包依赖 lmtech 包。这些**离开 fork**：归属 spec 迁出或还原。
- **B 类** —— 官方包确实缺该插入点，fork 只加了插槽声明、类型与渲染点（或等价的最小 seam）。这些**保留**，记录于此。

## 索引

| 条目 | 类型 | 包或插槽 | 裁决 |
| --- | --- | --- | --- |
| [C1](#c1-thirty-row-classification-t094) | 分类表 | 30 个盘点包 | 唯一裁决表，2026-09-12 对 `c291e7961a` 重测：第 1-3 行与第 11-16 行由 024 收敛或重落，三个 fork 插槽退役两个，024 之前的 A/B 计数已被取代 |
| [B1](#b1-packagesclientui-sidebar) | B 类，A+B 混合 | `packages/client/ui-sidebar` | **被 024 取代**：上游 `sidebar.panellist` 取代 fork 的区域；壳共享搜索行仍属 A 类（spec 013 US2），并登记一个无消费方的缺口 |
| [B2](#b2-packagesclientui-conversation) | B 类 | `packages/client/ui-conversation` | **被 024 取代**：fork 的 `conversation.input.hindsight` 座位退役（T041） |
| [B3](#b3-packagesclientui-tool) | B 类，fixture 连带 | `packages/client/ui-tool` | 保留；024 之后残留行只剩一处会话标签 fixture 补字段，而非 priority 覆盖 |
| [B4](#b4-packagesclientui-settings-plugin-inventory) | B 类 | `packages/client/ui-settings-plugin-inventory` | 保留 `settings.plugin.inventory.item` |
| [P1](#p1-packagesllmllm-pi-ai) | B 类 | `packages/llm/llm-pi-ai` | 保留通用 `reasoningTokens` wire 映射 —— 024 按合并结果原样保留（能力③） |
| [P2](#p2-packagessdkserver) | B 类 | `packages/sdk/server` | 保留 `agentPreset` seam 与 Windows 退出排水修复 |
| [P3](#p3-packagesclientui-settings-plugins) | B 类 | `packages/client/ui-settings-plugins` | 保留加宽的值组件导出 |
| [P4](#p4-packagescompactioncompaction-basic) | B 类，无业务语义 | `packages/compaction/compaction-basic` | 保留新增测试 —— 024 后重测为 1 文件，+19 |
| [P5](#p5-packagestest-supportclient-runtime) | B 类，编译连带 | `packages/test-support/client-runtime` | 保留 no-op 双打；随 016 一起删除 |
| [P6](#p6-six-client-packages-with-fixture-coupling) | B 类，编译连带 | `packages/client/{ui-workflow-run,ui-trajectory,ui-theme,ui-subagent,ui-jobs,locale}` | 保留 fixture 字段 —— 它现在连带的是 024 重落的 `tagsBySession` 投影；随 016 一起删除 |
| [P7](#p7-packagesclientui-renderer) | B 类，无业务语义 | `packages/client/ui-renderer` | 保留 `types: ["node"]` 构建配置 |
| [S1](#three-new-slots-minimal-native-extension) | 新增插槽，已退役 | `sidebar.pipelines` | **被 024 取代**：fork 插槽已删除；上游 `sidebar.panellist` 列表加布局 `main` keyed 插槽即插入点 |
| [S2](#three-new-slots-minimal-native-extension) | 新增插槽，已退役 | `conversation.input.hindsight` | **被 024 取代**：fork 座位已删除（T041） |
| [S3](#b4-packagesclientui-settings-plugin-inventory) | 新增插槽 | `settings.plugin.inventory.item` | 最小原生扩展，024 未改动，消费侧镜像在 plugins 仓 |
| [M1](#m1-consumer-side-slot-contract-mirror-us5-c) | 机制 | 插件主包 | 消费侧自持同形状 `src/slots.ts` 镜像、经 `./slots` 消费；024 之后镜像集合只剩一个 fork 插槽（`settings.plugin.inventory.item`） |
| [G1](#g1-generated-client-slot-catalog-b-class-derivative) | B 类，生成产物 | `packages/extensions/cordis-client-runner` | 保留生成的插槽目录；它现在只投影 024 之后仍存在的插槽，键数在重跑目录时重测（T067） |
| [A1](#a1-spec-015-landing-the-fork-pipeline-copies-leave) | A 类，已收敛 | `packages/pipeline/{lmo-pipeline,lmo-pipeline-http,tool-lmo-pipeline}` | 需求按 spec 015 转入 plugins 仓（`packages/dsh-lmtech-pipeline`、`packages/dsh-lmtech-pipeline-http`、`packages/dsh-lmtech-tool-pipeline`），本仓不再实施 —— 2026-09-17 在 `83b9edf642` 实测 `git ls-files packages/pipeline` 输出为空 |
| [R1](#r1-draft-owned-a-class-residuals-registered-not-executed) | A 类，仅登记 | 024 后 9 包 | 归属各自的 spec —— 007 / 011 / 012 / 013 仍为 Draft，016 与 018 已于 2026-09-11 获批（依据主仓 `docs/specs/016-dsh-plugins-session-tags/spec.md` 与 `docs/specs/018-dsh-plugins-lmo-server-client/spec.md` 的 Status 行）；024 已执行 `subagent` 与 `tool-goal` 两半，并随包删除 `lmo-pipeline-worker` 行。017 不在这批登记之列：`packages/client/runtime` 在本仓已无文件（2026-09-17 在 `83b9edf642` 实测 `git ls-files packages/client/runtime` 输出为空），其需求已转入 plugins 仓的 `packages/dsh-lmtech-pipeline-client`；fork 的 `dev` 线仍跟踪该路径 78 个文件，待清 |
| [Z1](#z1-already-zeroed-registrations) | 仅登记，已归零 | `packages/client/ui-workspace`, `packages/api/remotes` | 基线无差异；仅登记 |

## C1 三十行分类表（T094）

<a id="c1-thirty-row-classification-t094"></a>

盘点的范围是三十个包（spec FR-022）。每行都带归属裁决；下表的「差异」列于 2026-09-12 在 024 worktree 重测，其中 `upstream/master` 即目标 `c291e7961a`（在合并提交 `af2a1e07ca` 上执行 `git diff --numstat c291e7961a HEAD -- <包>`，早于 S4 的进行中改动；标记为已收敛的行在其任务落地后归零）。024 收敛或重落了第 1-3 行与第 11-16 行；第 4-6 行与第 17-18 行仍登记给各自的归属 spec（007 / 011 / 012 / 013 仍为 Draft；016 / 018 已于 2026-09-11 获批）；第 7-10 行与第 19-30 行留在 fork。

| # | 包 | 类 | 依据（实测） | 归属（状态） | 差异 |
| --- | --- | --- | --- | --- | --- |
| 1 | `packages/pipeline/lmo-pipeline` | A | lmtech 管线业务（service + tool + invariant）进官方 pipeline 树 | 015（Approved）—— **已收敛**；需求已转入 plugins 仓的 `packages/dsh-lmtech-pipeline`，本仓不再实施 | 0 文件 —— 2026-09-17 在 `83b9edf642` 实测 `git ls-files packages/pipeline` 输出为空 |
| 2 | `packages/pipeline/lmo-pipeline-http` | A | lmtech HTTP 传输面（client + 配置 schema） | 015（Approved）—— **已收敛**；需求已转入 plugins 仓的 `packages/dsh-lmtech-pipeline-http`，本仓不再实施 | 0 文件 —— 2026-09-17 在 `83b9edf642` 实测 `git ls-files packages/pipeline` 输出为空 |
| 3 | `packages/pipeline/tool-lmo-pipeline` | A | lmtech 管线工具（`defineTool` 业务工具） | 015（Approved）—— **已收敛**；需求已转入 plugins 仓的 `packages/dsh-lmtech-tool-pipeline`，本仓不再实施 | 0 文件 —— 2026-09-17 在 `83b9edf642` 实测 `git ls-files packages/pipeline` 输出为空 |
| 4 | `packages/api/session-controller` | A | lmtech 会话控制面（三个 `@Remote` 标签动词 + 客户端 `tagsBySession` 投影） | 011（Draft）—— 登记 | 8 文件，+225/-8 |
| 5 | `packages/session/session-tags` | A | 持久标签注册表及其整个包 | 016（Approved 2026-09-11，依据主仓 `docs/specs/016-dsh-plugins-session-tags/spec.md` 的 Status 行）—— **待清**：本仓副本仍在 | 合并提交 `af2a1e07ca` 处 10 文件，+487；2026-09-17 在 `83b9edf642` 用 `git diff --numstat c291e7961a HEAD -- packages/session/session-tags` 重测：9 文件，+654 |
| 6 | `packages/bundle/lmo-pipeline-worker` | A | 仅属 lmtech 的 bundle 被放进官方 bundle 树 | 018（Approved 2026-09-11，依据主仓 `docs/specs/018-dsh-plugins-lmo-server-client/spec.md` 的 Status 行）/ 012 US3 —— **已收敛**，**两棵树中均已不存在**：该 bundle 在上游与 fork 中都不再有，且 2026-09-17 在 `83b9edf642` 实测 `git ls-files packages/bundle/lmo-pipeline-worker` 输出为空 | 0 文件 |
| 7 | `packages/client/ui-sidebar` | B（A+B 混合） | `sidebar.pipelines` 区域**被 024 删除**（上游 `sidebar.panellist` 列表加布局 `main` keyed 插槽即插入点）；剩下的是 shell 级共享搜索行，属 A 类，其 `searchQuery` 下发在本仓已无消费方（已登记缺口） | 020 FR-024 / 013 US2 —— 区域由 024 退役（T019/T020/T041/T042） | 7 文件，+296/-6 |
| 8 | `packages/client/ui-conversation` | B | fork 的 `conversation.input.hindsight` 座位**被 024 退役**（T041）；剩余行是测试 fixture 对齐 | 020 FR-024 —— 座位由 024 退役 | 8 文件，+27/-2 |
| 9 | `packages/client/ui-tool` | B | 无源码行：残留行只有一处 `tagsBySession` fixture 补字段（会话标签编译连带）；spec 的「toolview priority 覆盖」读法无实测差异支撑（[B3](#b3-packagesclientui-tool)） | 020 FR-024（B 类）/ 016（fixtures）—— **待清**：`tagsBySession` fixture 仍在 `tests/coverage-tails.client.spec.tsx` 中（2026-09-17 在 `83b9edf642` 实测） | 1 文件，+1 |
| 10 | `packages/client/ui-settings-plugin-inventory` | B | `settings.plugin.inventory.item` —— fork 独有插槽 | 020 FR-024 | 5 文件，+129/-5 |
| 11 | `packages/subagent/subagent` | A —— **已由 024 收敛** | `decision-answer.ts`、`pendingQuestions` 与 `list-children` 排序反转均已移除（T032/T033/T036）；理由收编于 [decision-answer 退役 Agent Note](../.agents/notes/implemented/simplification/2026-09-12-subagent-decision-answer-retirement.zh.md) | 007（Draft）+ 013 US4 —— 由 024 收敛 | 合并提交处 4 文件，+267/-15，其后 0 文件 |
| 12 | `packages/client/ui-primitives` | 待评估 —— **keep as B** | 在上游组件上重落 pin，新增 required props `pinLabel` / `unpinLabel` 并经 `t(...)` 接线，取代硬编码中文 label（T055/T056） | 013 US1 —— 由 024 重落 | 3 文件，+118/-10 |
| 13 | `packages/llm/token-meter` | 待评估 —— **keep as B** | 只重落 `cacheHitRatio` 的 view 层三处；压缩语义以上游为准（T051） | 013 US3 —— 由 024 重落 | 3 文件，+31/-1 |
| 14 | `packages/core/session` | 待评估 —— **keep as B** | `stripReasoning` 重落为非当前轮派生，增量缓存保持不动，事件与格式版本不变（T052） | 013 US4 —— 由 024 重落 | 3 文件，+57/-4 |
| 15 | `packages/goal/tool-goal` | A —— **已由 024 收敛** | `STRUCTURED_OUTPUT_PRESETS` 已移除；preset 清单改为 `structuredOutputPresets` 这个 `Config` 字段，收尾抑制保留（T048） | 013 US5 —— 由 024 收敛 | 3 文件，+85/-4 |
| 16 | `packages/bundle/web-app` | 待评估 —— 由 024 更新 | 一条 `@lingmeow.tech/dsh-session-tags` patch row 加配套 workspace 依赖，已删的 pipeline seam row 以注释登记并有测试断言其缺席（T015） | 018（Approved 2026-09-11，依据主仓 `docs/specs/018-dsh-plugins-lmo-server-client/spec.md` 的 Status 行）—— **待改**：`cordis.patch.yml:80-81` 与 `package.json:42` 仍写 `@lingmeow.tech/dsh-session-tags`（2026-09-17 在 `83b9edf642` 实测） | 3 文件，+59 |
| 17 | `packages/boot/app-boot` | 待评估 —— **已由 024 收敛** | `lmo-pipeline-worker` profile 模板在两棵树中均不存在；fork 唯一残留行是断言该 profile 与其 bundle 保持缺席的测试 | 012 US3 / 018 FR-008 —— **已收敛**：唯一残留行是 `tests/worker-profile.spec.ts`（+43），2026-09-17 在 `83b9edf642` 重测 | 1 文件，+43 |
| 18 | `packages/extensions/tool-cordis` | 待评估 | `src/api-catalog.ts` —— lmtech 条目写进官方目录（条目级归属，见 [R1](#r1-draft-owned-a-class-residuals-registered-not-executed)）；024 把 016 条目留给目录重跑清除 | 016 / 007 —— 登记，其中 016 那一半 **待清**：`src/api-catalog.ts` 仍带 `@Remote('tagsList'/'tagsSet'/'tagsRemove')`（1467/1473/1479 行）与 `sessionTags` 服务条目（1959 行），2026-09-17 在 `83b9edf642` 实测 | 1 文件，+84/-3 |
| 19 | `packages/llm/llm-pi-ai` | 待评估 → B | 通用 `reasoningTokens` wire 映射（[P1](#p1-packagesllmllm-pi-ai)） | 020 保留 | 3 文件，+52 |
| 20 | `packages/sdk/server` | 待评估 → B | `agentPreset` seam 与 Windows 退出排水（[P2](#p2-packagessdkserver)） | 020 保留 | 1 文件，+17 |
| 21 | `packages/client/ui-settings-plugins` | 待评估 → B | 加宽的 `SecretField` / `ValueField` 导出（[P3](#p3-packagesclientui-settings-plugins)） | 020 保留 | 1 文件，+2 |
| 22 | `packages/compaction/compaction-basic` | 待评估 → B | 纯测试新增，无产品行为（[P4](#p4-packagescompactioncompaction-basic)） | 020 保留 | 1 文件，+19 |
| 23 | `packages/test-support/client-runtime` | 待评估 → B | 会话标签 no-op 双打，编译连带（[P5](#p5-packagestest-supportclient-runtime)） | 020 暂保留 → **待清**（随 016）：`src/sessions.ts` 仍带 `setSessionTags` / `removeSessionTags` 双打（2026-09-17 在 `83b9edf642` 实测） | 1 文件，+6 |
| 24 | `packages/client/ui-workflow-run` | 待评估 → B | 一行测试 fixture `tagsBySession`（[P6](#p6-six-client-packages-with-fixture-coupling)） | 020 暂保留 → **待清**（随 016）：fixture 仍在（2026-09-17 在 `83b9edf642` 实测） | 1 文件，+1 |
| 25 | `packages/client/ui-trajectory` | 待评估 → B | 一行测试 fixture `tagsBySession`（[P6](#p6-six-client-packages-with-fixture-coupling)） | 020 暂保留 → **待清**（随 016）：fixture 仍在（2026-09-17 在 `83b9edf642` 实测） | 1 文件，+1 |
| 26 | `packages/client/ui-theme` | 待评估 → B | 一行测试 fixture `tagsBySession`（[P6](#p6-six-client-packages-with-fixture-coupling)） | 020 暂保留 → **待清**（随 016）：fixture 仍在（2026-09-17 在 `83b9edf642` 实测） | 1 文件，+1 |
| 27 | `packages/client/ui-subagent` | 待评估 → B | 一行测试 fixture `tagsBySession`（[P6](#p6-six-client-packages-with-fixture-coupling)） | 020 暂保留 → **待清**（随 016）：fixture 仍在（2026-09-17 在 `83b9edf642` 实测） | 1 文件，+1 |
| 28 | `packages/client/ui-jobs` | 待评估 → B | 一行测试 fixture `tagsBySession`（[P6](#p6-six-client-packages-with-fixture-coupling)） | 020 暂保留 → **待清**（随 016）：fixture 仍在（2026-09-17 在 `83b9edf642` 实测） | 1 文件，+1 |
| 29 | `packages/client/locale` | 待评估 → B | 一行测试 fixture `tagsBySession`；inventory 记的 `ui-locale` 即本包（[P6](#p6-six-client-packages-with-fixture-coupling)） | 020 暂保留 → **待清**（随 016）：fixture 仍在（2026-09-17 在 `83b9edf642` 实测） | 1 文件，+1 |
| 30 | `packages/client/ui-renderer` | 待评估 → B | `tsconfig.json` 增 `types: ["node"]`，仅构建配置（[P7](#p7-packagesclientui-renderer)） | 020 保留 | 1 文件，+2 |

另有两处登记补全全貌，但不占分类行：

- 两个已归零的盘点条目（`packages/client/ui-workspace`、`packages/api/remotes`）完全没有差异 —— [Z1](#z1-already-zeroed-registrations)；
- 有一个包在三十个盘点包之外却带差异，按「fork 插槽声明的生成派生」登记 —— [G1](#g1-generated-client-slot-catalog-b-class-derivative)。

## B 类包：保留 + 决策记录

以下每行记录 spec 020 当时作出的裁决；B1 与 B2 的行集此后已被 024 的「上游优先」收口取代（删除了两个 fork 插槽），各行引用的实测证据为 2026-09-12 对 `c291e7961a` 的测量。

### B1 `packages/client/ui-sidebar`

`sidebar.pipelines` 区域已被 024 取代：fork 不再声明该插槽，`ui-sidebar` 渲染上游 root 作用域的 `sidebar.panellist` 列表，对应布局的 root 作用域 `main` keyed 插槽（经 `ctx.layout.selectPanel` 切换）。下表是 fork 在合并提交 `af2a1e07ca` 上、T019/T020/T041 落地之前仍携带的行：

| 行 | 语义 | 类 |
| --- | --- | --- |
| `src/client/SidebarRoot.module.css`、`src/client/locales.ts` | shell 级共享搜索行的样式与文案 | A |
| `src/client/SidebarRoot.tsx` | 共享搜索行加面板列表渲染 | 混合 |
| `tests/*`（3 文件） | 该行的覆盖与已录制快照 | 混合 |

裁决：区域面已消失。上游的面板列表加 root 作用域 `main` keyed 插槽即插入点，故 fork 不再保留自有插槽。shell 级共享搜索行仍属 A 类（spec 013 US2，020 只登记不执行），T042 也把 e2e 车道重新指向它 —— 但区域移除之后，本仓已没有消费方读取 `SidebarRoot` 经 section owner share 下发的 `searchQuery`，且 `SidebarSectionOwnerProps` 自身只声明 `wide` 与 `expandSidebar`。这是一处**已登记缺口**：暴露于 024 S4，其收敛归属 T019/T020/T042 后续，而非本 spec 内的代码修复。

### B2 `packages/client/ui-conversation`

被 024 取代：fork 的 `conversation.input.hindsight` 座位已删除（T041），故 `src/client/apply.ts`、`src/client/contract/slots.ts` 与 `src/client/skeleton/InputBar.tsx` 都不再声明或渲染它。

| 行 | 语义 |
| --- | --- |
| `tests/*`（5 文件） | 与上游套件对齐的 bench 字段与 fixture |

裁决：该座位是退役而非保留。上游 composer 本就声明了它支持的插件输入座位（`conversation.input.plan`、`conversation.input.model` 及其周边的 list 座位），fork 独有的同级座位在本仓没有消费方，而原本要渲染进去的管线 UI 位于 plugins 仓，经上游自有座位注册。

### B3 `packages/client/ui-tool`

2026-09-12（024 之后）实测：`tests/coverage-tails.client.spec.tsx` —— 一处 `tagsBySession` fixture 补字段，**且没有任何源码行**。同步之前记录的五个 card spec 行是上游删除、由本次合并采纳（T022），故 fork 在工具包上的残留差异就是这一行 fixture，spec 的「toolview priority 覆盖」读法在实测差异中仍无对应物。

裁决：按 B 类保留。台账与门禁白名单记录的是类别，而残留行是无产品行为的编译连带，随 spec 016 一并删除。若确有 priority 覆盖，须先补证再据此改写本行。

### B4 `packages/client/ui-settings-plugin-inventory`

裁决：保留，024 未改动。`settings.plugin.inventory.item` 在 `src/client/slot-contract.ts` 声明（owner `PluginInventoryItemOwnerProps` = `{ children?: never }`），经 `src/client/index.ts` 的 `children` 注册，由 `PluginInventorySettingsTab.tsx` 渲染，其行列表由 `src/client/inventory-items.ts` 支撑。T017 对该设置页取上游渲染（`StateDotState` / `TagTone` 引用现来自 ui-primitives），而这是三个 fork 独有插槽里 plugins 仓**原缺本地声明**的唯一一个；消费侧镜像负责补齐（见 [S3](#b4-packagesclientui-settings-plugin-inventory)）。

### P1 `packages/llm/llm-pi-ai`

行：`src/stream.ts`、`tests/adapter.spec.ts`、`tests/reasoning-usage.spec.ts`。

裁决：保留，024 按合并结果原样重落（能力③）。`mapUsage` 透出官方映射丢弃的 `reasoningTokens` wire 字段。这是通用 provider 映射（无 lmtech 词汇），可原样上游化；测试已钉住，本次合并无需改动它。024 后实测 3 文件，+52/-1。

### P2 `packages/sdk/server`

行：`src/index.ts`。

裁决：保留。两处通用修复：官方 server 未暴露的 `agentPreset` 配置 seam，以及 `process.exit` → `process.exitCode`（避免 Windows 原生句柄排水被截断）。均无 lmtech 字样。

### P3 `packages/client/ui-settings-plugins`

行：`src/client/index.ts`。

裁决：保留。官方包只导出 `export type { FieldProps }`；fork 增加 `export { SecretField, ValueField }`。plugins 仓今天因为取不到这两个值组件而在本地重写控件 —— 加宽导出消除该重复，属官方缺失的 seam。

### P4 `packages/compaction/compaction-basic`

行：`tests/compaction-basic.spec.ts`。

裁决：保留；2026-09-12 重测为 1 文件，+19。纯测试新增，无产品行为；按「无业务语义」记为 B 类，024 未触碰。

### P5 `packages/test-support/client-runtime`

行：`src/sessions.ts`。

裁决：暂保留，**待清**，随 spec 016（session-tags 迁出）处理。该文件补 no-op 双打（`setSessionTags`、`removeSessionTags`）使会话标签读写面可编译，2026-09-17 在 `83b9edf642` 实测它们仍在（`src/sessions.ts` 两处都在，快照存储的构造函数带 `tagsBySession`）。inventory 为本行记下的路径 `packages/client/runtime` 属 017，其在本仓已无文件（`git ls-files packages/client/runtime` 输出为空）；该需求已转入 plugins 仓的 `packages/dsh-lmtech-pipeline-client`，本仓不再实施，而 fork 的 `dev` 线仍跟踪其 78 个文件，待清。

### P6 六个 fixture 连带的客户包

<a id="p6-six-client-packages-with-fixture-coupling"></a>

包与行：`packages/client/ui-workflow-run/tests/workflow-run.client.spec.tsx`、`packages/client/ui-trajectory/tests/views.client.spec.tsx`、`packages/client/ui-theme/tests/appearance-row.client.spec.tsx`、`packages/client/ui-subagent/tests/conversation-ui.client.spec.tsx`、`packages/client/ui-jobs/tests/job-list-action.client.spec.tsx`、`packages/client/locale/tests/language-row.client.spec.tsx`。

裁决：暂保留，**待清**，随 spec 016 一并删除。各为一行测试 fixture 补字段（`tagsBySession`），由会话标签面连带 —— 该面已被 024 重落为会话列表快照上的 `tagsBySession` 投影；2026-09-17 在 `83b9edf642` 实测六处都仍在（`git grep -c tagsBySession` 在上述六个文件里各命中一次）。inventory 的 `ui-locale` 实为本 `packages/client/locale`。

### P7 `packages/client/ui-renderer`

行：`tsconfig.json`。

裁决：保留。仅构建配置（`types: ["node"]`）；无运行时或业务语义。

## 三个新增插槽：最小原生扩展

<a id="three-new-slots-minimal-native-extension"></a>

024 退役了其中两个：`sidebar.pipelines`（上游 `sidebar.panellist` 加布局 `main` keyed 插槽即插入点）与 `conversation.input.hindsight`（上游 composer 座位已覆盖该需求）。剩下一个 fork 独有插槽，仍只含三处锚点、无业务代码：

| 插槽 | 声明 | 类型 | 渲染点 | owner props |
| --- | --- | --- | --- | --- |
| `settings.plugin.inventory.item` | `ui-settings-plugin-inventory/src/client/index.ts`（`children`） | `ui-settings-plugin-inventory/src/client/slot-contract.ts` | `ui-settings-plugin-inventory/src/client/PluginInventorySettingsTab.tsx` | `PluginInventoryItemOwnerProps` = `{ children?: never }`（fork 独有） |

## M1 消费侧插槽契约镜像（US5-C）

<a id="m1-consumer-side-slot-contract-mirror-us5-c"></a>

`@deepseek-ai/dsh-client-ui-*` 的 npm 版领先本 fork，永远不会解析到 fork 声明；fork 也无 `@deepseek-ai` scope 发布权。因此由消费侧自持同形状镜像：

1. 插件主包在自己的 `src/slots.ts` 中，把同 key、同 `kind`、同 `scope`、同 owner 形状合并进 `@deepseek-ai/dsh-client-ui-slots`；
2. 该包经 `./slots` 子入口暴露，`-ui` 包消费该入口（`import type {} from '<主包>/slots'`）—— 无需 fork 发版即可类型可解析；
3. fork 保留唯一渲染点；两侧都不得自造同名新类型、不得使用本地 peer link、不得经 `paths` 跨仓解析（constitution 禁止项③）。

024 之后镜像集合只剩一个插槽 `settings.plugin.inventory.item`：fork 为管线区与 Hindsight 座位声明的两个插槽已不存在，其消费侧镜像随之离开。

形状门禁 `scripts/check-slot-contract-mirror.mjs --fork-root <harness>` 位于 plugins 仓（见[复核](#verification)）；它逐条比对镜像与 fork 声明。

## G1 生成的客户端插槽目录（B 类派生）

<a id="g1-generated-client-slot-catalog-b-class-derivative"></a>

`packages/extensions/cordis-client-runner/src/client/slot-catalog.ts` 不在三十个盘点包之列，却带差异：该目录由 `scripts/gen-client-catalog.ts` 从 fork 的客户端插槽声明生成，而 024 之后它只能投影仍然存在的插槽 —— fork 的 `settings.plugin.inventory.item`，加上上游自有的条目（含 `sidebar.panellist`）。024 之前的「key 52 → 55」读数已被取代，不得沿用：请用 `pnpm run gen-client-catalog` 重测，并让 `pnpm run verify-client-catalog` 钉住结果（T067）。该门禁对任何漂移 fail closed，故只要还有 fork 插槽存续，该文件就无法回退；台账因此把它列为派生产物，而不去加宽 B 类集合。

## A1 spec 015 落点：fork 的 pipeline 副本离开本仓

<a id="a1-spec-015-landing-the-fork-pipeline-copies-leave"></a>

`packages/pipeline/lmo-pipeline`、`packages/pipeline/lmo-pipeline-http` 与 `packages/pipeline/tool-lmo-pipeline` 是 fork 新增包（上游**完全没有** `packages/pipeline/`），把 lmtech 管线业务语义带进官方树。spec 015（Approved）已把它们重新安置为 `@lingmeow.tech/dsh-lmtech-pipeline`、`@lingmeow.tech/dsh-lmtech-pipeline-http` 与 `@lingmeow.tech/dsh-lmtech-tool-pipeline`，需求自此位于 plugins 仓的 `packages/dsh-lmtech-pipeline`、`packages/dsh-lmtech-pipeline-http` 与 `packages/dsh-lmtech-tool-pipeline`，本仓不再实施。2026-09-17 在 `83b9edf642` 实测：`git ls-files packages/pipeline` 输出为空，且 `git diff --numstat c291e7961a HEAD -- packages/pipeline/` 无任何行。spec 020 删除 fork 副本及其全部引用：

| 面 | 改动 |
| --- | --- |
| 三个包目录（22 文件） | 删除 |
| `tsconfig.base.json` 别名、`tsconfig.host.json` references | 移除 |
| `packages/bundle/web-app/{package.json,cordis.patch.yml}` | 摘除 `dsh-lmo-pipeline-http` / `dsh-tool-lmo-pipeline` 依赖与 row（该两 row 指向的包已不存在） |
| `packages/bundle/lmo-pipeline-worker/{package.json,cordis.patch.yml,worker.cordis.yml}` | 摘除同样两条依赖与 row；worker bundle 本身此后已从两棵树中离开 |
| `scripts/gen-cordis-catalog.ts` | 摘除已不再被发现的 `lmoPipeline` 页条目与 `Lmo*` 链接条目（该生成器双向 fail-closed） |
| `scripts/verify-package-readme-model-experience.ts` | 摘除两条指向已删路径的 allowlist 条目 |
| `packages/extensions/tool-cordis/src/api-catalog.ts`、`docs/subsystems/pipeline.{md,zh.md}`、`docs/tool-catalog.md` | 用官方生成器重新生成 |
| `pnpm-lock.yaml` | 移除已删工程的 importer 与 link 条目 |

本节所述的 worker bundle 在两棵树中都已不存在：`packages/bundle/lmo-pipeline-worker` 既不在目标树也不在 fork 中，故它的 row 与 `lmo-pipeline-worker` profile 模板是「已消失」而非「仅登记」。harness 仍在挂载的是 web-app bundle 的 `session-tags` row。pipeline seam 三包仍然不在此仓，且[上游同步](../.agents/notes/implemented/architecture/2026-09-12-024-upstream-sync.zh.md)以「上游优先」退役了 fork 自有的侧栏区域与客户端 pipelines service，改由上游面板列表承担，故 `packages/pipeline/**` 继续留在 fork 差异之外。2026-09-17 在 `83b9edf642` 重测，本节点到的两条路径都维持该状态：`packages/pipeline` 与 `packages/bundle/lmo-pipeline-worker` 各自跟踪 0 个文件。017 归属的 `packages/client/runtime` 在本仓同样无文件（`git ls-files packages/client/runtime` 输出为空，`upstream/master` 从未收录该路径），其需求现在位于 plugins 仓的 `packages/dsh-lmtech-pipeline-client`；fork 的 `dev` 线仍跟踪该路径 78 个文件（`git ls-tree -r dev --name-only packages/client/runtime`），待清 —— 而在该线上删除这些文件的提交 `9a4031f2f5`（`fix(build): remove orphan packages/client/runtime left by upstream Runtime removal`）已无任何 ref 指向。

收敛之外还有一处连带需要修复：`packages/bundle/lmo-pipeline-worker/tests/bundle.spec.ts` 仍断言两个已被删除的 row（patch 列表与 worker 配置各一处），故收敛后该包的测试链（`vitest run packages/bundle/lmo-pipeline-worker/tests/bundle.spec.ts`）以两条 "must mount" 断言失败。现已在期望值内联标注删除与归属 spec，该链恢复绿。删除留下的**功能性问题归 spec 018**：worker profile 已不再挂载任何 `ctx.lmoPipeline` seam —— 收敛前的包名在何处都解析不到；由 018 决定按重安置后的插件名补回该 row。**已收敛**：2026-09-17 在 `83b9edf642` 实测，该测试链已随该包离开 —— `packages/bundle/lmo-pipeline-worker` 在本仓跟踪 0 个文件，故 018 在此处的收敛形态是该 bundle 从两棵树中消失；仍待改的是 web-app bundle 的 `session-tags` row 与其依赖（`cordis.patch.yml:80-81`、`package.json:42`）。

## R1 Draft 归属的 A 类残留：只登记，不执行

<a id="r1-draft-owned-a-class-residuals-registered-not-executed"></a>

spec 020 只执行归属 spec 为 Approved（`015`）的 A 类面；024 随后执行其自身 spec 拥有的部分。其余 A 类包一律登记回其归属 spec —— 在归属 spec 实施前，fork 保留其差异；其中 007 / 011 / 012 / 013 仍为 Draft，016 与 018 已于 2026-09-11 获批（依据主仓 `docs/specs/016-dsh-plugins-session-tags/spec.md` 与 `docs/specs/018-dsh-plugins-lmo-server-client/spec.md` 的 Status 行）。2026-09-12 在 024 worktree 对 `c291e7961a` 的实测状态：

| 包 | 文件数 | 归属 spec（状态） | 登记动作 |
| --- | --- | --- | --- |
| `packages/api/session-controller` | 8 | 011（Draft） | 移除对 `dsh-session-tags` 的反向依赖 / RPC 收口；024 保留三个 `@Remote` 标签动词与客户端 `tagsBySession` 投影 |
| `packages/session/session-tags` | 10 | 016（Approved 2026-09-11，依据主仓 `docs/specs/016-dsh-plugins-session-tags/spec.md` 的 Status 行）—— **待清** | 会话标签业务面迁入 plugins 仓；双语 README 随该包一并删除。2026-09-17 在 `83b9edf642` 重测，该包仍在本仓：对 `c291e7961a` 为 9 文件，+654 |
| `packages/subagent/subagent` | 0 | 007（Draft）+ 013 US4 | **已由 024 收敛**：`decision-answer`、`pendingQuestions` 与 `list-children` 排序反转均已移除；理由收编于[退役 Agent Note](../.agents/notes/implemented/simplification/2026-09-12-subagent-decision-answer-retirement.zh.md) |
| `packages/client/ui-primitives` | 3 | 013 US1 | 由 024 重落为 keep-as-B 面：pin 回到上游组件上、新增 required props `pinLabel` / `unpinLabel`，不再有硬编码中文 label（T055/T056） |
| `packages/llm/token-meter` | 3 | 013 US3 | 由 024 重落为 keep-as-B 面：只保留 `cacheHitRatio` view 层三处（T051） |
| `packages/core/session` | 3 | 013 US4 | 由 024 重落为 keep-as-B 面：非当前轮 `stripReasoning`，增量缓存保持不动（T052） |
| `packages/goal/tool-goal` | 3 | 013 US5 | **已由 024 收敛**：preset 清单改为 `Config` 字段，不再硬编码 lmtech preset 名（T048） |
| `packages/boot/app-boot` | 1 | 012 US3 / 018 FR-008 —— **已收敛** | **已由 024 收敛**：`lmo-pipeline-worker` profile 模板在两棵树中均不存在；残留行是断言该缺席的测试。2026-09-17 在 `83b9edf642` 重测，该行为 `tests/worker-profile.spec.ts`，+43 |
| `packages/bundle/web-app` | 3 | 018（Approved 2026-09-11，依据主仓 `docs/specs/018-dsh-plugins-lmo-server-client/spec.md` 的 Status 行）—— **待改** | 024 保留 `session-tags` row 与其依赖；其余 row 收敛归 018。2026-09-17 在 `83b9edf642` 实测两者仍在：`cordis.patch.yml:80-81`（`id: session-tags`、`name: '@lingmeow.tech/dsh-session-tags'`）与 `package.json:42`（`"@lingmeow.tech/dsh-session-tags": "workspace:^"`） |
| `packages/extensions/tool-cordis` | 1 | 016 / 007 —— **待清**（016 那一半） | 条目级归属，2026-09-12 实测 `+84/-3`（`src/api-catalog.ts`）：`lmoPipeline` 的 `SERVICE_API` 条目与其 `Lmo*` 类型条目已经消失，007 的条目（`SubagentRuntime.pendingQuestions`、`DecisionAnswer*` 类型）在退役后重跑目录时消失，只剩 016 的条目（`@Remote('tagsList'/'tagsSet'/'tagsRemove')` 与 `sessionTags` 服务）保持登记 —— 2026-09-17 在 `83b9edf642` 实测这三处与 `sessionTags` 服务条目仍在（1467/1473/1479 行与 1959 行） |

## Z1 已归零登记

<a id="z1-already-zeroed-registrations"></a>

`packages/client/ui-workspace` 与 `packages/api/remotes` 出现在 inventory 的 B 类清单中，但基线差异对两者均为零文件。仅登记；两者都不进入门禁包集合。

## 复核命令

<a id="verification"></a>

本页点名的两个 plugins 仓脚本（`check-harness-diff.mjs`、`check-slot-contract-mirror.mjs`）在两棵 harness 树中都不存在 —— 它们属于 plugins 仓（R7），故下列命令须在持有它们的 worktree 中执行，而它们携带的 B 类白名单须按 C1 的 2026-09-12 实测重新钉定。

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
