# Relay: HoverCard pinned state

English | [中文](relay-session-hover-pin.zh.md)

- **Stage**: [job1/3] HoverCard pinned state (ui-primitives package, TDD)
- **Status**: ✅ Done
- **Branch**: `dev-20260819-session-hover-pin`
- **Commit**: `4dea280ba5d801d26ab1ef215fef006759b16a26`
- **Date**: 2026-08-19 (UTC+8)

## Deliverables

- HoverCard adds a pinned state: a pin button at the top-right of the card (SVG pin icon)
  - Click pin → pinned=true, card stays fixed (does not retract when the mouse leaves); click again to cancel and restore hover behavior
  - `aria-pressed` reflects the pinned state; `onClick` stopPropagation, does not trigger card copy
  - On `pointerLeave`, when pinned, skip `armClose` (do not armClose or close due to pointerleave)
  - `disabled` flip still closes the card (existing effect); pinned only exempts mouse-leave
- Styles: `HoverCard.module.css` adds `.pin`/`.pinIcon`/`.pinned` (pinned state highlight)
- Tests: `tests/hover-card.client.spec.tsx` adds 3 pinned cases
  - After pinning, pointerLeave + grace+1s keeps the card open
  - After unpinning, pointerLeave + grace closes the card
  - While pinned, pointerLeave does not armClose (timer count does not increase)

## Verification conclusion

- Full TDD flow: RED (3 new cases fail) → GREEN (minimal implementation turns green) → REFACTOR (cleanup, lint fixes)
- Quality gates all green:
  - `vitest run packages/client/ui-primitives/tests` → 21 files / 501 tests all pass
  - `tsc -b packages/client/ui-primitives/tsconfig.json` → exit 0
  - `oxlint packages/client/ui-primitives` → exit 0
- Note: repository-wide `tsc -b tsconfig.client.json` fails in a clean worktree because workspace contract packages (api/gateway, api/remotes etc.) are not cascaded-built; pre-existing environment issue unrelated to this job; the affected ui-primitives package type-checks independently.

## Next steps

- Rows session id (next sub-task of this pipeline)

# Relay: session hover panel shows copyable session id

- **Stage**: [job2/3] session hover panel shows copyable session id (ui-workspace package, TDD)
- **Status**: ✅ Done
- **Branch**: `dev-20260819-session-hover-pin`
- **Commit**: `cbf1f704e5`
- **Date**: 2026-08-19 (UTC+8)

## Deliverables

- `SessionHoverContent` adds a session id row (`hover.sessionId`, displays `node.id`)
- `SessionNodeItem`'s `HoverCard copyText` changes from `row.title` to `node.id`
  - blank rows keep no `copyText` (placeholder card remains read-only)
- `Rows.module.css` adds `.hoverId` (caption gray, long value ellipsis-truncated but full value participates in copy)
- `locales.ts` zh/en both add `hover.sessionId` (`会话 ID：{id}` / `Session ID: {id}`)
- Tests: `tests/rows.client.spec.tsx` adds 2 cases
  - Hover card shows session id; the copied value is the session id (not the title)
  - Click pin inside the card → panel stays after mouse leaves; click pin again → retracts on mouse leave

## Verification conclusion

- Full TDD flow: RED (2 new cases fail) → GREEN (minimal implementation turns green) → REFACTOR (cleanup)
- Quality gates all green:
  - `vitest run packages/client/ui-workspace/tests` → 8 files / 123 tests all pass
  - `tsc -p packages/client/ui-workspace/tsconfig.json --noEmit` → exit 0
  - `oxlint packages/client/ui-workspace` → exit 0
- Note: repository-wide `tsc -b` failures are all caused by existing workspace contract packages (api/remotes etc.) not cascaded-built, unrelated to this change (same environment issue as job1); the affected ui-workspace package type-checks independently.

## Next steps

- Playwright end-to-end acceptance (next sub-task of this pipeline)

---

# Relay: session 悬停面板交互验收与收尾

- **Stage**: [job3/3] playwright 交互验收与收尾（真实浏览器驱动）
- **Status**: ✅ 完成
- **Branch**: `dev-20260819-session-hover-pin`
- **Commit**: `9f211a24d9`（验收功能提交；含后续接力标记提交 `3542d9ce3d`）
- **Date**: 2026-08-19 (UTC+8)

## 交付内容

- 构建链：`build:lib:client`（ui-primitives/ui-workspace 最新 lib 生效）→ `build:web`（apps/web dist）
- 新增验收测试 `apps/web/tests/session-hover-pin.e2e.ts`（仓库既有 `launchWebScaffold`
  真实 chromium 驱动 + seed 会话），覆盖三项交互：
  - 悬停 session 行 → 悬停卡片出现且含 session id（`Session ID: <id>`）
  - 点击钉子（`固定`）→ 移开鼠标 → 卡片仍在（aria-pressed=true，按钮变 `取消固定`）
  - 再点钉子（`取消固定`）→ 移开鼠标 → 卡片收回
- `apps/web/tsconfig.json`：新 e2e 文件加入 exclude（host-plane，与其它既有 e2e 一致）

## 验证结论

- playwright 三项交互全绿：`vitest run --config vitest.web.config.ts apps/web/tests/session-hover-pin.e2e.ts`
  → 4 tests 全过（含 zero-model-call 清洁断言）
- 全量回归全绿：
  - `pnpm exec tsc -b tsconfig.client.json` → exit 0（完整级联构建后无报错）
  - `pnpm exec vitest run packages/client/ui-primitives/tests packages/client/ui-workspace/tests`
    → 29 files / 624 tests 全过
- 注：本机 3080 端口被宿主 DSH web GUI（运行于 app/deepseek-harness/dev 的独立 checkout）
  占用，无法在 worktree 上以 3080 再起实例；验收改用仓库标准真实浏览器体系
  `launchWebScaffold`（真实 chromium + 真实 dist 组合 + seed 冷会话），等价验证真实交互。

## 下一步

- 无（pipeline 全部 3 个 job 已完成）