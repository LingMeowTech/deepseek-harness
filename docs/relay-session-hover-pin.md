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

---

# Relay: session 悬停面板显示可复制 session id

- **Stage**: [job2/3] session 悬停面板显示可复制 session id（ui-workspace 包，TDD）
- **Status**: ✅ 完成
- **Branch**: `dev-20260819-session-hover-pin`
- **Commit**: `cbf1f704e5`
- **Date**: 2026-08-19 (UTC+8)

## 交付内容

- `SessionHoverContent` 新增 session id 行（`hover.sessionId`，显示 `node.id`）
- `SessionNodeItem` 的 `HoverCard copyText` 由 `row.title` 改为 `node.id`
  - blank 行保持无 `copyText`（占位卡片仍只读）
- `Rows.module.css` 新增 `.hoverId`（caption 灰色，超长省略号截断但完整值参与复制）
- `locales.ts` zh/en 同步新增 `hover.sessionId`（`会话 ID：{id}` / `Session ID: {id}`）
- 测试：`tests/rows.client.spec.tsx` 新增 2 用例
  - 悬停卡片显示 session id，激活复制的是 session id（非标题）
  - 卡片内点钉子固定 → 移开鼠标面板仍在；再点钉子 → 移开收回

## 验证结论

- TDD 全流程：RED（2 新用例失败）→ GREEN（最小实现转绿）→ REFACTOR（清理）
- 质量闸门全绿：
  - `vitest run packages/client/ui-workspace/tests` → 8 files / 123 tests 全过
  - `tsc -p packages/client/ui-workspace/tsconfig.json --noEmit` → exit 0
  - `oxlint packages/client/ui-workspace` → exit 0
- 注：`tsc -b` 全仓报错均为既有 workspace 契约包（api/remotes 等）未级联构建所致，
  与本次改动无关（同 job1 环境问题）；受影响包 ui-workspace 独立类型检查通过。

## 下一步

- playwright 端到端验收（本 pipeline 下一子任务）

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
