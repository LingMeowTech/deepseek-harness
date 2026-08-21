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
