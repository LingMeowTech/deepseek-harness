# LMTech fork decisions (harness `lmtech-dev`)

English | [中文](lmtech-fork-decisions.zh.md)

This page is the single index of every deliberate divergence this fork keeps from `upstream/master`, with the measured evidence and the owning decision for each one. Spec `020-dsh-plugins-audit-cleanup` (US5) produced it; the lane's gate is `scripts/check-harness-diff.mjs` in the plugins repository. Starting from the T094 terminal state the gate asserts that:

- the diff's package set (`git diff --name-only upstream/master...HEAD -- 'packages/**'`) stays inside the B-class whitelist — 16 packages plus the generated slot catalog of [G1](#g1-generated-client-slot-catalog-b-class-derivative) — with each B-class package pinned to an allowed file set and an added-line ceiling;
- the three `015`-owned A-class packages are gone from the diff and the two already-zeroed registrations stay zeroed ([A1](#a1-spec-015-landing-the-fork-pipeline-copies-leave), [Z1](#z1-already-zeroed-registrations));
- no B-class official package depends on an lmtech package;
- the Draft-owned A-class residuals are reported as warnings, not failures ([R1](#r1-draft-owned-a-class-residuals-registered-not-executed)).

Two rules decide every entry:

- **A class** — lmtech business semantics inside an official package, an existing official seam changed in place, or an official package depending on an lmtech package. These leave the fork: the owning spec migrates them out, or reverts them.
- **B class** — the official package genuinely lacks the insertion point, and what the fork adds is only a slot declaration, a type, and a render point (or an equivalent minimal seam). These stay, recorded here.

## Index

| Entry | Kind | Package or slot | Decision |
| --- | --- | --- | --- |
| [C1](#c1-thirty-row-classification-t094) | Classification | 30 inventoried packages | The single verdict table: A 6 + B 4 + pending 20 (A 8 + B 12) |
| [B1](#b1-packagesclientui-sidebar) | B class, A+B mixed | `packages/client/ui-sidebar` | Keep the `sidebar.pipelines` region; the shared search row is A class, registered to spec 013 |
| [B2](#b2-packagesclientui-conversation) | B class | `packages/client/ui-conversation` | Keep `conversation.input.hindsight` |
| [B3](#b3-packagesclientui-tool) | B class, fixture coupling | `packages/client/ui-tool` | Keep; the residual rows are session-tag fixture additions, not a priority override |
| [B4](#b4-packagesclientui-settings-plugin-inventory) | B class | `packages/client/ui-settings-plugin-inventory` | Keep `settings.plugin.inventory.item` |
| [P1](#p1-packagesllmllm-pi-ai) | B class | `packages/llm/llm-pi-ai` | Keep the generic `reasoningTokens` wire mapping |
| [P2](#p2-packagessdkserver) | B class | `packages/sdk/server` | Keep the `agentPreset` seam and the Windows exit-drain fix |
| [P3](#p3-packagesclientui-settings-plugins) | B class | `packages/client/ui-settings-plugins` | Keep the widened value-component export |
| [P4](#p4-packagescompactioncompaction-basic) | B class, no business semantics | `packages/compaction/compaction-basic` | Keep the added test |
| [P5](#p5-packagestest-supportclient-runtime) | B class, compile coupling | `packages/test-support/client-runtime` | Keep the no-op double; delete together with spec 016 |
| [P6](#p6-six-client-packages-with-fixture-coupling) | B class, compile coupling | `packages/client/{ui-workflow-run,ui-trajectory,ui-theme,ui-subagent,ui-jobs,locale}` | Keep the fixture field; delete together with spec 016 |
| [P7](#p7-packagesclientui-renderer) | B class, no business semantics | `packages/client/ui-renderer` | Keep the `types: ["node"]` build setting |
| [S1](#s1-sidebarpipelines) | New slot | `sidebar.pipelines` | Minimal native extension, consumer-side mirror in the plugins repository |
| [S2](#s2-conversationinputhindsight) | New slot | `conversation.input.hindsight` | Minimal native extension |
| [S3](#s3-settingsplugininventoryitem) | New slot | `settings.plugin.inventory.item` | Minimal native extension, consumer-side mirror in the plugins repository |
| [M1](#m1-consumer-side-slot-contract-mirror-us5-c) | Mechanism | plugin main packages | The consumer owns a same-shape `src/slots.ts` mirror consumed through `./slots`; the fork stays the only render point |
| [G1](#g1-generated-client-slot-catalog-b-class-derivative) | B class, generated | `packages/extensions/cordis-client-runner` | Keep the generated slot catalog; it is the projection of the three new slots |
| [A1](#a1-spec-015-landing-the-fork-pipeline-copies-leave) | A class, converged | `packages/pipeline/{lmo-pipeline,lmo-pipeline-http,tool-lmo-pipeline}` | Migrated out to the plugins repository under spec 015 |
| [R1](#r1-draft-owned-a-class-residuals-registered-not-executed) | A class, registered | 11 packages | Owned by Draft specs; registered back to the PM, not executed by spec 020 |
| [Z1](#z1-already-zeroed-registrations) | Registered, zero | `packages/client/ui-workspace`, `packages/api/remotes` | No diff at the baseline; registration only |

## C1 thirty-row classification (T094)

The inventory's scope is thirty packages — `A 6 + B 4 + pending 20` (spec FR-022). Every row carries its measured evidence (`git -C <harness> diff --numstat upstream/master...HEAD -- <package>`) and its owning decision. Rows 1-3 are the only ones this spec converged; rows 4-6 and 11-18 are registered back to the PM because their owning specs are still Draft; rows 7-10 and 19-30 stay in the fork.

| # | Package | Class | Basis (measured) | Owner (status) | Diff |
| --- | --- | --- | --- | --- | --- |
| 1 | `packages/pipeline/lmo-pipeline` | A | lmtech pipeline business (service + tool + invariant) inside the official pipeline tree | 015 (Approved) — converged | 0 files |
| 2 | `packages/pipeline/lmo-pipeline-http` | A | lmtech HTTP transport face (client + config schema) | 015 (Approved) — converged | 0 files |
| 3 | `packages/pipeline/tool-lmo-pipeline` | A | lmtech pipeline tool (`defineTool` business tool) | 015 (Approved) — converged | 0 files |
| 4 | `packages/api/session-controller` | A | lmtech session-control face (Remote contribution + session routing semantics) | 011 (Draft) — registered | 8 files, +225 |
| 5 | `packages/session/session-tags` | A | `SessionTags*` remotes and the durable tag store | 016 (Draft) — registered | 10 files, +487 |
| 6 | `packages/bundle/lmo-pipeline-worker` | A | an lmtech-only bundle placed in the official bundle tree | 018 (Draft) / 012 US3 — registered | 16 files, +1559 |
| 7 | `packages/client/ui-sidebar` | B (A+B mixed) | the `sidebar.pipelines` region is declaration + type + render point; the shell-level shared search row is A class | 020 FR-024 (B face) / 013 US2 (A face) | 8 files, +303 |
| 8 | `packages/client/ui-conversation` | B | `conversation.input.hindsight` — the official composer has no plugin input seat | 020 FR-024 | 8 files, +27 |
| 9 | `packages/client/ui-tool` | B | no source row: the six rows are one-line `tagsBySession` fixture additions (session-tag compile coupling); the spec's toolview-priority reading is not backed by the measured diff ([B3](#b3-packagesclientui-tool)) | 020 FR-024 (B class) / 016 (fixtures) | 6 files, +13 |
| 10 | `packages/client/ui-settings-plugin-inventory` | B | `settings.plugin.inventory.item` — a fork-only slot | 020 FR-024 | 4 files, +128 |
| 11 | `packages/subagent/subagent` | pending → A | `decision-answer.ts` (236 new lines) inlined into the official subagent plus the `list-children` ordering flip | 007 (Draft) + 013 US4 — registered | 5 files, +290 |
| 12 | `packages/client/ui-primitives` | pending → A | an unconditional HoverCard pin plus a hard-coded Chinese `aria-label` | 013 US1 — registered | 3 files, +118 |
| 13 | `packages/llm/token-meter` | pending → A | a derived `cacheHitRatio` added inside the official projection view | 013 US3 — registered | 3 files, +31 |
| 14 | `packages/core/session` | pending → A | `stripReasoning` plus hard-coded Codex `current_turn` filtering in `deriveMessages` | 013 US4 — registered | 3 files, +57 |
| 15 | `packages/goal/tool-goal` | pending → A | `STRUCTURED_OUTPUT_PRESETS = ['pipeline-worker']` — an lmtech preset name in an official package | 013 US5 — registered | 3 files, +85 |
| 16 | `packages/bundle/web-app` | pending → A | three `@lingmeow.tech/*` patch rows plus the matching dependency | 018 (Draft) — registered | 2 files, +21 |
| 17 | `packages/boot/app-boot` | pending → A | the `lmo-pipeline-worker` profile template | 012 US3 / 018 FR-008 — registered | 1 file, +5 |
| 18 | `packages/extensions/tool-cordis` | pending → A | `src/api-catalog.ts` — lmtech entries written into the official catalog (entry-level ownership, see [R1](#r1-draft-owned-a-class-residuals-registered-not-executed)) | 015 / 016 / 007 — registered | 1 file, +84 |
| 19 | `packages/llm/llm-pi-ai` | pending → B | a generic `reasoningTokens` wire mapping ([P1](#p1-packagesllmllm-pi-ai)) | 020 keeps | 3 files, +52 |
| 20 | `packages/sdk/server` | pending → B | an `agentPreset` seam plus the Windows exit drain ([P2](#p2-packagessdkserver)) | 020 keeps | 1 file, +17 |
| 21 | `packages/client/ui-settings-plugins` | pending → B | a widened `SecretField` / `ValueField` export ([P3](#p3-packagesclientui-settings-plugins)) | 020 keeps | 1 file, +2 |
| 22 | `packages/compaction/compaction-basic` | pending → B | test-only addition, no product behaviour ([P4](#p4-packagescompactioncompaction-basic)) | 020 keeps | 1 file, +19 |
| 23 | `packages/test-support/client-runtime` | pending → B | session-tag no-op doubles, compile coupling ([P5](#p5-packagestest-supportclient-runtime)) | 020 keeps → deleted with 016 | 1 file, +6 |
| 24 | `packages/client/ui-workflow-run` | pending → B | one-line test fixture `tagsBySession` ([P6](#p6-six-client-packages-with-fixture-coupling)) | 020 keeps → deleted with 016 | 1 file, +1 |
| 25 | `packages/client/ui-trajectory` | pending → B | one-line test fixture `tagsBySession` ([P6](#p6-six-client-packages-with-fixture-coupling)) | 020 keeps → deleted with 016 | 1 file, +1 |
| 26 | `packages/client/ui-theme` | pending → B | one-line test fixture `tagsBySession` ([P6](#p6-six-client-packages-with-fixture-coupling)) | 020 keeps → deleted with 016 | 1 file, +1 |
| 27 | `packages/client/ui-subagent` | pending → B | one-line test fixture `tagsBySession` ([P6](#p6-six-client-packages-with-fixture-coupling)) | 020 keeps → deleted with 016 | 1 file, +1 |
| 28 | `packages/client/ui-jobs` | pending → B | one-line test fixture `tagsBySession` ([P6](#p6-six-client-packages-with-fixture-coupling)) | 020 keeps → deleted with 016 | 1 file, +1 |
| 29 | `packages/client/locale` | pending → B | one-line test fixture `tagsBySession`; the inventory's `ui-locale` is this package ([P6](#p6-six-client-packages-with-fixture-coupling)) | 020 keeps → deleted with 016 | 1 file, +1 |
| 30 | `packages/client/ui-renderer` | pending → B | `tsconfig.json` gains `types: ["node"]`, build configuration only ([P7](#p7-packagesclientui-renderer)) | 020 keeps | 1 file, +2 |

Two further registrations complete the picture without adding classification rows:

- the two already-zeroed inventory entries (`packages/client/ui-workspace`, `packages/api/remotes`) carry no diff at all — [Z1](#z1-already-zeroed-registrations);
- one package outside the thirty inventoried ones carries a diff and is registered as a generated derivative of the three new slots — [G1](#g1-generated-client-slot-catalog-b-class-derivative).

## B-class packages: kept, with their decision record

Every row below was measured with `git -C <harness> diff --stat upstream/master...HEAD -- <package>`; the row set of the record matches that output one-to-one.

### B1 `packages/client/ui-sidebar`

| Row | Semantics | Class |
| --- | --- | --- |
| `src/client/index.ts` | `sidebar.pipelines` declaration (`kind: 'single'`, `scope: 'root'`) | B |
| `src/client/contract/slots.ts` | `sidebar.pipelines` type with `SidebarSectionOwnerProps` | B |
| `src/client/SidebarRoot.tsx` | the single render point | B |
| `src/client/SidebarRoot.module.css`, `src/client/locales.ts` | shell-level shared search row styling and copy | A |
| `tests/*` (3 files) | coverage for both faces | mixed |

Decision: the region face stays — the official sidebar has no plugin-owned section region, and the addition is exactly declaration + type + render point. The shared search row is A class (spec 013 US2 ruled that the shell keeps only the region, not a shared search row); spec 020 registers it and does not touch it.

### B2 `packages/client/ui-conversation`

| Row | Semantics |
| --- | --- |
| `src/client/apply.ts` | `conversation.input.hindsight` registration |
| `src/client/contract/slots.ts` | slot type, owner `InputControlOwnerProps` (already exported upstream) |
| `src/client/skeleton/InputBar.tsx` | the single render point |
| `tests/*` (5 files) | coverage |

Decision: keep. The official composer has no insertion point for a plugin-owned input control; the addition carries no lmtech business logic, and the owner props reuse the official `InputControlOwnerProps`.

### B3 `packages/client/ui-tool`

Rows measured on 2026-09-10: `tests/coverage-tails.client.spec.tsx`, `tests/diff-card.client.spec.tsx`, `tests/read-card.client.spec.tsx`, `tests/search-card.client.spec.tsx`, `tests/terminal-card.client.spec.tsx`, `tests/web-card.client.spec.tsx` — six one-line `tagsBySession` fixture additions, and **no source row at all**: the fork carries no toolview-priority override any more, so the spec's toolview-priority reading has no counterpart in the measured diff.

Decision: keep as B class. What the ledger and the gate's whitelist record is the class, and the residual rows are compile coupling with no product behaviour that leaves together with spec 016. A genuine priority override would have to be re-evidenced before this row is restated as one.

### B4 `packages/client/ui-settings-plugin-inventory`

Decision: keep. `settings.plugin.inventory.item` is declared in `src/client/slot-contract.ts` (owner `PluginInventoryItemOwnerProps` = `{ children?: never }`), registered through `children` in `src/client/index.ts`, rendered in `PluginInventorySettingsTab.tsx`, and its row list is backed by `src/client/inventory-items.ts` (+67). This is the one fork-only slot whose local declaration did not exist in the plugins repository; the consumer-side mirror adds it (see [S3](#s3-settingsplugininventoryitem)).

### P1 `packages/llm/llm-pi-ai`

Rows: `src/stream.ts`, `tests/adapter.spec.ts`, `tests/reasoning-usage.spec.ts`.

Decision: keep. `mapUsage` surfaces `reasoningTokens` from a wire field the official mapping drops. That is a generic provider mapping (no lmtech vocabulary) and is upstreamable as-is; the tests pin it.

### P2 `packages/sdk/server`

Row: `src/index.ts`.

Decision: keep. Two generic fixes: an `agentPreset` configuration seam the official server does not expose, and `process.exit` → `process.exitCode` so the Windows native-handle drain is not truncated. Neither mentions lmtech.

### P3 `packages/client/ui-settings-plugins`

Row: `src/client/index.ts`.

Decision: keep. The official package exported only `export type { FieldProps }`; the fork adds `export { SecretField, ValueField }`. The plugins repository rewrites those controls locally today because the value components are not reachable — widening the export removes that duplication and is the missing official seam.

### P4 `packages/compaction/compaction-basic`

Row: `tests/compaction-basic.spec.ts`.

Decision: keep. Test-only addition with no product behaviour; classified B with the "no business semantics" note.

### P5 `packages/test-support/client-runtime`

Row: `src/sessions.ts`.

Decision: keep for now. The file gains no-op doubles (`setSessionTags`, `removeSessionTags`) so the session-tag read/write surface compiles. The package has no counterpart upstream under the inventory's name `packages/client/runtime` — that path does not exist in either the upstream or the fork; the real package is this one. Delete together with spec 016 (session-tags migration).

### P6 six client packages with fixture coupling

Packages and rows: `packages/client/ui-workflow-run/tests/workflow-run.client.spec.tsx`, `packages/client/ui-trajectory/tests/views.client.spec.tsx`, `packages/client/ui-theme/tests/appearance-row.client.spec.tsx`, `packages/client/ui-subagent/tests/conversation-ui.client.spec.tsx`, `packages/client/ui-jobs/tests/job-list-action.client.spec.tsx`, `packages/client/locale/tests/language-row.client.spec.tsx`.

Decision: keep for now; each is a one-line test-fixture addition (`tagsBySession`) forced by the session-tag surface. The inventory's `ui-locale` is really this `packages/client/locale`. Delete together with spec 016.

### P7 `packages/client/ui-renderer`

Row: `tsconfig.json`.

Decision: keep. Build configuration only (`types: ["node"]`); no runtime or business semantics.

## Three new slots: minimal native extension

| Slot | Declaration | Type | Render point | Owner props |
| --- | --- | --- | --- | --- |
| `sidebar.pipelines` | `ui-sidebar/src/client/index.ts` | `ui-sidebar/src/client/contract/slots.ts` | `ui-sidebar/src/client/SidebarRoot.tsx` | `SidebarSectionOwnerProps` (`{ wide; expandSidebar }`, already exported upstream) |
| `conversation.input.hindsight` | `ui-conversation/src/client/apply.ts` | `ui-conversation/src/client/contract/slots.ts` | `ui-conversation/src/client/skeleton/InputBar.tsx` | `InputControlOwnerProps` (already exported upstream) |
| `settings.plugin.inventory.item` | `ui-settings-plugin-inventory/src/client/index.ts` (`children`) | `ui-settings-plugin-inventory/src/client/slot-contract.ts` | `ui-settings-plugin-inventory/src/client/PluginInventorySettingsTab.tsx` | `PluginInventoryItemOwnerProps` = `{ children?: never }` (fork-only) |

Each slot carries exactly the three anchors and no business code. The fork remains the only render point for all three.

## M1 consumer-side slot-contract mirror (US5-C)

The npm releases of `@deepseek-ai/dsh-client-ui-*` are ahead of this fork and will never resolve to fork declarations, and the fork cannot publish under the `@deepseek-ai` scope. The consumer therefore owns a same-shape mirror:

1. a plugin main package declares the slot in its own `src/slots.ts` by merging the same key, `kind`, `scope`, and owner shape into `@deepseek-ai/dsh-client-ui-slots`;
2. the package exposes it through the `./slots` subpath, and its `-ui` package consumes that entry (`import type {} from '<main>/slots'`) — so types resolve without a fork release;
3. the fork keeps the single render point, and neither side may recreate the type under a new name, use a local peer link, or resolve across repositories through `paths` (constitution prohibited item 3).

The shape gate `scripts/check-slot-contract-mirror.mjs --fork-root <harness>` in the plugins repository compares the mirrors against the fork declarations item by item.

## G1 generated client slot catalog (B-class derivative)

`packages/extensions/cordis-client-runner/src/client/slot-catalog.ts` is not one of the thirty inventoried packages, but it carries a diff: the catalog is generated by `scripts/gen-client-catalog.ts` from the fork's client slot declarations, and the three new slots ([S1](#s1-sidebarpipelines), [S2](#s2-conversationinputhindsight), [S3](#s3-settingsplugininventoryitem)) add exactly three entries (52 → 55 keys, +97/-4 lines, measured after the 015 convergence re-ran the official generators). `pnpm run verify-client-catalog` fails closed on any drift, so the file cannot be reverted while the slots live; the gate therefore lists it as a derived artifact instead of widening the sixteen-package B-class set.

## A1 spec 015 landing: the fork pipeline copies leave

`packages/pipeline/lmo-pipeline`, `packages/pipeline/lmo-pipeline-http`, and `packages/pipeline/tool-lmo-pipeline` were fork-added packages (upstream has no `packages/pipeline/` at all) carrying lmtech pipeline business semantics into the official tree. Spec 015 (Approved) re-homed them as `@lingmeow.tech/dsh-lmtech-pipeline`, `@lingmeow.tech/dsh-lmtech-pipeline-http`, and `@lingmeow.tech/dsh-lmtech-tool-pipeline`, so spec 020 removed the fork copies and every reference that pointed at them:

| Surface | Change |
| --- | --- |
| the three package directories (22 files) | deleted |
| `tsconfig.base.json` aliases, `tsconfig.host.json` references | removed |
| `packages/bundle/web-app/{package.json,cordis.patch.yml}` | dropped the `dsh-lmo-pipeline-http` / `dsh-tool-lmo-pipeline` dependency and rows (the rows named packages that no longer exist) |
| `packages/bundle/lmo-pipeline-worker/{package.json,cordis.patch.yml,worker.cordis.yml}` | dropped the same two dependencies and rows; the rest of the worker bundle stays registered to spec 018 |
| `scripts/gen-cordis-catalog.ts` | dropped the now-undiscovered `lmoPipeline` page entry and the `Lmo*` link entries (the generator is fail-closed in both directions) |
| `scripts/verify-package-readme-model-experience.ts` | dropped the two allowlist entries for the deleted paths |
| `packages/extensions/tool-cordis/src/api-catalog.ts`, `docs/subsystems/pipeline.{md,zh.md}`, `docs/tool-catalog.md` | regenerated with the official generators |
| `pnpm-lock.yaml` | importers and link entries for the deleted projects removed |

The worker bundle's remaining rows (`session-tags`, `pipeline-worker-tags`) and the `lmo-pipeline-worker` profile stay as they are: they belong to Draft specs 018/012 and are only registered here.

One consequence needed repair beyond the generated artifacts: `packages/bundle/lmo-pipeline-worker/tests/bundle.spec.ts` still asserted both dropped rows in the patch list and in the worker config, so the package's test lane (`vitest run packages/bundle/lmo-pipeline-worker/tests/bundle.spec.ts`) failed with two "must mount" assertions after the convergence. The expectations now carry the removal with the owning spec inline, and the lane is green again. What the removal leaves open is a functional question for spec 018: the worker profile no longer mounts any `ctx.lmoPipeline` seam, because the pre-rehoming package names resolve nowhere — 018 owns re-adding that row under the rehomed plugin name.

## R1 Draft-owned A-class residuals: registered, not executed

Spec 020 executes only the A-class面 whose owning spec is Approved (`015`). Every other A-class package belongs to a Draft spec and is registered back to the PM instead of being changed here — the fork keeps its diff until the owning spec lands. Measured status on 2026-09-10 (`grep -l 'Status\*\*: Approved' docs/specs/*/spec.md` → 003 / 015 / 020 / 021 / 022):

| Package | Files | Owning spec (status) | Registered action |
| --- | --- | --- | --- |
| `packages/api/session-controller` | 8 | 011 (Draft) | Remove the reverse dependency / RPC closure on `dsh-session-tags` |
| `packages/session/session-tags` | 10 | 016 (Draft) | Migrate the session-tag business surface into the plugins repository; the bilingual README pair added for the T094 pairing gate leaves with the package |
| `packages/bundle/lmo-pipeline-worker` | 16 | 018 (Draft) / 012 US3 | Move the worker definition to the lmo runner side; re-add the `ctx.lmoPipeline` seam row under the rehomed plugin name (the pre-rehoming names resolve nowhere, so the convergence dropped them — [A1](#a1-spec-015-landing-the-fork-pipeline-copies-leave)) |
| `packages/subagent/subagent` | 5 | 007 (Draft) + 013 US4 | Migrate `decision-answer`, revert the `list-children` ordering |
| `packages/client/ui-primitives` | 3 | 013 US1 | Revert the unconditional pin and the hard-coded Chinese label |
| `packages/llm/token-meter` | 3 | 013 US3 | Revert the derived `cacheHitRatio` projection |
| `packages/core/session` | 3 | 013 US4 | Revert the hard-coded Codex `current_turn` filtering |
| `packages/goal/tool-goal` | 3 | 013 US5 | Move the `pipeline-worker` preset mapping to the plugin side |
| `packages/boot/app-boot` | 1 | 012 US3 / 018 FR-008 | Delete the `lmo-pipeline-worker` profile template |
| `packages/bundle/web-app` | 2 | 018 (Draft) | Codemod the remaining row to the independent package and converge the dependency block |
| `packages/extensions/tool-cordis` | 1 | 015 / 016 / 007 | Entry-level ownership, measured 2026-09-10 at `+84/-3` (`src/api-catalog.ts`): the `lmoPipeline` `SERVICE_API` entry and its `Lmo*` type entries are **already gone** — the official generator re-run that landed the 015 convergence dropped the dangling references (the pre-convergence reading was `+223/-3`) — so only the 016 entries (`@Remote('tagsList'/'tagsSet'/'tagsRemove')` plus the `sessionTags` service) and the 007 entries (`SubagentRuntime.pendingQuestions`, the `DecisionAnswer*` types) stay registered |

## Z1 already-zeroed registrations

`packages/client/ui-workspace` and `packages/api/remotes` appear in the inventory's B list, but the baseline diff has zero files for both. Registration only; neither enters the gate's package set.

## Verification

```bash
# from dsh-lmtech-plugins/worktree/020-impl — expected exit 0 (warnings only for the Draft-owned rows of R1)
node scripts/check-harness-diff.mjs --harness ../../../../deepseek-harness/worktree/lmtech-dev ; echo "exit=$?"
node scripts/check-harness-diff.mjs --list
node scripts/check-slot-contract-mirror.mjs --fork-root ../../../../deepseek-harness/worktree/lmtech-dev
# from this worktree — expected green: editing this pair must leave every generated catalog in sync
pnpm run verify-cordis-catalog && pnpm run verify-client-catalog && pnpm run verify-cordis-inspect-catalog
pnpm run verify-tool-catalog && pnpm run verify-tsconfig-paths && pnpm run verify-translation-pairing
```

`verify-cordis-catalog` compares working-tree bytes, so the sources it reads must stay LF in the checkout: a CRLF working copy (Windows editors, unfiltered copies) makes the generated pages compare stale even though `git diff` reports no change (the `eol=lf` attribute normalizes it away). Normalizing those sources to LF restores the green check without changing any recorded content.
