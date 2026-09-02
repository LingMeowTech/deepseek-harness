/**
 * Model-facing `pipeline_*` tools over `ctx.lmoPipeline`. This package owns
 * schemas, Chinese result text, status rendering, and generic UI render
 * intent; it never talks to lmo-server itself. High-risk actions name their
 * consequences in the schema description.
 * @module @deepseek-ai/dsh-tool-lmo-pipeline
 */

import type { Context } from '@deepseek-ai/cordis'
import z from '@deepseek-ai/schemastery'
import {
  LmoNodeId,
  LmoPipelineId,
  LmoProjectId,
  LmoRunnerId,
  LmoStateId,
} from '@deepseek-ai/dsh-lmo-pipeline'
import type {
  LmoJobSummary,
  LmoNodeStatus,
  LmoPipelineDetail,
  LmoPipelineSummary,
  LmoProjectSummary,
  LmoStateSummary,
} from '@deepseek-ai/dsh-lmo-pipeline'
import {
  defineTool,
  type GenericCallView,
  type InferArgs,
  type ParameterSchemaSpec,
  type ValueSchemaSpec,
} from '@deepseek-ai/dsh-tools'

/** Cordis plugin name used by loader diagnostics. */
export const name = 'tool-lmo-pipeline'

/** Services required by the pipeline tool suite. */
export const inject = ['tools', 'lmoPipeline']

/** Default cap on rendered PRD characters; model results stay bounded per call. */
export const DEFAULT_MAX_PRD_CHARS = 80_000

/** Plugin config: the only deployment-varying choice is the PRD render cap. */
export interface Config {
  /** Maximum rendered PRD characters in `pipeline_get`; default 80000. */
  maxPrdChars?: number
}

export const Config: z<Config> = z.object({
  maxPrdChars: z.number().default(DEFAULT_MAX_PRD_CHARS),
})

/** Chinese labels for every lmo-server node status code. */
export const LMO_STATUS_LABELS: Readonly<Record<LmoNodeStatus, string>> = {
  0: '待规划',
  1: '待审批',
  2: '开发中',
  3: '测试中',
  4: '已完成',
  5: '已暂停',
  6: '已取消',
  7: '持续中',
}

/**
 * Render one status code as `label（状态：code）`.
 * @param status - lmo-server node status.
 * @returns the Chinese status line.
 */
export function formatStatus(status: LmoNodeStatus): string {
  return `${LMO_STATUS_LABELS[status]}（状态：${status}）`
}

/**
 * Render the project list as Chinese terminal text.
 * @param projects - lmo-server project summaries.
 * @returns the model-facing result text.
 */
export function formatProjects(projects: readonly LmoProjectSummary[]): string {
  if (projects.length === 0) return '（无项目）'
  const lines = [`项目列表（${projects.length} 个）：`]
  for (const project of projects) {
    lines.push(`- ${project.name} [${project.projectId}] 状态：${formatStatus(project.status)}`
      + `，管线：${project.pipelineTotal} 个（运行 ${project.pipelineRunning} / 停止 ${project.pipelineStopped}）`)
  }
  return lines.join('\n')
}

/**
 * Render the pipeline summary list as Chinese terminal text.
 * @param pipelines - lmo-server pipeline summaries.
 * @returns the model-facing result text.
 */
export function formatPipelines(pipelines: readonly LmoPipelineSummary[]): string {
  if (pipelines.length === 0) return '（无管线）'
  const lines = [`管线列表（${pipelines.length} 个）：`]
  for (const pipeline of pipelines) {
    lines.push(`- ${pipeline.name} [${pipeline.pipelineId}] 项目：${pipeline.projectId}`
      + ` 状态：${formatStatus(pipeline.status)}`
      + `，state：${pipeline.stateCompleted}/${pipeline.stateTotal}，job：${pipeline.jobCompleted}/${pipeline.jobTotal}`
      + (pipeline.isLooping ? '，持续管线' : ''))
  }
  return lines.join('\n')
}

/** Truncate one PRD at the configured character cap, keeping the cap visible. */
function formatPrd(prd: { version: string; content: string }, maxPrdChars: number): string {
  const content = prd.content.length <= maxPrdChars
    ? prd.content
    : `${prd.content.slice(0, maxPrdChars)}\n[PRD 已截断，共 ${prd.content.length} 字]`
  return `PRD 版本：${prd.version}\n\n${content}`
}

/**
 * Render one pipeline detail with PRD, states, and jobs as Chinese terminal text.
 * @param pipeline - lmo-server pipeline detail.
 * @param maxPrdChars - PRD character cap.
 * @returns the model-facing result text.
 */
export function formatPipeline(pipeline: LmoPipelineDetail, maxPrdChars: number): string {
  const lines = [
    `管线 ${pipeline.name} [${pipeline.pipelineId}]`,
    `项目：${pipeline.projectId} 状态：${formatStatus(pipeline.status)}`,
  ]
  if (pipeline.descText !== undefined) lines.push(`说明：${pipeline.descText}`)
  if (pipeline.repo !== undefined) lines.push(`仓库：${pipeline.repo}`)
  if (pipeline.branch !== undefined) lines.push(`分支：${pipeline.branch}`)
  if (pipeline.isLooping) lines.push('持续管线：是')
  lines.push(formatPrd(pipeline.prd, maxPrdChars))
  if (pipeline.states.length === 0) {
    lines.push('状态（state）：（无）')
  } else {
    lines.push(`状态（state）列表（${pipeline.states.length} 个）：`)
    for (const state of pipeline.states) {
      lines.push(`- ${state.name} [${state.stateId}] 状态：${formatStatus(state.status)}`
        + `，job：${state.jobCompleted}/${state.jobTotal}`)
    }
  }
  if (pipeline.jobs.length === 0) {
    lines.push('任务（job）：（无）')
  } else {
    lines.push(`任务（job）列表（${pipeline.jobs.length} 个）：`)
    for (const job of pipeline.jobs) {
      lines.push(`- ${job.name} [${job.jobId}] 状态：${formatStatus(job.status)}`)
    }
  }
  return lines.join('\n')
}

/**
 * Render the state summary list as Chinese terminal text.
 * @param states - lmo-server state summaries.
 * @returns the model-facing result text.
 */
export function formatStates(states: readonly LmoStateSummary[]): string {
  if (states.length === 0) return '（无 state）'
  const lines = [`state 列表（${states.length} 个）：`]
  for (const state of states) {
    lines.push(`- ${state.name} [${state.stateId}] 状态：${formatStatus(state.status)}`
      + `，job：${state.jobCompleted}/${state.jobTotal}`)
  }
  return lines.join('\n')
}

/**
 * Render the job summary list as Chinese terminal text.
 * @param jobs - lmo-server job summaries.
 * @returns the model-facing result text.
 */
export function formatJobs(jobs: readonly LmoJobSummary[]): string {
  if (jobs.length === 0) return '（无 job）'
  const lines = [`job 列表（${jobs.length} 个）：`]
  for (const job of jobs) {
    lines.push(`- ${job.name} [${job.jobId}] 状态：${formatStatus(job.status)}`
      + (job.command === undefined ? '' : ` 命令：${job.command}`))
  }
  return lines.join('\n')
}

/** Canonical tool value: the complete rendered Chinese text. */
interface TextResult {
  text: string
}

/** Shared output schema for every pipeline tool. */
const TEXT_SCHEMA = {
  type: 'object',
  additionalProperties: false,
  properties: {
    text: { type: 'string', required: true },
  },
} as const satisfies ValueSchemaSpec

/**
 * Register one pipeline tool with shared text output and a pure generic
 * pending-card presenter.
 */
function registerTextTool<const S extends ParameterSchemaSpec>(
  ctx: Context,
  definition: {
    name: string
    description: string
    parameters: S
    title(args: InferArgs<S>): string
    rawInput?(args: InferArgs<S>): unknown
    kind?: GenericCallView['kind']
    execute(args: InferArgs<S>): Promise<string>
  },
): void {
  ctx.tools.register(defineTool({
    name: definition.name,
    description: definition.description,
    parameters: definition.parameters,
    output: {
      schema: TEXT_SCHEMA,
      render: (_args, value: TextResult) => [{ type: 'text', text: value.text }],
    },
    async execute(args): Promise<TextResult> {
      return { text: await definition.execute(args) }
    },
    presentCall: args => ({
      card: 'generic',
      title: definition.title(args),
      ...definition.kind === undefined ? {} : { kind: definition.kind },
      ...definition.rawInput === undefined ? {} : { rawInput: definition.rawInput(args) },
    }),
  }))
}

/**
 * Register the model-facing pipeline tool suite. The provider seam owns the
 * transport; this plugin only calls `ctx.lmoPipeline` and renders results.
 * @param ctx - Cordis context carrying `tools` and `lmoPipeline`.
 * @param config - PRD render cap.
 */
export function apply(ctx: Context, config: Config): void {
  const maxPrdChars = config.maxPrdChars ?? DEFAULT_MAX_PRD_CHARS
  if (!Number.isInteger(maxPrdChars) || maxPrdChars < 1) {
    throw new Error('tool-lmo-pipeline: maxPrdChars must be a positive integer')
  }

  registerTextTool(ctx, {
    name: 'pipeline_projects',
    description: '列出 lmo-server 中的项目及其管线统计。返回项目名、状态码和管线数量。',
    parameters: {},
    title: () => '查看管线项目列表',
    kind: 'read',
    execute: async () => formatProjects(await ctx.lmoPipeline.listProjects()),
  })

  registerTextTool(ctx, {
    name: 'pipeline_pipelines',
    description: '列出管线；可按 project_id 过滤，running=true 只列出运行中（状态 2/3）的管线。',
    parameters: {
      project_id: { type: 'string', description: '项目 id（pipeline_projects 返回的 project_id）；省略则列出全部项目' },
      running: { type: 'boolean', description: 'true 只看运行中管线，false 只看非运行管线；省略则不过滤' },
    },
    title: args => `查看管线列表${args.project_id === undefined ? '' : `（项目 ${args.project_id}）`}`,
    rawInput: args => args.project_id,
    kind: 'read',
    execute: async args => formatPipelines(await ctx.lmoPipeline.listPipelines(
      args.project_id === undefined ? undefined : LmoProjectId(args.project_id),
      args.running,
    )),
  })

  registerTextTool(ctx, {
    name: 'pipeline_get',
    description: '读取一个管线的完整详情：PRD、state 列表、job 列表及各自状态码。',
    parameters: {
      pipeline_id: { type: 'string', required: true, description: '管线 id（pipeline_pipelines 返回的 pipeline_id）' },
    },
    title: args => `查看管线 ${args.pipeline_id}`,
    rawInput: args => args.pipeline_id,
    kind: 'read',
    execute: async args => formatPipeline(
      await ctx.lmoPipeline.getPipeline(LmoPipelineId(args.pipeline_id)),
      maxPrdChars,
    ),
  })

  registerTextTool(ctx, {
    name: 'pipeline_prd',
    description: '推送一个新的 PRD 版本到指定管线。管线状态会变为 1（待审批），并等待人工审批。',
    parameters: {
      pipeline_id: { type: 'string', required: true, description: '目标管线 id' },
      content: { type: 'string', required: true, description: '完整 PRD Markdown 内容' },
    },
    title: args => `推送 PRD 到管线 ${args.pipeline_id}`,
    rawInput: args => args.pipeline_id,
    kind: 'execute',
    execute: async (args) => {
      const result = await ctx.lmoPipeline.pushPrd(
        LmoPipelineId(args.pipeline_id),
        args.content,
      )
      return `已推送 PRD：管线 ${result.pipelineId}，版本 ${result.prdVersion}。当前状态：待审批（1）。`
    },
  })

  registerTextTool(ctx, {
    name: 'pipeline_approve',
    description: '批准指定管线的 PRD，并把管线推进到状态 2（开发中）。这是不可逆的状态推进：批准后 runner 会开始领取并执行该管线的 state/job，请先确认 PRD 内容。',
    parameters: {
      pipeline_id: { type: 'string', required: true, description: '要批准的管线 id' },
    },
    title: args => `批准管线 ${args.pipeline_id} 的 PRD`,
    rawInput: args => args.pipeline_id,
    kind: 'execute',
    execute: async (args) => {
      const result = await ctx.lmoPipeline.approve(LmoPipelineId(args.pipeline_id))
      return `已批准管线 ${result.pipelineId} 的 PRD，当前状态：${formatStatus(result.status)}。`
    },
  })

  registerTextTool(ctx, {
    name: 'pipeline_states',
    description: '列出一个管线下的全部 state（阶段）及状态码。',
    parameters: {
      pipeline_id: { type: 'string', required: true, description: '管线 id' },
    },
    title: args => `查看管线 ${args.pipeline_id} 的 state`,
    rawInput: args => args.pipeline_id,
    kind: 'read',
    execute: async args => formatStates(await ctx.lmoPipeline.listStates(
      LmoPipelineId(args.pipeline_id),
    )),
  })

  registerTextTool(ctx, {
    name: 'pipeline_jobs',
    description: '列出一个 state 下的全部 job（任务）及状态码。',
    parameters: {
      state_id: { type: 'string', required: true, description: 'state id（pipeline_states 返回的 state_id）' },
    },
    title: args => `查看 state ${args.state_id} 的 job`,
    rawInput: args => args.state_id,
    kind: 'read',
    execute: async args => formatJobs(await ctx.lmoPipeline.listJobs(
      LmoStateId(args.state_id),
    )),
  })

  registerTextTool(ctx, {
    name: 'pipeline_rerun',
    description: '重置管线及其全部 state/job 为待执行（0）并重新运行。高风险：会清除当前进度、重新触发执行，请先确认管线当前状态与未完成任务。',
    parameters: {
      pipeline_id: { type: 'string', required: true, description: '要重跑的管线 id' },
    },
    title: args => `重跑管线 ${args.pipeline_id}`,
    rawInput: args => args.pipeline_id,
    kind: 'execute',
    execute: async (args) => {
      const result = await ctx.lmoPipeline.rerunPipeline(
        LmoPipelineId(args.pipeline_id),
      )
      return `已重置管线 ${result.pipelineId} 待重跑，共重置 ${result.resetCount} 个节点。`
    },
  })

  registerTextTool(ctx, {
    name: 'pipeline_report_node',
    description: '向 lmo-server 回传一个 runner 节点的最新执行状态。高风险且不可逆：状态 4（已完成）会结束该节点并触发后续节点调度；错误状态（如 6 取消）可能中断整条管线，请只回传该节点真实状态。',
    parameters: {
      runner_id: { type: 'string', required: true, description: 'runner server id（该节点归属的 runner）' },
      node_id: { type: 'string', required: true, description: '要回传的节点 id' },
      status: {
        type: 'number',
        required: true,
        enum: [2, 3, 4, 6],
        description: '节点状态码：2 开发中 / 3 测试中 / 4 已完成 / 6 已取消',
      },
      desc: { type: 'string', description: '进度或结果说明' },
      output: { type: 'string', description: '节点结果数据；lmo-server 只存储、不流转' },
    },
    title: args => `回传节点 ${args.node_id} 状态 ${args.status}`,
    rawInput: args => args.node_id,
    kind: 'execute',
    execute: async (args) => {
      await ctx.lmoPipeline.reportNode(
        LmoRunnerId(args.runner_id),
        LmoNodeId(args.node_id),
        args.status,
        args.desc ?? '',
        args.output,
      )
      return `已回传节点 ${args.node_id}（runner ${args.runner_id}）状态：${formatStatus(args.status)}。`
    },
  })
}
