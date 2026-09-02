# B6 修复记录：pi-ai mapUsage reasoningTokens 口径修复

- **日期**: 2026-08-30
- **分支**: dev-20260830-b6-reasoning-fix
- **提交**: [Test][B6] `38243dba62` → [Fix][B6] `f8cca742b3`

## 背景

泠喵观测站 v4 会话中，GLM 回合 `reasoningTokens=0` 属于**测量缺失**（reasoning 用量未上报），并非真实为 0。

## 根因

- `dsh-harness/packages/llm/llm-pi-ai/src/stream.ts` 的 `mapUsage` 未映射 pi-ai `Usage.reasoning` 字段。
- 上游 pi-ai（`openai-completions.js` L1070-1077）已把 `usage.completion_tokens_details.reasoning_tokens` 填入 `usage.reasoning`，GLM 高算力路径会产出该值。
- 对比：`llm-deepseek/src/translate.ts` 已正确映射 reasoning，因此 v4 会话用 deepseek 时 reasoningTokens 正常，pi-ai 路径缺失。

## 改动

`packages/llm/llm-pi-ai/src/stream.ts` → `mapUsage` 追加 reasoning 映射：

```ts
...usage.reasoning !== undefined ? { reasoningTokens: usage.reasoning } : {},
```

- `usage.reasoning` 为 `undefined` → 不产出 `reasoningTokens` 字段（与 pi-ai 无 reasoning 明细一致）
- `usage.reasoning = 0` → 透传 `reasoningTokens: 0`
- `usage.reasoning > 0`（如 123）→ 等值透传 `reasoningTokens: 123`
- pi-ai 注释说明 reasoning 是 output 的子集，**不并入 outputTokens**（token-meter 不双计）

## 测试

新增 `packages/llm/llm-pi-ai/tests/reasoning-usage.spec.ts`，覆盖 4 用例：

1. 无 reasoning 明细 → 对象不含 `reasoningTokens` 字段
2. `reasoning = 0` → `{ reasoningTokens: 0 }`
3. `reasoning > 0` → 等值透传
4. `reasoningTokens` 不进入 `outputTokens`（token-meter 不双计口径）

**验证**：RED 1 passed / 3 failed → GREEN 4 passed（全绿）；`pnpm exec tsc -b packages/llm/llm-pi-ai` 通过；`pnpm --filter @deepseek-ai/dsh-llm-pi-ai test` 全包通过。
