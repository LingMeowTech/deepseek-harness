# Relay: session hover panel 视觉回测（Playwright）

[English](visual-regression.md) | 中文

- **阶段**：[job3/3] Playwright 端到端验收（`dev-20260819-session-hover-pin` → `dev` 合并后收尾）
- **状态**：✅ 完成
- **分支**：`dev`（已合并；合并提交 `8eb0f9679d`、`d8b881a3cf`）
- **日期**：2026-08-28（UTC+8）

## 范围

issue #8（LingMeowTech/dsh-lmtech-plugins）合并后收尾：在运行中的 web UI
`http://127.0.0.1:3080`（DSH web GUI，dev 构建）上验证合并后的 HoverCard
钉住状态与会话 ID 行。

## 构建/测试闸门（只跑受影响包）

- `vitest run packages/client/ui-primitives/tests/hover-card.client.spec.tsx packages/client/ui-workspace/tests/rows.client.spec.tsx` → 2 文件 / 56 测试全过
- `tsc -b packages/client/ui-primitives/tsconfig.json` → exit 0
- `tsc -p packages/client/ui-workspace/tsconfig.json --noEmit` → exit 0

## 视觉回测结果（Playwright 1.61.1，Chromium headless，1440×900）

| 步骤 | 操作 | 预期 | 结果 |
| --- | --- | --- | --- |
| 1 | 打开 `http://127.0.0.1:3080`，hover 真实会话行（workspace 树 `[role=tree]`，`treeitem` 第 3 行） | 出现悬停卡片 | ✅ |
| 2 | 检查卡片文本 | 含 `会话 ID：{id}`（session id 行） | ✅（`body-has-session-id: true`） |
| 3 | 检查钉子按钮 | 存在；初始 `aria-pressed="false"` | ✅ |
| 4 | 点击钉子 | 文案变 `取消固定`，`aria-pressed="true"` | ✅ |
| 5 | 鼠标移开 (900, 700)，等待约 1.6s | 钉住后面板保持可见 | ✅（`panel stays: true`） |
| 6 | 再次点击取消钉住 | 恢复 hover 行为 | ✅（脚本内取消，无报错） |

截图：

- 含会话 ID 与钉子按钮的悬停卡片：![悬停面板](02-hover-panel.png)
- 钉住后鼠标移开卡片保持打开：![钉住保持](03-pinned-stays.png)

断言脚本：对运行中 GUI 的 headless Playwright；断言在运行时输出并记录于本文。
证据时间戳：2026-08-28 01:31（本地）。

## 结论

合并后的会话悬停面板在真实 web UI 上端到端符合规格：卡片展示可复制的
会话 ID 行，钉子按钮 `aria-pressed` 正确反映钉住状态，钉住后指针移开卡片
保持打开。两个受影响包的构建/类型闸门全绿。issue #8 收尾确认；issue 保持
打开（本 job 不关闭）。
