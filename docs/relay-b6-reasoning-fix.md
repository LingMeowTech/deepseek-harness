# Relay: B6 pi-ai mapUsage reasoningTokens 修复

## 状态

- **阶段**: B6.1 [TDD-RED] + B6.2 [TDD-GREEN] + B6.3 [验证收尾] 完成 ✅
- **日期**: 2026-08-30
- **分支**: dev-20260830-b6-reasoning-fix
- **提交链**: [Test][B6] `38243dba62` → [Fix][B6] `f8cca742b3` → [Add][B6] docs 留档（待提交）

## RED 完成（B6.1）

- 新增测试文件 `packages/llm/llm-pi-ai/tests/reasoning-usage.spec.ts`
- 覆盖 4 个 mapUsage reasoningTokens 用例：
  - `usage.reasoning` undefined → 返回对象无 `reasoningTokens` 字段（通过）
  - `reasoning = 0` → `{ reasoningTokens: 0 }`（当前失败）
  - `reasoning > 0`（如 123）→ `reasoningTokens` 等值透传 123（当前失败）
  - `reasoningTokens` 不进入 `outputTokens`（token-meter 不双计口径，outputTokens 保持 usage.output 原值；当前失败）
- 测试结果: 1 passed / 3 failed → **RED 达成**

## GREEN 完成（B6.2）

- `packages/llm/llm-pi-ai/src/stream.ts` `mapUsage` 追加：
  `...usage.reasoning !== undefined ? { reasoningTokens: usage.reasoning } : {}`
- reasoning 是 pi-ai output 的子集，不并入 outputTokens（token-meter 不双计）
- 测试结果: **4 passed / 0 failed → GREEN 达成**（tsc + 全包 test 通过）

## 验证收尾（B6.3）

- 质量闸门：`pnpm exec tsc -b packages/llm/llm-pi-ai` ✅、`pnpm --filter @deepseek-ai/dsh-llm-pi-ai test` 全绿 ✅
- docs 留档：`docs/autoPlan/2026/08/30/B6-pi-ai-reasoningTokens-mapUsage-fix.md`
- 提交链：[Test][B6] → [Fix][B6] → [Add][B6]

## 下一步（B6.2 GREEN）

- ✅ 已完成，见上方 GREEN 完成记录
