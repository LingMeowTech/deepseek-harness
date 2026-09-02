# Relay: B6 pi-ai mapUsage reasoningTokens 修复

## 状态

- **阶段**: B6.1 [TDD-RED] + B6.2 [TDD-GREEN] + B6.3 [验证收尾] 完成 ✅
- **日期**: 2026-08-30
- **分支**: dev-20260830-b6-reasoning-fix
- **提交链**: [Test][B6] `38243dba62` → [Fix][B6] `f8cca742b3` → [Add][B6] docs 留档 `5876a2c59f` → [Fix][B6] adapter 断言更新 `a89f471ed3`

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
  - pi-ai 全包 **262 passed / 0 failed**（含新增 4 个 reasoningTokens 用例）
  - token-meter **54 passed / 0 failed**（reasoningTokens 独立字段，不并入 outputTokens，不双计）
  - adapter.spec.ts 断言同步：pi-ai 恒上报 reasoning 明细（wire 缺失时补 0），usage 断言补 `reasoningTokens: 0`
- docs 留档：`docs/autoPlan/2026/08/30/B6-pi-ai-reasoningTokens-mapUsage-fix.md`
- 提交链：[Test][B6] `38243dba62` → [Fix][B6] `f8cca742b3` → [Add][B6] docs 留档 `5876a2c59f` → [Fix][B6] adapter 断言更新 `a89f471ed3`
- 最终 commit：`a89f471ed3`（HEAD，待 push origin）

## 下一步（B6.2 GREEN）

- ✅ 已完成，见上方 GREEN 完成记录

## State 收尾（B6.3 后追加）

- State [B6] 收尾总结节点输出：`node_output/01a052de-e2d1-7037-a1de-05d397c658de.json`（state_summary）
- **Issue 评论跳过原因**：该 pipeline（repo=dsh-harness）远端为 GitHub `github.com/LingMeowTech/deepseek-harness`，Gitea 无此仓库（API 404），无法按 repo+pipeline 名匹配 Gitea issue，故未追加 State Summary 评论（按「确无匹配才跳过并记录」规则处理）
- 待 push：`git push origin dev-20260830-b6-reasoning-fix`
