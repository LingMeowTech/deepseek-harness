# 分解工作流（worker 固化 persona 片段）

job command 为「分解」类任务时，worker 按此工作流执行（严格按序）：

1. 读 skill/issue/PRD：调用 lmtech skill 读取项目知识/开发规范/可用工具（lmo_server_api.py 等）；
   读取当前 pipeline 信息：pipeline 工具 `pipeline_get` / `pipeline_prd` / `pipeline_states` / `pipeline_jobs`，
   另读目标仓库 `docs/PRD.md`、`docs/autoPlan/**`、`docs/relay-*.md`（如有）；issue 引用（完整链接）若提供则经
   `lmo_server_api.py gitea comment` 追加结构化开始上报；
2. PRD TDD 验收：按 TDD 流程产出/增量更新 PRD（需求目标/范围/RED-GREEN-REFACTOR 验收），写入目标仓库 PRD.md；
3. AutoPlan 写盘：根据 PRD 分解需求，生成 AutoPlan（bite-sized 实施步骤，含每步命令与验证方式），
   写入目标仓库 `docs/autoPlan/{YYYY}/{MM}/{DD}/`；
4. 拆 state/job：基于 AutoPlan 把需求拆成可执行子任务，经 lmtech skill 的 lmo_server_api.py 业务接口创建：
   - 建 state：`pipeline state create --pipeline-id <id> --name <名称> --desc-text <自包含需求> [--previous-id <前驱 id>] [--entry|--exit]`
     （入口 state 标记 --entry 并写 input_spec，出口 state 标记 --exit 并写 output_spec；数据规范
     `{"result":[{"type":"<类型>","value":...,"name":"<可选>","note":"<可选>"}]}`，type 支持 string/number/bool/url/file/json/csv/markdown/node）；
   - 建 job：`pipeline job create --state-id <state_id> --name <名称> --command "<自包含可执行指令>" [--previous-id <前驱 id>]`；
   - 相互独立的子任务拆成独立并行 job，彼此不加边（runner 并发执行）；有先后依赖才加边（DAG）；
   - 依赖补建：`pipeline dependency add --node <后继 id> --depends-on <前驱 id>`（内部实现为建边）；
   - 大型复杂阶段先建 state（可再分解）；叶子一律 type=job（desc_text 自包含，runner 不再分解，直接以 desc_text 执行）；
5. issue 上报：经 lmo_server_api.py gitea comment 按固定格式向 issue 追加开始上报（5 行，EndTime 填「-」）：
   ```
   🚀 Pipeline: {pipeline name}
   📍 State: {state name}
   🛠️ Job: {job name}
   ⏰ StartTime: {YYYY-MM-DD HH:MM UTC+8}
   ✅ EndTime: -
   ```
6. 完成后在目标仓库 `docs/relay-*.md` 写入分解记录（状态/子节点清单/commit），并按执行工作流第 7 步收尾
   （pipeline_report_node + .lmo/output.json + 流式进度）。
