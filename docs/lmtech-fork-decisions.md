# LMTech fork decisions (harness `lmtech-dev`)

English | [中文](lmtech-fork-decisions.zh.md)

This page is the single index of every deliberate divergence this fork keeps from `upstream/master`, with the measured evidence and the owning decision for each one. Spec `020-dsh-plugins-audit-cleanup` (US5) produced it; the lane's gate is `scripts/check-harness-diff.mjs` in the plugins repository. Starting from the T094 terminal state the gate asserts that:

- the diff's package set stays inside the B-class whitelist, with each B-class package pinned to an allowed file set and an added-line ceiling. The pre-024 whitelist — 16 packages plus the generated slot catalog of [G1](#g1-generated-client-slot-catalog-b-class-derivative) — no longer holds: 024 retires two of the three fork slots, converges rows 11 and 15, and re-measures every row against `c291e7961a`, so the plugins-repository whitelist must be re-pinned from that measurement (R7);
- the three `015`-owned A-class packages are gone from the diff and the two already-zeroed registrations stay zeroed ([A1](#a1-spec-015-landing-the-fork-pipeline-copies-leave), [Z1](#z1-already-zeroed-registrations));
- no B-class official package depends on an lmtech package;
- the A-class residuals whose owning specs are settled (007 and 013 cancelled, 011 and 012 `Closed · delivered`, 016 / 018 Approved since 2026-09-11) are reported as warnings, not failures ([R1](#r1-draft-owned-a-class-residuals-registered-not-executed)).

Two rules decide every entry:

- **A class** — lmtech business semantics inside an official package, an existing official seam changed in place, or an official package depending on an lmtech package. These leave the fork: the owning spec migrates them out, or reverts them.
- **B class** — the official package genuinely lacks the insertion point, and what the fork adds is only a slot declaration, a type, and a render point (or an equivalent minimal seam). These stay, recorded here.

## Index

| Entry | Kind | Package or slot | Decision |
| --- | --- | --- | --- |
| [C1](#c1-thirty-row-classification-t094) | Classification | 30 inventoried packages | The single verdict table, re-measured against `c291e7961a` on 2026-09-12: rows 1-3 and 11-16 are converged or re-landed by 024, two of the three fork slots retire, and the pre-024 A/B counts are superseded |
| [B1](#b1-packagesclientui-sidebar) | B class, A+B mixed | `packages/client/ui-sidebar` | **Superseded by 024**: upstream's `sidebar.panellist` replaces the fork region; the shell shared search row stays A class (spec 013 US2) with a recorded missing consumer |
| [B2](#b2-packagesclientui-conversation) | B class | `packages/client/ui-conversation` | **Superseded by 024**: the fork's `conversation.input.hindsight` seat is retired (T041) |
| [B3](#b3-packagesclientui-tool) | B class, fixture coupling | `packages/client/ui-tool` | Keep; after 024 the residual row is one session-tag fixture addition, not a priority override |
| [B4](#b4-packagesclientui-settings-plugin-inventory) | B class | `packages/client/ui-settings-plugin-inventory` | Keep `settings.plugin.inventory.item` |
| [P1](#p1-packagesllmllm-pi-ai) | B class | `packages/llm/llm-pi-ai` | Keep the generic `reasoningTokens` wire mapping — re-landed as merged by 024 (capability 3) |
| [P2](#p2-packagessdkserver) | B class | `packages/sdk/server` | Keep the `agentPreset` seam and the Windows exit-drain fix |
| [P3](#p3-packagesclientui-settings-plugins) | B class | `packages/client/ui-settings-plugins` | Keep the widened value-component export |
| [P4](#p4-packagescompactioncompaction-basic) | B class, no business semantics | `packages/compaction/compaction-basic` | Keep the added test — re-measured after 024 at 1 file, +19 |
| [P5](#p5-packagestest-supportclient-runtime) | B class, compile coupling | `packages/test-support/client-runtime` | Keep the no-op double — **harness-owned session-tag data plane, kept by design** (basis: `.agents/notes/implemented/architecture/2026-09-02-s-series-merge-scope.md`) |
| [P6](#p6-six-client-packages-with-fixture-coupling) | B class, compile coupling | `packages/client/{ui-workflow-run,ui-trajectory,ui-theme,ui-subagent,ui-jobs,locale}` | Keep the fixture field — it now couples to the `tagsBySession` projection 024 re-landed; **harness-owned session-tag data plane, kept by design** (same basis) |
| [P7](#p7-packagesclientui-renderer) | B class, no business semantics | `packages/client/ui-renderer` | Keep the `types: ["node"]` build setting |
| [S1](#three-new-slots-minimal-native-extension) | New slot, retired | `sidebar.pipelines` | **Superseded by 024**: the fork's slot is deleted; upstream's `sidebar.panellist` list plus the layout `main` keyed slot is the insertion point |
| [S2](#three-new-slots-minimal-native-extension) | New slot, retired | `conversation.input.hindsight` | **Superseded by 024**: the fork's seat is deleted (T041) |
| [S3](#b4-packagesclientui-settings-plugin-inventory) | New slot | `settings.plugin.inventory.item` | Minimal native extension, unchanged by 024, consumer-side mirror in the plugins repository |
| [M1](#m1-consumer-side-slot-contract-mirror-us5-c) | Mechanism | plugin main packages | The consumer owns a same-shape `src/slots.ts` mirror consumed through `./slots`; after 024 the mirror set is the one surviving fork slot (`settings.plugin.inventory.item`) |
| [G1](#g1-generated-client-slot-catalog-b-class-derivative) | B class, generated | `packages/extensions/cordis-client-runner` | Keep the generated slot catalog; it now projects the slots that survive 024, and its key count is re-measured when the catalog is regenerated (T067) |
| [A1](#a1-spec-015-landing-the-fork-pipeline-copies-leave) | A class, converged | `packages/pipeline/{lmo-pipeline,lmo-pipeline-http,tool-lmo-pipeline}` | The requirement moved to the plugins repository under spec 015 (`packages/dsh-lmtech-pipeline`, `packages/dsh-lmtech-pipeline-http`, `packages/dsh-lmtech-tool-pipeline`); this repository will not implement it — measured 2026-09-17 at `83b9edf642`, `git ls-files packages/pipeline` is empty |
| [R1](#r1-draft-owned-a-class-residuals-registered-not-executed) | A class, registered | 9 packages after 024 | Owned by their owning specs — 007 and 013 stand cancelled (024 judged 007 converged, with the 2026-09-12 retirement note on file, and re-judged 013's clauses), 011 and 012 are recorded `Closed · delivered`, and 016 / 018 have been Approved since 2026-09-11 (basis: the Status lines of the main repository's `docs/specs/016-dsh-plugins-session-tags/spec.md` and `docs/specs/018-dsh-plugins-lmo-server-client/spec.md`); 024 executed the `subagent` and `tool-goal` halves and dropped the `lmo-pipeline-worker` row with its package. 017 is not one of these registrations: `packages/client/runtime` holds no file in this tree (measured 2026-09-17 at `83b9edf642`), its requirement moved to the plugins repository's `packages/dsh-lmtech-pipeline-client`, and the fork's `dev` line still tracks its 78 files — pending cleanup |
| [Z1](#z1-already-zeroed-registrations) | Registered, zero | `packages/client/ui-workspace`, `packages/api/remotes` | No diff at the baseline; registration only |

## C1 thirty-row classification (T094)

The inventory's scope is thirty packages (spec FR-022). Every row carries its measured evidence and its owning decision. The Diff column below is re-measured on 2026-09-12 in the 024 worktree, where `upstream/master` is the target `c291e7961a` (`git diff --numstat c291e7961a HEAD -- <package>` at the merge commit `af2a1e07ca`, before the in-flight S4 edits; a row marked converged reaches 0 files when its task lands). 024 converges or re-lands rows 1-3 and 11-16, rows 4-6 and 17-18 stay registered to their owning specs (007 and 013 cancelled; 011 and 012 `Closed · delivered`; 016 / 018 have been Approved since 2026-09-11), and rows 7-10 and 19-30 stay in the fork.

| # | Package | Class | Basis (measured) | Owner (status) | Diff |
| --- | --- | --- | --- | --- | --- |
| 1 | `packages/pipeline/lmo-pipeline` | A | lmtech pipeline business (service + tool + invariant) inside the official pipeline tree | 015 (Approved) — **converged**; the requirement moved to the plugins repository's `packages/dsh-lmtech-pipeline` and this repository will not implement it | 0 files — `git ls-files packages/pipeline` empty at `83b9edf642` (2026-09-17) |
| 2 | `packages/pipeline/lmo-pipeline-http` | A | lmtech HTTP transport face (client + config schema) | 015 (Approved) — **converged**; the requirement moved to the plugins repository's `packages/dsh-lmtech-pipeline-http` and this repository will not implement it | 0 files — `git ls-files packages/pipeline` empty at `83b9edf642` (2026-09-17) |
| 3 | `packages/pipeline/tool-lmo-pipeline` | A | lmtech pipeline tool (`defineTool` business tool) | 015 (Approved) — **converged**; the requirement moved to the plugins repository's `packages/dsh-lmtech-tool-pipeline` and this repository will not implement it | 0 files — `git ls-files packages/pipeline` empty at `83b9edf642` (2026-09-17) |
| 4 | `packages/api/session-controller` | A | lmtech session-control face (three `@Remote` tag verbs + the client `tagsBySession` projection) | 011 (`Closed · delivered`) - registered | 8 files, +225/-8 |
| 5 | `packages/session/session-tags` | A | the durable tag registry and its whole package | 016 (Approved 2026-09-11 — basis: the Status line of the main repository's `docs/specs/016-dsh-plugins-session-tags/spec.md`) — **harness-owned session-tag data plane, kept by design** (basis: `.agents/notes/implemented/architecture/2026-09-02-s-series-merge-scope.md`): the fork copy stands in this tree as the s-series merge kept it | 10 files, +487 at the merge commit `af2a1e07ca`; re-measured 2026-09-17 at `83b9edf642` with `git diff --numstat c291e7961a HEAD -- packages/session/session-tags`: 9 files, +654 |
| 6 | `packages/bundle/lmo-pipeline-worker` | A | an lmtech-only bundle placed in the official bundle tree | 018 (Approved 2026-09-11 — basis: the Status line of the main repository's `docs/specs/018-dsh-plugins-lmo-server-client/spec.md`) / 012 US3 — **converged**, **absent from both trees**: the bundle no longer exists upstream or in the fork, and measured 2026-09-17 at `83b9edf642` `git ls-files packages/bundle/lmo-pipeline-worker` is empty | 0 files |
| 7 | `packages/client/ui-sidebar` | B (A+B mixed) | the `sidebar.pipelines` region is **deleted by 024** (upstream's `sidebar.panellist` list plus the layout `main` keyed slot is the insertion point); what remains is the shell-level shared search row, A class, whose `searchQuery` pass-through has no consumer in this repository (recorded gap) | 020 FR-024 / 013 US2 - region retired by 024 (T019/T020/T041/T042) | 7 files, +296/-6 |
| 8 | `packages/client/ui-conversation` | B | the fork's `conversation.input.hindsight` seat is **retired by 024** (T041); the remaining rows are test-fixture alignment | 020 FR-024 - seat retired by 024 | 8 files, +27/-2 |
| 9 | `packages/client/ui-tool` | B | no source row: the residual row is one `tagsBySession` fixture addition (session-tag compile coupling); the spec's toolview-priority reading is not backed by the measured diff ([B3](#b3-packagesclientui-tool)) | 020 FR-024 (B class) / 016 (fixtures) — **harness-owned session-tag data plane, kept by design** (same basis): the `tagsBySession` fixture stands in `tests/coverage-tails.client.spec.tsx` (measured 2026-09-17 at `83b9edf642`) | 1 file, +1 |
| 10 | `packages/client/ui-settings-plugin-inventory` | B | `settings.plugin.inventory.item` - a fork-only slot | 020 FR-024 | 5 files, +129/-5 |
| 11 | `packages/subagent/subagent` | A - **converged by 024** | `decision-answer.ts`, `pendingQuestions`, and the `list-children` ordering flip are removed (T032/T033/T036); the rationale is consolidated in the [decision-answer retirement Agent Note](../.agents/notes/implemented/simplification/2026-09-12-subagent-decision-answer-retirement.md) | 007 (cancelled) + 013 US4 (cancelled) - converged by 024 | 4 files, +267/-15 at the merge commit, then 0 files |
| 12 | `packages/client/ui-primitives` | pending - **keep as B** | the pin is re-landed on the upstream component with required `pinLabel` / `unpinLabel` props wired through `t(...)` in place of the hard-coded Chinese label (T055/T056) | 013 US1 - re-landed by 024 | 3 files, +118/-10 |
| 13 | `packages/llm/token-meter` | pending - **keep as B** | only the `cacheHitRatio` view-layer additions are re-landed; compaction semantics are upstream's (T051) | 013 US3 - re-landed by 024 | 3 files, +31/-1 |
| 14 | `packages/core/session` | pending - **keep as B** | `stripReasoning` is re-landed as a non-current-turn derivation with the incremental cache intact, and no event or format change (T052) | 013 US4 - re-landed by 024 | 3 files, +57/-4 |
| 15 | `packages/goal/tool-goal` | A - **converged by 024** | `STRUCTURED_OUTPUT_PRESETS` is removed; the preset list is the `structuredOutputPresets` `Config` field and the wrap-up suppression stays (T048) | 013 US5 - converged by 024 | 3 files, +85/-4 |
| 16 | `packages/bundle/web-app` | pending - updated by 024 | one `@lingmeow.tech/dsh-session-tags` patch row plus the matching workspace dependency, with the removed pipeline-seam rows recorded in comments and a test asserting they are absent (T015) | 018 (Approved 2026-09-11 — basis: the Status line of the main repository's `docs/specs/018-dsh-plugins-lmo-server-client/spec.md`) — **kept fork package under the s-series basis; the FR-008 re-point was not executed, judged a design trade-off** (the browser-side half does not value-import the host package, so the row resolving to the fork's `@lingmeow.tech/dsh-session-tags` is equivalent in function): `cordis.patch.yml:80-81` and `package.json:42` name `@lingmeow.tech/dsh-session-tags` (measured 2026-09-17 at `83b9edf642`) | 3 files, +59 |
| 17 | `packages/boot/app-boot` | pending - **converged by 024** | the `lmo-pipeline-worker` profile template is absent from both trees; the fork's only row is a test asserting the profile and its bundle stay out | 012 US3 / 018 FR-008 — **converged**: the only row is `tests/worker-profile.spec.ts` (+43), re-measured 2026-09-17 at `83b9edf642` | 1 file, +43 |
| 18 | `packages/extensions/tool-cordis` | pending | `src/api-catalog.ts` - lmtech entries written into the official catalog (entry-level ownership, see [R1](#r1-draft-owned-a-class-residuals-registered-not-executed)); the 016 entries stay by the s-series basis and the catalog regeneration carries them | 016 / 007 - registered — **harness-owned session-tag data plane, kept by design** (same basis) for the 016 half: `src/api-catalog.ts` carries `@Remote('tagsList'/'tagsSet'/'tagsRemove')` (lines 1467/1473/1479) and the `sessionTags` service entry (line 1959), measured 2026-09-17 at `83b9edf642` | 1 file, +84/-3 |
| 19 | `packages/llm/llm-pi-ai` | pending → B | a generic `reasoningTokens` wire mapping ([P1](#p1-packagesllmllm-pi-ai)) | 020 keeps | 3 files, +52 |
| 20 | `packages/sdk/server` | pending → B | an `agentPreset` seam plus the Windows exit drain ([P2](#p2-packagessdkserver)) | 020 keeps | 1 file, +17 |
| 21 | `packages/client/ui-settings-plugins` | pending → B | a widened `SecretField` / `ValueField` export ([P3](#p3-packagesclientui-settings-plugins)) | 020 keeps | 1 file, +2 |
| 22 | `packages/compaction/compaction-basic` | pending → B | test-only addition, no product behaviour ([P4](#p4-packagescompactioncompaction-basic)) | 020 keeps | 1 file, +19 |
| 23 | `packages/test-support/client-runtime` | pending → B | session-tag no-op doubles, compile coupling ([P5](#p5-packagestest-supportclient-runtime)) | 020 keeps — **harness-owned session-tag data plane, kept by design** (same basis): `src/sessions.ts` carries the `setSessionTags` / `removeSessionTags` doubles (measured 2026-09-17 at `83b9edf642`) | 1 file, +6 |
| 24 | `packages/client/ui-workflow-run` | pending → B | one-line test fixture `tagsBySession` ([P6](#p6-six-client-packages-with-fixture-coupling)) | 020 keeps — **harness-owned session-tag data plane, kept by design** (same basis): the fixture stands (measured 2026-09-17 at `83b9edf642`) | 1 file, +1 |
| 25 | `packages/client/ui-trajectory` | pending → B | one-line test fixture `tagsBySession` ([P6](#p6-six-client-packages-with-fixture-coupling)) | 020 keeps — **harness-owned session-tag data plane, kept by design** (same basis): the fixture stands (measured 2026-09-17 at `83b9edf642`) | 1 file, +1 |
| 26 | `packages/client/ui-theme` | pending → B | one-line test fixture `tagsBySession` ([P6](#p6-six-client-packages-with-fixture-coupling)) | 020 keeps — **harness-owned session-tag data plane, kept by design** (same basis): the fixture stands (measured 2026-09-17 at `83b9edf642`) | 1 file, +1 |
| 27 | `packages/client/ui-subagent` | pending → B | one-line test fixture `tagsBySession` ([P6](#p6-six-client-packages-with-fixture-coupling)) | 020 keeps — **harness-owned session-tag data plane, kept by design** (same basis): the fixture stands (measured 2026-09-17 at `83b9edf642`) | 1 file, +1 |
| 28 | `packages/client/ui-jobs` | pending → B | one-line test fixture `tagsBySession` ([P6](#p6-six-client-packages-with-fixture-coupling)) | 020 keeps — **harness-owned session-tag data plane, kept by design** (same basis): the fixture stands (measured 2026-09-17 at `83b9edf642`) | 1 file, +1 |
| 29 | `packages/client/locale` | pending → B | one-line test fixture `tagsBySession`; the inventory's `ui-locale` is this package ([P6](#p6-six-client-packages-with-fixture-coupling)) | 020 keeps — **harness-owned session-tag data plane, kept by design** (same basis): the fixture stands (measured 2026-09-17 at `83b9edf642`) | 1 file, +1 |
| 30 | `packages/client/ui-renderer` | pending → B | `tsconfig.json` gains `types: ["node"]`, build configuration only ([P7](#p7-packagesclientui-renderer)) | 020 keeps | 1 file, +2 |

Two further registrations complete the picture without adding classification rows:

- the two already-zeroed inventory entries (`packages/client/ui-workspace`, `packages/api/remotes`) carry no diff at all — [Z1](#z1-already-zeroed-registrations);
- one package outside the thirty inventoried ones carries a diff and is registered as a generated derivative of the fork's slot declarations — [G1](#g1-generated-client-slot-catalog-b-class-derivative).

## B-class packages: kept, with their decision record

Every row below records the decision spec 020 took; the row sets of B1 and B2 have since been superseded by 024's upstream-first resolution (which deleted the two fork slots), and the measured evidence quoted per row is the 2026-09-12 measurement against `c291e7961a`.

### B1 `packages/client/ui-sidebar`

The `sidebar.pipelines` region is superseded by 024: the fork no longer declares the slot, and `ui-sidebar` renders upstream's root-scoped `sidebar.panellist` list against the layout's root-scoped `main` keyed slot (switched with `ctx.layout.selectPanel`). The rows below are what the fork still carries at the merge commit `af2a1e07ca`, before T019/T020/T041 land:

| Row | Semantics | Class |
| --- | --- | --- |
| `src/client/SidebarRoot.module.css`, `src/client/locales.ts` | shell-level shared search row styling and copy | A |
| `src/client/SidebarRoot.tsx` | the shared search row plus the panel-list render | mixed |
| `tests/*` (3 files) | the row's coverage and the recorded snapshot | mixed |

Decision: the region face is gone. Upstream's panel list plus the root-scoped `main` keyed slot is the insertion point, so the fork keeps no slot of its own. The shell-level shared search row stays A class (spec 013 US2, registered and not executed by spec 020), and T042 re-points the e2e lane at it - but after the region's removal nothing in this repository consumes the `searchQuery` that `SidebarRoot` passes through the section owner share, and `SidebarSectionOwnerProps` itself declares only `wide` and `expandSidebar`. That is a **recorded gap**: exposed by 024 S4, its convergence belongs to T019/T020/T042 follow-up rather than to a code fix in this spec.

### B2 `packages/client/ui-conversation`

Superseded by 024: the fork's `conversation.input.hindsight` seat is deleted (T041), so `src/client/apply.ts`, `src/client/contract/slots.ts`, and `src/client/skeleton/InputBar.tsx` neither declare nor render it.

| Row | Semantics |
| --- | --- |
| `tests/*` (5 files) | bench-field and fixture alignment with the upstream suite |

Decision: the seat is retired rather than kept. Upstream's composer already declares the plugin input seats it supports (`conversation.input.plan`, `conversation.input.model`, and the list seats around them), a fork-only sibling seat had no consumer in this repository, and the pipeline UI that would have rendered into it lives in the plugins repository and registers through upstream's own seats.

### B3 `packages/client/ui-tool`

Measured on 2026-09-12 after 024: `tests/coverage-tails.client.spec.tsx` - one `tagsBySession` fixture addition, and **no source row at all**. The five card-spec rows recorded before the sync were upstream deletions the merge adopted (T022), so the fork's residual tool-package diff is that single fixture line, and the spec's toolview-priority reading still has no counterpart in the measured diff.

Decision: keep as B class. What the ledger and the gate's whitelist record is the class, and the residual row is compile coupling with no product behaviour, part of the session-tag data plane this repository keeps by design. A genuine priority override would have to be re-evidenced before this row is restated as one.

### B4 `packages/client/ui-settings-plugin-inventory`

Decision: keep, unchanged by 024. `settings.plugin.inventory.item` is declared in `src/client/slot-contract.ts` (owner `PluginInventoryItemOwnerProps` = `{ children?: never }`), registered through `children` in `src/client/index.ts`, rendered in `PluginInventorySettingsTab.tsx`, and its row list is backed by `src/client/inventory-items.ts`. T017 took upstream's rendering for the settings tab (the `StateDotState` / `TagTone` references now come from ui-primitives), and this is the one fork-only slot whose local declaration did not exist in the plugins repository; the consumer-side mirror adds it (see [S3](#b4-packagesclientui-settings-plugin-inventory)).

### P1 `packages/llm/llm-pi-ai`

Rows: `src/stream.ts`, `tests/adapter.spec.ts`, `tests/reasoning-usage.spec.ts`.

Decision: keep, re-landed as merged by 024 (capability 3). `mapUsage` surfaces `reasoningTokens` from a wire field the official mapping drops. That is a generic provider mapping (no lmtech vocabulary) and is upstreamable as-is; the tests pin it, and the merge needed no change to it. Measured after 024 at 3 files, +52/-1.

### P2 `packages/sdk/server`

Row: `src/index.ts`.

Decision: keep. Two generic fixes: an `agentPreset` configuration seam the official server does not expose, and `process.exit` → `process.exitCode` so the Windows native-handle drain is not truncated. Neither mentions lmtech.

### P3 `packages/client/ui-settings-plugins`

Row: `src/client/index.ts`.

Decision: keep. The official package exported only `export type { FieldProps }`; the fork adds `export { SecretField, ValueField }`. The plugins repository rewrites those controls locally today because the value components are not reachable — widening the export removes that duplication and is the missing official seam.

### P4 `packages/compaction/compaction-basic`

Row: `tests/compaction-basic.spec.ts`.

Decision: keep; re-measured on 2026-09-12 at 1 file, +19. Test-only addition with no product behaviour, classified B with the "no business semantics" note, and untouched by 024.

### P5 `packages/test-support/client-runtime`

Row: `src/sessions.ts`.

Decision: keep — **harness-owned session-tag data plane, kept by design** (basis: `.agents/notes/implemented/architecture/2026-09-02-s-series-merge-scope.md`). The file gains no-op doubles (`setSessionTags`, `removeSessionTags`) so the session-tag read/write surface compiles, and they stand when measured on 2026-09-17 at `83b9edf642` (`src/sessions.ts` declares both, and the snapshot store constructor carries `tagsBySession`). The path the inventory used for this row, `packages/client/runtime`, is 017's package and holds no file in this tree (`git ls-files packages/client/runtime` is empty); that requirement moved to the plugins repository's `packages/dsh-lmtech-pipeline-client`, so this repository will not implement it, while the fork's `dev` line still tracks its 78 files — pending cleanup.

### P6 six client packages with fixture coupling

Packages and rows: `packages/client/ui-workflow-run/tests/workflow-run.client.spec.tsx`, `packages/client/ui-trajectory/tests/views.client.spec.tsx`, `packages/client/ui-theme/tests/appearance-row.client.spec.tsx`, `packages/client/ui-subagent/tests/conversation-ui.client.spec.tsx`, `packages/client/ui-jobs/tests/job-list-action.client.spec.tsx`, `packages/client/locale/tests/language-row.client.spec.tsx`.

Decision: keep — **harness-owned session-tag data plane, kept by design** (same basis). Each is a one-line test-fixture addition (`tagsBySession`) forced by the session-tag surface, which 024 re-landed as the `tagsBySession` projection on the session list snapshot; measured 2026-09-17 at `83b9edf642`, all six stand (`git grep -c tagsBySession` returns one hit in each of the six files listed above). The inventory's `ui-locale` is really this `packages/client/locale`.

### P7 `packages/client/ui-renderer`

Row: `tsconfig.json`.

Decision: keep. Build configuration only (`types: ["node"]`); no runtime or business semantics.

## Three new slots: minimal native extension

024 retires two of the three: `sidebar.pipelines` (upstream's `sidebar.panellist` plus the layout `main` keyed slot is the insertion point) and `conversation.input.hindsight` (upstream's composer seats cover the need). What remains is one fork-only slot, carrying the same three anchors and no business code:

| Slot | Declaration | Type | Render point | Owner props |
| --- | --- | --- | --- | --- |
| `settings.plugin.inventory.item` | `ui-settings-plugin-inventory/src/client/index.ts` (`children`) | `ui-settings-plugin-inventory/src/client/slot-contract.ts` | `ui-settings-plugin-inventory/src/client/PluginInventorySettingsTab.tsx` | `PluginInventoryItemOwnerProps` = `{ children?: never }` (fork-only) |

## M1 consumer-side slot-contract mirror (US5-C)

The npm releases of `@deepseek-ai/dsh-client-ui-*` are ahead of this fork and will never resolve to fork declarations, and the fork cannot publish under the `@deepseek-ai` scope. The consumer therefore owns a same-shape mirror:

1. a plugin main package declares the slot in its own `src/slots.ts` by merging the same key, `kind`, `scope`, and owner shape into `@deepseek-ai/dsh-client-ui-slots`;
2. the package exposes it through the `./slots` subpath, and its `-ui` package consumes that entry (`import type {} from '<main>/slots'`) - so types resolve without a fork release;
3. the fork keeps the single render point, and neither side may recreate the type under a new name, use a local peer link, or resolve across repositories through `paths` (constitution prohibited item 3).

After 024 the mirror set is one slot, `settings.plugin.inventory.item`: the two slots the fork declared for the pipeline zone and the Hindsight seat no longer exist, so their consumer-side mirrors leave with them.

The shape gate `scripts/check-slot-contract-mirror.mjs --fork-root <harness>` lives in the plugins repository (see [Verification](#verification)); it compares the mirrors against the fork declarations item by item.

## G1 generated client slot catalog (B-class derivative)

`packages/extensions/cordis-client-runner/src/client/slot-catalog.ts` is not one of the thirty inventoried packages, but it carries a diff: the catalog is generated by `scripts/gen-client-catalog.ts` from the fork's client slot declarations, and after 024 it can project only the slots that still exist - `settings.plugin.inventory.item` from the fork, plus upstream's own entries including `sidebar.panellist`. The pre-024 `52 -> 55 keys` reading is superseded and must not be carried forward: re-measure it with `pnpm run gen-client-catalog` and let `pnpm run verify-client-catalog` pin the result (T067). The gate fails closed on any drift, so the file cannot be reverted while a fork slot lives; the ledger therefore lists it as a derived artifact instead of widening the B-class set.

## A1 spec 015 landing: the fork pipeline copies leave

`packages/pipeline/lmo-pipeline`, `packages/pipeline/lmo-pipeline-http`, and `packages/pipeline/tool-lmo-pipeline` were fork-added packages (upstream has no `packages/pipeline/` at all) carrying lmtech pipeline business semantics into the official tree. Spec 015 (Approved) re-homed them as `@lingmeow.tech/dsh-lmtech-pipeline`, `@lingmeow.tech/dsh-lmtech-pipeline-http`, and `@lingmeow.tech/dsh-lmtech-tool-pipeline`, so the requirement now lives in the plugins repository's `packages/dsh-lmtech-pipeline`, `packages/dsh-lmtech-pipeline-http`, and `packages/dsh-lmtech-tool-pipeline`, and this repository will not implement it again. Measured 2026-09-17 at `83b9edf642`: `git ls-files packages/pipeline` is empty and `git diff --numstat c291e7961a HEAD -- packages/pipeline/` reports no row. Spec 020 removed the fork copies and every reference that pointed at them:

| Surface | Change |
| --- | --- |
| the three package directories (22 files) | deleted |
| `tsconfig.base.json` aliases, `tsconfig.host.json` references | removed |
| `packages/bundle/web-app/{package.json,cordis.patch.yml}` | dropped the `dsh-lmo-pipeline-http` / `dsh-tool-lmo-pipeline` dependency and rows (the rows named packages that no longer exist) |
| `packages/bundle/lmo-pipeline-worker/{package.json,cordis.patch.yml,worker.cordis.yml}` | dropped the same two dependencies and rows; the worker bundle itself has since left both trees |
| `scripts/gen-cordis-catalog.ts` | dropped the now-undiscovered `lmoPipeline` page entry and the `Lmo*` link entries (the generator is fail-closed in both directions) |
| `scripts/verify-package-readme-model-experience.ts` | dropped the two allowlist entries for the deleted paths |
| `packages/extensions/tool-cordis/src/api-catalog.ts`, `docs/subsystems/pipeline.{md,zh.md}`, `docs/tool-catalog.md` | regenerated with the official generators |
| `pnpm-lock.yaml` | importers and link entries for the deleted projects removed |

The worker bundle this section described no longer exists in either tree: `packages/bundle/lmo-pipeline-worker` is absent from the target and from the fork, so its rows and the `lmo-pipeline-worker` profile template are gone rather than registered. What the harness still mounts is the `session-tags` row of the web-app bundle. The pipeline seam packages remain absent from this repository, and the [upstream sync](../.agents/notes/implemented/architecture/2026-09-12-024-upstream-sync.md) retired the fork's own sidebar region and client pipelines service in favour of upstream's panel list, so `packages/pipeline/**` stays outside the fork's diff. Re-measured 2026-09-17 at `83b9edf642`, that holds for both paths this section names: `packages/pipeline` and `packages/bundle/lmo-pipeline-worker` track 0 files each. The `packages/client/runtime` requirement 017 owned is absent from this tree as well (`git ls-files packages/client/runtime` is empty, and `upstream/master` never carried the path), and it now lives in the plugins repository as `packages/dsh-lmtech-pipeline-client`; the fork's `dev` line still tracks 78 files under it (`git ls-tree -r dev --name-only packages/client/runtime`) — pending cleanup — and the commit that removed them there (`9a4031f2f5`, "fix(build): remove orphan packages/client/runtime left by upstream Runtime removal") is reachable from no ref.

One consequence needed repair beyond the generated artifacts: `packages/bundle/lmo-pipeline-worker/tests/bundle.spec.ts` still asserted both dropped rows in the patch list and in the worker config, so the package's test lane (`vitest run packages/bundle/lmo-pipeline-worker/tests/bundle.spec.ts`) failed with two "must mount" assertions after the convergence. The expectations now carry the removal with the owning spec inline, and the lane is green again. What the removal leaves open is a functional question for spec 018: the worker profile no longer mounts any `ctx.lmoPipeline` seam, because the pre-rehoming package names resolve nowhere — 018 owns re-adding that row under the rehomed plugin name. **Converged**: measured 2026-09-17 at `83b9edf642`, that lane left with the package — `packages/bundle/lmo-pipeline-worker` tracks 0 files in this tree, so what 018 converges here is the bundle's absence from both trees, and the web-app bundle's `session-tags` row and dependency stay by design (`cordis.patch.yml:80-81`, `package.json:42`; the FR-008 re-point was not executed, judged a design trade-off).

## R1 A-class residuals with settled owning specs: registered, not executed

<a id="r1-draft-owned-a-class-residuals-registered-not-executed"></a>

Spec 020 executes only the A-class face whose owning spec is Approved (`015`); 024 then executes the parts its own spec owns. Every other A-class package is registered back to its owning spec - the fork keeps its diff until the owning spec lands; 007 and 013 stand cancelled (024 judged 007 converged, with the 2026-09-12 retirement note on file, and re-judged 013's clauses), 011 and 012 are recorded `Closed · delivered`, and 016 / 018 have been Approved since 2026-09-11 (basis: the Status lines of the main repository's `docs/specs/016-dsh-plugins-session-tags/spec.md` and `docs/specs/018-dsh-plugins-lmo-server-client/spec.md`). Measured status on 2026-09-12 in the 024 worktree against `c291e7961a`:

| Package | Files | Owning spec (status) | Registered action |
| --- | --- | --- | --- |
| `packages/api/session-controller` | 8 | 011 (`Closed · delivered`) | Remove the reverse dependency / RPC closure on `dsh-session-tags`; 024 keeps the three `@Remote` tag verbs and the client `tagsBySession` projection |
| `packages/session/session-tags` | 10 | 016 (Approved 2026-09-11 — basis: the Status line of the main repository's `docs/specs/016-dsh-plugins-session-tags/spec.md`) — **harness-owned session-tag data plane, kept by design** (basis: `.agents/notes/implemented/architecture/2026-09-02-s-series-merge-scope.md`) | Keep the session-tag business surface in this repository as the s-series merge kept it; the bilingual README pair stays with the package. Re-measured 2026-09-17 at `83b9edf642`, the package stands in this tree: 9 files, +654 against `c291e7961a` |
| `packages/subagent/subagent` | 0 | 007 (cancelled) + 013 US4 (cancelled) | **Converged by 024**: `decision-answer`, `pendingQuestions`, and the `list-children` ordering flip are removed; the rationale is consolidated in the [retirement Agent Note](../.agents/notes/implemented/simplification/2026-09-12-subagent-decision-answer-retirement.md) |
| `packages/client/ui-primitives` | 3 | 013 US1 | Re-landed by 024 as a keep-as-B face: the pin returns on the upstream component with required `pinLabel` / `unpinLabel` props, and no hard-coded Chinese label remains (T055/T056) |
| `packages/llm/token-meter` | 3 | 013 US3 | Re-landed by 024 as a keep-as-B face: only the `cacheHitRatio` view-layer additions stay (T051) |
| `packages/core/session` | 3 | 013 US4 | Re-landed by 024 as a keep-as-B face: non-current-turn `stripReasoning` with the incremental cache intact (T052) |
| `packages/goal/tool-goal` | 3 | 013 US5 | **Converged by 024**: the preset list is a `Config` field, so no lmtech preset name is hard-coded (T048) |
| `packages/boot/app-boot` | 1 | 012 US3 / 018 FR-008 — **converged** | **Converged by 024**: the `lmo-pipeline-worker` profile template is absent from both trees; the residual row is a test asserting that absence. Re-measured 2026-09-17 at `83b9edf642`, the row is `tests/worker-profile.spec.ts`, +43 |
| `packages/bundle/web-app` | 3 | 018 (Approved 2026-09-11 — basis: the Status line of the main repository's `docs/specs/018-dsh-plugins-lmo-server-client/spec.md`) — **kept fork package under the s-series basis; the FR-008 re-point was not executed, judged a design trade-off** (the browser-side half does not value-import the host package) | The `session-tags` row and its dependency stay. Measured 2026-09-17 at `83b9edf642`, both are in place: `cordis.patch.yml:80-81` (`id: session-tags`, `name: '@lingmeow.tech/dsh-session-tags'`) and `package.json:42` (`"@lingmeow.tech/dsh-session-tags": "workspace:^"`) |
| `packages/extensions/tool-cordis` | 1 | 016 / 007 — **harness-owned session-tag data plane, kept by design** (016 half; same basis) | Entry-level ownership, measured 2026-09-12 at `+84/-3` (`src/api-catalog.ts`): the `lmoPipeline` `SERVICE_API` entry and its `Lmo*` type entries are already gone, the 007 entries (`SubagentRuntime.pendingQuestions`, the `DecisionAnswer*` types) disappear when the catalog is regenerated after the retirement, and only the 016 entries (`@Remote('tagsList'/'tagsSet'/'tagsRemove')` plus the `sessionTags` service) stay registered, present when measured on 2026-09-17 at `83b9edf642` (lines 1467/1473/1479 and 1959) |

## Z1 already-zeroed registrations

`packages/client/ui-workspace` and `packages/api/remotes` appear in the inventory's B list, but the baseline diff has zero files for both. Registration only; neither enters the gate's package set.

## Verification

The two plugins-repository scripts this page names (`check-harness-diff.mjs`, `check-slot-contract-mirror.mjs`) exist in neither harness tree - they belong to the plugins repository (R7), so the commands below run from the worktree that holds them, and the B-class whitelist they carry must be re-pinned from the 2026-09-12 measurement in C1.

```bash
# from dsh-lmtech-plugins/worktree/020-impl — expected exit 0 (warnings only for the R1 rows whose owning specs are settled)
node scripts/check-harness-diff.mjs --harness ../../../../deepseek-harness/worktree/lmtech-dev ; echo "exit=$?"
node scripts/check-harness-diff.mjs --list
node scripts/check-slot-contract-mirror.mjs --fork-root ../../../../deepseek-harness/worktree/lmtech-dev
# from this worktree — expected green: editing this pair must leave every generated catalog in sync
pnpm run verify-cordis-catalog && pnpm run verify-client-catalog && pnpm run verify-cordis-inspect-catalog
pnpm run verify-tool-catalog && pnpm run verify-tsconfig-paths && pnpm run verify-translation-pairing
```

`verify-cordis-catalog` compares working-tree bytes, so the sources it reads must stay LF in the checkout: a CRLF working copy (Windows editors, unfiltered copies) makes the generated pages compare stale even though `git diff` reports no change (the `eol=lf` attribute normalizes it away). Normalizing those sources to LF restores the green check without changing any recorded content.
