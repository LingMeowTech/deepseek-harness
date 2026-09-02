# `@deepseek-ai/dsh-bundle-lmo-pipeline-worker`

[English](README.md) | 中文

LMO pipeline job worker 组合包：一个 pipeline job = 一个独立 DeepSeek Harness worker 进程，按冻结的 runner 握手契约驱动。本包交付：

- [`cordis.patch.yml`](cordis.patch.yml) —— `dsh --profile lmo-pipeline-worker` 的 bundle 层（叠加在 `dsh-base` 之上）：stdio JSON-RPC 服务端、LMO pipeline seam（`dsh-lmo-pipeline-http` + `dsh-tool-lmo-pipeline`）、带独立进程 `dsh-sdk` 后端的 subagent seam、todo/session 基础 spine（经 dsh-base 引入）、带 lmtech 根目录的 skill 栈、pipeline 会话标签写入器 —— 不加载任何 web-app / 浏览器 client 行。
- [`worker.cordis.yml`](worker.cordis.yml) —— 冻结 `DSH_CORDIS_CONFIG` 握手使用的完整扁平组合（Go runner spawn 构建后的 `dsh-jsonrpc-agent` 可执行并传入本文件）。
- [`src/prompts.ts`](src/prompts.ts) —— 固化模型可见 persona：执行工作流（PRD/autoPlan → worktree → TDD → git 分步提交 → 验证 → AutoPlan 回写 → pipeline 工具 report → `.lmo/output.json`）与分解工作流（skill/issue/PRD → PRD TDD 验收 → AutoPlan → 拆 state/job，依赖建边、叶子 type=job、desc_text 自包含 → issue 上报）。两份组合文件内嵌同一文案，测试锁定三处一致。
- [`src/pipeline-worker-tags.ts`](src/pipeline-worker-tags.ts) —— 从握手环境变量读取身份，把 `pipeline_id:<v>` / `state_id:<v>` / `job_id:<v>` / `node_id:<v>` 经 `ctx.sessionTags` 写入本 worker 创建的每个会话。

## Profile 安装

`lmo-pipeline-worker` 是随发行版交付的 profile 模板（注册在 `dsh-app-boot`）：

```sh
dsh --profile lmo-pipeline-worker --dump-config
```

首次使用自动初始化 `$DSH_HOME/profiles/lmo-pipeline-worker`（bundle 列表为 `dsh-base` + 本包）。要在别处复制该 profile，按下列 manifest 创建 profile 目录：

```json
{
  "name": "dsh-profile-lmo-pipeline-worker",
  "private": true,
  "dependencies": {},
  "dsh": {
    "profile": {
      "bundles": [
        "@deepseek-ai/dsh-base",
        "@deepseek-ai/dsh-bundle-lmo-pipeline-worker"
      ]
    }
  }
}
```

再放一个空的 `cordis.patch.yml`（内容 `[]`），并用 `dsh plugin --profile lmo-pipeline-worker install` 安装。

## Runner 握手

一个 job = 一个 worker 进程。runner（S3 契约）spawn：

```sh
dsh-jsonrpc-agent <path>/worker.cordis.yml   # or DSH_CORDIS_CONFIG=<path>
```

`cwd` = job worktree，环境注入：

| 变量 | 用途 |
|---|---|
| `PIPELINE_ID` / `STATE_ID` / `JOB_ID` / `NODE_ID` | 管线身份（写入会话标签） |
| `LMO_WORKTREE_PATH` | job worktree（worker 的 `DSH_CWD`） |
| `LMO_REPO` / `LMO_BRANCH` | 目标仓库与分支 |
| `LMO_SERVER_HOST` / `LMO_SERVER_SECRET_ID` / `LMO_SERVER_SECRET_KEY` | lmo-server HMAC 凭据 |
| `DSH_WORKER_PROFILE` | 本 profile 名 |

部署开关：`DSH_CWD`、`DSH_SESSION_ROOT`（默认共享 `$DSH_HOME/sessions`）、`DSH_LMTECH_SKILL_DIRS`（额外 skill 根目录 JSON 数组；默认指向本机 HermesAgentSkills lmtech skills）、`DSH_WORKER_SUBAGENT_BIN` / `DSH_WORKER_SUBAGENT_ARGS`（dsh-sdk 子运行时可执行与参数——生产配置构建后的 `dsh-jsonrpc-agent` + 本文件）、`DEEPSEEK_API_KEY` / `DEEPSEEK_BASE_URL` / `DSH_PROVIDER` / `DSH_MODEL`。

PRD 与 job command 作为 `session/prompt` 内容块进入；进度经 `session.event` 流式输出；结构化结果由 worker 写入 `<worktree>/.lmo/output.json`（`{"result":[{"type","value","name","note"}]}`），并经 `pipeline_report_node` 工具上报。

## Model Experience

persona 是固化、由部署选定的系统提示词：模型看到执行与分解两套工作流和注入环境契约，不含浏览器或宿主词汇。工具 schema 来自组合行（文件系统、shell、todo、subagent/subagent_dsh、`pipeline_*` 工具、skill 加载器）。

#### Token 影响

persona 是固定前缀；PRD 与 job command 作为用户消息进入并保留在历史中，直到压缩。

#### KV Cache 影响

仅追加；固化 persona 使请求前缀跨 job 稳定，provider 缓存复用只取决于 provider/model 与历史。

## Known Limitations and Deferred Work

- **Windows 没有内置终端后端** —— `terminal-bash` 与 `tool-terminal` 在 win32 禁用；Windows 开发走 pwsh 栈，POSIX 生产走 bash 栈。
- **dsh-sdk 子 agent 参数必须按部署显式配置** —— 构建后的 `dsh-jsonrpc-agent` + 配置路径无法在已安装包内推断，因此 `DSH_WORKER_SUBAGENT_BIN` / `DSH_WORKER_SUBAGENT_ARGS` 无回退命令行。
- **分解动作经 `lmo_server_api.py` 写 state/job** —— `pipeline_*` 工具集覆盖读取与上报；创建走 lmtech skill 的业务接口脚本，与 Go runner 的 `DecomposeStatePrompt` 语义一致。
