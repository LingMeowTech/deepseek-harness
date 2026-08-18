# Relay: HoverCard pinned 固定态

- **Stage**: [job1/3] HoverCard pinned 固定态（ui-primitives 包，TDD）
- **Status**: ✅ 完成
- **Branch**: `dev-20260819-session-hover-pin`
- **Commit**: `4dea280ba5d801d26ab1ef215fef006759b16a26`
- **Date**: 2026-08-19 (UTC+8)

## 交付内容

- HoverCard 新增 pinned 固定态：卡片内右上角钉子按钮（SVG pin 图标）
  - 点击钉子 → pinned=true，卡片固定（鼠标移开不收回）；再点取消恢复悬停行为
  - `aria-pressed` 反映固定态；`onClick` stopPropagation，不触发卡片复制
  - `pointerLeave` 时若 pinned 跳过 `armClose`（不 armClose、不因 pointerleave 关闭）
  - `disabled` 翻转仍关闭卡片（现有 effect），pinned 仅豁免鼠标移开
- 样式：`HoverCard.module.css` 新增 `.pin`/`.pinIcon`/`.pinned`（pinned 态高亮）
- 测试：`tests/hover-card.client.spec.tsx` 新增 3 个 pinned 用例
  - 固定后 pointerLeave + grace+1s 卡片仍打开
  - 取消固定后 pointerLeave + grace 卡片关闭
  - pinned 期间 pointerLeave 不 armClose（timer 数不增加）

## 验证结论

- TDD 全流程：RED（3 新用例失败）→ GREEN（最小实现转绿）→ REFACTOR（清理，lint 修复）
- 质量闸门全绿：
  - `vitest run packages/client/ui-primitives/tests` → 21 files / 501 tests 全过
  - `tsc -b packages/client/ui-primitives/tsconfig.json` → exit 0
  - `oxlint packages/client/ui-primitives` → exit 0
- 注：全仓库 `tsc -b tsconfig.client.json` 在干净 worktree 环境因 workspace 契约包
  （api/gateway、api/remotes 等）未级联构建而报错，均为既有环境问题，与本 job 改动无关；
  受影响包 ui-primitives 类型检查独立通过。

## 下一步

- Rows session id（本 pipeline 下一子任务）
