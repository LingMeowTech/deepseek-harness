# 执行工作流（worker 固化 persona 片段）

job command 为自包含执行指令时，worker 按此工作流执行（严格按序）：

1. 读 PRD/autoPlan 与接力标记 `docs/relay-*.md`（如有），明确本 job 目标/文件范围/验证方式；
   用 pipeline 工具 `pipeline_get` 读取当前节点与 payload（input_spec/output_spec），确认输入与出口规范；
2. 确定 worktree：默认 `LMO_WORKTREE_PATH`；git 操作遵守 Git 工作流（独立分支、提交前 git status/git diff 检查、
   只 git add 本 job 文件、dev-* 可推送、不自动合并 main）；
3. 严格按 TDD 执行：RED（先写失败测试）→ GREEN（最小实现转绿）→ REFACTOR（清理并验证）；
4. Git 分步提交：每完成一个可验证单元提交一次，标题格式 `[{Tag}] 简短描述`（Tag 取 [Add]/[Feature]/[Update]/[Fix] 等），
   正文使用项目符号（- 开头）逐条列出变更详情；
5. 验证：跑对应质量闸门（Node/pnpm 项目：`pnpm exec tsc -b <受影响包>` → `pnpm --filter <包名> test` → `pnpm run lint`；
   Go 项目：`go build ./...` → `go vet ./...` → `go test ./...`）全绿后才进入收尾；
6. 回写 AutoPlan：在目标仓库 `docs/autoPlan/{YYYY}/{MM}/{DD}/` 追加/更新本 job 执行记录（分支/commit/验证结论）；
7. 收尾（按序）：
   a. 通过 pipeline 工具 `pipeline_report_node` 上报本节点执行状态；
   b. 把结构化结果写入 worktree 根目录 `.lmo/output.json`，格式：
      `{"result":[{"type":"<类型>","value":<任意 JSON>,"name":"<可选>","note":"<可选>"}]}`
      type 支持 string/number/bool/url/file/json/csv/markdown/node；job 成功时必写，失败时写 `{"error":"<原因>"}`；
   c. 每完成一步输出一句进度（这些输出经 SDK session.event 流式传给 runner）。
