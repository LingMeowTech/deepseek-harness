# `@deepseek-ai/dsh-bundle-lmo-pipeline-worker`

English | [中文](README.zh.md)

The LMO pipeline job worker composition: one pipeline job runs as one standalone DeepSeek Harness worker process, driven by the frozen runner handshake. The package ships:

- [`cordis.patch.yml`](cordis.patch.yml) — the `dsh --profile lmo-pipeline-worker` bundle layer (over `dsh-base`): the stdio JSON-RPC server, the LMO pipeline seam (`dsh-lmo-pipeline-http` + `dsh-tool-lmo-pipeline`), the subagent seam with the out-of-process `dsh-sdk` backend, todo/session spine (via dsh-base), the skill stack with lmtech roots, and the pipeline session-tag writer — with no web-app or browser client rows.
- [`worker.cordis.yml`](worker.cordis.yml) — the flat composition for the frozen `DSH_CORDIS_CONFIG` handshake (the Go runner spawns the built `dsh-jsonrpc-agent` executable with this file).
- [`src/prompts.ts`](src/prompts.ts) — the frozen model-visible persona: the execution workflow (PRD/autoPlan → worktree → TDD → git step commits → verification → AutoPlan writeback → pipeline tool report → `.lmo/output.json`) and the decompose workflow (skill/issue/PRD → PRD TDD acceptance → AutoPlan → state/job split with dependency edges, leaf `type=job`, self-contained `desc_text` → issue report). Both composition files inline the same text; tests pin all copies together.
- [`src/pipeline-worker-tags.ts`](src/pipeline-worker-tags.ts) — writes `pipeline_id:<v>` / `state_id:<v>` / `job_id:<v>` / `node_id:<v>` from the handshake environment onto every session the worker mints, through `ctx.sessionTags`.

## Profile installation

`lmo-pipeline-worker` is a shipped profile template (registered in `dsh-app-boot`):

```sh
dsh --profile lmo-pipeline-worker --dump-config
```

auto-initializes `$DSH_HOME/profiles/lmo-pipeline-worker` with the `dsh-base` + this bundle layer list on first use. To copy the profile elsewhere, create the profile directory with:

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

plus an empty `cordis.patch.yml` (`[]`), then install with `dsh plugin --profile lmo-pipeline-worker install`.

## Runner handshake

One job = one worker process. The runner (S3 contract) spawns:

```sh
dsh-jsonrpc-agent <path>/worker.cordis.yml   # or DSH_CORDIS_CONFIG=<path>
```

with `cwd` = the job worktree and this environment:

| Variable | Meaning |
|---|---|
| `PIPELINE_ID` / `STATE_ID` / `JOB_ID` / `NODE_ID` | pipeline identity (written as session tags) |
| `LMO_WORKTREE_PATH` | job worktree (the worker's `DSH_CWD`) |
| `LMO_REPO` / `LMO_BRANCH` | target repository and branch |
| `LMO_SERVER_HOST` / `LMO_SERVER_SECRET_ID` / `LMO_SERVER_SECRET_KEY` | lmo-server HMAC credentials |
| `DSH_WORKER_PROFILE` | this profile's name |

Deployment seams: `DSH_CWD`, `DSH_SESSION_ROOT` (defaults to the shared `$DSH_HOME/sessions`), `DSH_LMTECH_SKILL_DIRS` (JSON array of extra skill roots; defaults to the local HermesAgentSkills lmtech skills), `DSH_WORKER_SUBAGENT_BIN` / `DSH_WORKER_SUBAGENT_ARGS` (the dsh-sdk child runtime executable and arguments — configure the built `dsh-jsonrpc-agent` + this same file in production), `DEEPSEEK_API_KEY` / `DEEPSEEK_BASE_URL` / `DSH_PROVIDER` / `DSH_MODEL`.

The PRD and job command arrive as the `session/prompt` content blocks; progress streams through `session.event`; the structured result is written by the worker to `<worktree>/.lmo/output.json` (`{"result":[{"type","value","name","note"}]}`) and reported through the `pipeline_report_node` tool.

## Model Experience

The persona is a frozen, deployment-selected system prompt: the model sees the execution and decompose workflows plus the injected-environment contract; it receives no browser or host vocabulary. Tool schemas come from the composed rows (filesystem, shell, todo, subagent/subagent_dsh, `pipeline_*` tools, skill loader).

#### Token effect

The persona is a fixed prefix; the PRD and job command enter as the user message and stay in history until compaction.

#### KV Cache effect

Append-only; the pinned persona keeps the request prefix stable across jobs, so provider cache reuse depends only on provider/model and history.

## Known Limitations and Deferred Work

- **Windows has no shipped terminal backend** — `terminal-bash` and `tool-terminal` are disabled on win32; the pwsh stack covers Windows development, bash covers POSIX production.
- **dsh-sdk subagent arguments must be configured per deployment** — the built `dsh-jsonrpc-agent` + config path are not inferable inside an installed package, so `DSH_WORKER_SUBAGENT_BIN` / `DSH_WORKER_SUBAGENT_ARGS` are explicit (no fallback command line).
- **Decompose writes state/job through `lmo_server_api.py`** — the `pipeline_*` tool set covers reads/report; creation goes through the lmtech skill's business-interface script, mirroring the Go runner's `DecomposeStatePrompt`.
