# Agent Note: LMO pipeline worker bundle and profile

Status: implemented

[English](2026-08-15-lmo-pipeline-worker-bundle.md) | 中文

## Problem

DSH 平台迁移需要一个能被 Go runner 作为单个 pipeline job spawn 的 DSH 进程：一个具备文件系统、shell、subagent、skill 与 pipeline 工具的完整 agent harness，通过构建后的 `dsh-jsonrpc-agent` 可执行文件说冻结的 stdio JSON-RPC 握手协议，并把结构化结果写入 `<worktree>/.lmo/output.json`。worker 不得加载 web-app 层。其模型可见的执行/分解工作流必须逐字节稳定（请求缓存与快照稳定性），它铸造的每个会话都必须携带 pipeline 身份标签。

## Decision

`packages/bundle/lmo-pipeline-worker` 以两种部署形态交付同一组合：

- `cordis.patch.yml` —— 覆盖 `@deepseek-ai/dsh-base` 的 `dsh --profile lmo-pipeline-worker` 层，用于开发与验证。它禁用 HMR、强制 `approval.policy: never`、加入 lmtech skill 根，并插入 worker 独有行（jsonrpc server、storage/session-tags/pipeline-worker-tags、lmo-pipeline seam、dsh-sdk subagent 后端、terminal）。
- `worker.cordis.yml` —— runner 传给构建后 `dsh-jsonrpc-agent` 可执行文件的扁平 `DSH_CORDIS_CONFIG` 组合（每个 pipeline job 一个进程）。它是独立 include 叶子，重声明所需每一行；profile 层独立于它存在。

冻结的模型可见 persona（`src/prompts.ts`）钉住执行工作流、分解工作流与注入环境契约。`cordis.patch.yml` 与 `worker.cordis.yml` 内联同一字面量；`tests/bundle.spec.ts` 把三份副本钉在一起，使模型可见文本不会跨部署形态漂移。

`src/pipeline-worker-tags.ts` 通过 `@deepseek-ai/dsh-session-tags` 注册表把 runner 注入的 `PIPELINE_ID` / `STATE_ID` / `JOB_ID` / `NODE_ID` 写到 worker 铸造的每个会话上，使 `session.tags.list`（以及 host 的 `session-tags-changed` 流）能识别 pipeline 会话，而无需 Go runner 维护第二套会话权威。

dsh-sdk subagent 后端（`subagent-dsh-sdk` 行）用 `scrubbedParentEnv()` spawn 每个子进程，该函数会丢弃 `LMO_SERVER_*`（形似凭据）与所有 `DSH_*` 名称。子进程启动同一份 `worker.cordis.yml`，其 `lmo-pipeline` 行要求 LMO 凭据，所以配置在行内 `env` 中显式重新转发 `LMO_SERVER_HOST` / `LMO_SERVER_SECRET_ID` / `LMO_SERVER_SECRET_KEY`（外加 `DEEPSEEK_*` 与 `DSH_SESSION_ROOT` 事实），在 scrub 之后合并。profile 层的同一行也转发这三个键。

`apps/cli/package.json`、`packages/boot/app-boot/src/profile.ts`（`lmo-pipeline-worker` 模板元组 `[dsh-base, dsh-bundle-lmo-pipeline-worker]`）与 `tsconfig.host.json` 注册该 bundle，使 `dsh --profile lmo-pipeline-worker --dump-config` 无需用户侧 profile 配置即可解析。

## Alternatives considered

- **同一份 cordis.yml 同时服务 profile 与扁平握手** —— 拒绝：profile 机制以 insert 语义把 `dsh-base` 作为 patch 基座，而 runner 握手想要无基座的扁平叶子；两种形态行集与归属不同。
- **让 dsh-sdk 子进程继承父进程环境** —— 拒绝：subprocess seam 的 `scrubbedParentEnv()` 是唯一共享清理定义，刻意丢弃形似凭据与 `DSH_*` 的名称；环境继承既会泄漏 harness 身份，也会让子进程自己的 `lmo-pipeline` 行缺少凭据。
- **把 web-app 层加载进 worker** —— 拒绝：任务明确禁止浏览器 UI / client 行；worker 只加载执行 spine。

## Consequences

- S3 的冻结握手（环境契约、`.lmo/output.json` 规范、stdio JSON-RPC）与本 bundle 对齐；S7 可以用 `DSH_BIN=dsh-jsonrpc-agent` + `DSH_CORDIS_CONFIG=<worker.cordis.yml>` 加注入的 `PIPELINE_ID` / `LMO_SERVER_*` / `LMO_WORKTREE_PATH` / `DSH_WORKER_PROFILE` 环境拉起 worker。
- worker 的子 agent 并发意味着独立的 dsh-sdk harness 进程；keyless e2e 驱动两次并行 `subagent_dsh` 委派，并断言两个子报告与请求时间重叠。
- keyless smoke e2e（脚本化本地模型服务器）无需模型 key 即可走真实启动路径，CI 可运行；验证组合不要求真实 API 运行。
- 模型可见 persona 有三份钉住副本；任何有意的文本修改都必须同时更新 `prompts.ts` 与两个 yml 文件，并让 `bundle.spec.ts` 捕获漂移。
