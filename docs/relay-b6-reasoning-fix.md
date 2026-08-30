# Relay: B6 pi-ai mapUsage reasoningTokens 修复

## 状态

- **阶段**: B6.1 [TDD-RED] 完成
- **日期**: 2026-08-30
- **分支**: dev-20260830-b6-reasoning-fix

## RED 完成（B6.1）

- 新增测试文件 `packages/llm/llm-pi-ai/tests/reasoning-usage.spec.ts`
- 覆盖 4 个 mapUsage reasoningTokens 用例：
  - `usage.reasoning` undefined → 返回对象无 `reasoningTokens` 字段（通过）
  - `reasoning = 0` → `{ reasoningTokens: 0 }`（当前失败）
  - `reasoning > 0`（如 123）→ `reasoningTokens` 等值透传 123（当前失败）
  - `reasoningTokens` 不进入 `outputTokens`（token-meter 不双计口径，outputTokens 保持 usage.output 原值；当前失败）
- 测试结果: 1 passed / 3 failed → **RED 达成**

## 下一步（B6.2 GREEN）

- 在 `packages/llm/llm-pi-ai/src/stream.ts` 的 `mapUsage` 中，
  当 `usage.reasoning` 非 undefined 时输出 `reasoningTokens` 字段：
  `...(usage.reasoning !== undefined ? { reasoningTokens: usage.reasoning } : {})`
- 注意 pi-ai 注释：reasoning 是 output 的子集，不加入 outputTokens（避免双计）
