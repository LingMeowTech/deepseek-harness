import { describe, expect, it, vi } from 'vitest'
import { Context } from '@deepseek-ai/cordis'
import { CallId } from '@deepseek-ai/dsh-llm'
import SystemPrompt from '@deepseek-ai/dsh-system-prompt'
import ToolRuntime, { type ToolExecutionResult } from '@deepseek-ai/dsh-tools'
import * as ToolPipeline from '@deepseek-ai/dsh-tool-lmo-pipeline'
import type { LmoPipeline } from '@deepseek-ai/dsh-lmo-pipeline'

const signal = new AbortController().signal
let nextCall = 1

/** Canned pipeline service; methods not used by the test are absent. */
function pipelineService() {
  return {
    listProjects: vi.fn(() => Promise.resolve([{
      projectId: 'proj-1', parentId: 'root', name: '平台项目', status: 2,
      pipelineTotal: 3, pipelineRunning: 1, pipelineStopped: 2,
    }])),
    listPipelines: vi.fn((projectId?: string, running?: boolean) => Promise.resolve([{
      pipelineId: 'pipe-1', projectId: projectId ?? 'proj-1', name: '迁移管线',
      status: 4, stateTotal: 2, stateCompleted: 2, jobTotal: 3, jobCompleted: 3,
      isLooping: false,
    }].filter(() => running === undefined || running))),
    getPipeline: vi.fn(() => Promise.resolve({
      pipelineId: 'pipe-1', projectId: 'proj-1', name: '迁移管线', status: 1,
      repo: 'deepseek-harness', branch: 'dev', isLooping: false,
      prd: { version: 'v2', content: '# 迁移\n执行迁移' },
      states: [{
        stateId: 'state-1', pipelineId: 'pipe-1', name: '改造', status: 0,
        isDecomposed: false, isLooping: false, jobTotal: 1, jobCompleted: 0,
      }],
      jobs: [{ jobId: 'job-1', stateId: 'state-1', name: '写代码', status: 0 }],
    })),
    pushPrd: vi.fn(() => Promise.resolve({ pipelineId: 'pipe-1', prdVersion: 'v9' })),
    approve: vi.fn(() => Promise.resolve({ pipelineId: 'pipe-1', status: 2 })),
    listStates: vi.fn(() => Promise.resolve([{
      stateId: 'state-1', pipelineId: 'pipe-1', name: '改造', status: 3,
      isDecomposed: false, isLooping: false, jobTotal: 2, jobCompleted: 1,
    }])),
    listJobs: vi.fn(() => Promise.resolve([{ jobId: 'job-1', stateId: 'state-1', name: '写代码', status: 4 }])),
    rerunPipeline: vi.fn(() => Promise.resolve({ pipelineId: 'pipe-1', resetCount: 5 })),
    reportNode: vi.fn(() => Promise.resolve({ ok: true })),
  } as unknown as LmoPipeline
}

async function mountTools() {
  const ctx = new Context()
  await ctx.plugin(SystemPrompt)
  await ctx.plugin(ToolRuntime)
  const pipeline = pipelineService()
  ctx.provide('lmoPipeline', pipeline as never)
  const fiber = await ctx.plugin(ToolPipeline, {})
  const call = (name: string, args: unknown): Promise<ToolExecutionResult> => ctx.tools.execute({
    signal, callId: CallId(`pipeline-call-${nextCall++}`), name, arguments: args,
  })
  return { ctx, pipeline, fiber, call }
}

describe('pipeline tool schemas', () => {
  it('registers every pipeline_* tool and disposes them with the plugin fiber', async () => {
    const { ctx, fiber } = await mountTools()
    expect(ctx.tools.schemas().map(schema => schema.name).sort()).toEqual([
      'pipeline_approve', 'pipeline_get', 'pipeline_jobs', 'pipeline_pipelines',
      'pipeline_prd', 'pipeline_projects', 'pipeline_report_node', 'pipeline_rerun',
      'pipeline_states',
    ].sort())
    await fiber.dispose()
    expect(ctx.tools.schemas()).toEqual([])
  })

  it('states high-risk consequences in approve, rerun, and report_node descriptions', async () => {
    const { ctx, fiber } = await mountTools()
    expect(ctx.tools.get('pipeline_approve')?.description).toContain('不可逆')
    expect(ctx.tools.get('pipeline_rerun')?.description).toContain('高风险')
    expect(ctx.tools.get('pipeline_report_node')?.description).toContain('高风险')
    expect(ctx.tools.get('pipeline_report_node')?.description).toContain('已完成')
    await fiber.dispose()
  })

  it('has no default export (function-plugin namespace shape)', () => {
    expect('default' in ToolPipeline).toBe(false)
  })
})

describe('pipeline tool result text', () => {
  it('renders project names and the status code mapping', async () => {
    const { call, fiber } = await mountTools()
    const out = await call('pipeline_projects', {})
    expect(out.isError).toBe(false)
    const text = out.content.map(block => block.type === 'text' ? block.text : '').join('')
    expect(text).toContain('平台项目')
    expect(text).toContain('开发中（状态：2）')
    await fiber.dispose()
  })

  it('renders a pipeline detail with PRD, state, and job names', async () => {
    const { call, fiber } = await mountTools()
    const out = await call('pipeline_get', { pipeline_id: 'pipe-1' })
    expect(out.isError).toBe(false)
    const text = out.content.map(block => block.type === 'text' ? block.text : '').join('')
    expect(text).toContain('迁移管线')
    expect(text).toContain('# 迁移')
    expect(text).toContain('改造')
    expect(text).toContain('写代码')
    expect(text).toContain('待审批（状态：1）')
    expect(text).toContain('待规划（状态：0）')
    await fiber.dispose()
  })

  it('forwards high-risk actions to the seam and reports their outcomes', async () => {
    const { pipeline, call, fiber } = await mountTools()
    const approve = await call('pipeline_approve', { pipeline_id: 'pipe-1' })
    expect(approve.isError).toBe(false)
    // oxlint-disable-next-line typescript/unbound-method -- vi.fn mock reference, not a live receiver
    expect(pipeline.approve).toHaveBeenCalledWith('pipe-1')
    expect(approve.content.map(block => block.type === 'text' ? block.text : '').join('')).toContain('开发中（状态：2）')

    const rerun = await call('pipeline_rerun', { pipeline_id: 'pipe-1' })
    expect(rerun.content.map(block => block.type === 'text' ? block.text : '').join('')).toContain('5 个节点')

    const report = await call('pipeline_report_node', {
      runner_id: 'runner-1', node_id: 'node-1', status: 4, desc: 'done', output: '{"ok":true}',
    })
    expect(pipeline.reportNode).toHaveBeenCalledWith('runner-1', 'node-1', 4, 'done', '{"ok":true}')
    expect(report.content.map(block => block.type === 'text' ? block.text : '').join('')).toContain('已完成（状态：4）')
    await fiber.dispose()
  })

  it('declares generic render intent for terminal lists and details', async () => {
    const { ctx, fiber } = await mountTools()
    for (const name of ['pipeline_projects', 'pipeline_pipelines', 'pipeline_get']) {
      // oxlint-disable-next-line typescript/unbound-method -- registry returns a detached presenter function
      const present = ctx.tools.get(name)?.presentCall
      expect(present?.(name === 'pipeline_get' ? { pipeline_id: 'p' } : {})).toMatchObject({ card: 'generic' })
    }
    await fiber.dispose()
  })
})

describe('tool-lmo-pipeline config', () => {
  it('caps rendered PRD characters', async () => {
    const ctx = new Context()
    await ctx.plugin(SystemPrompt)
    await ctx.plugin(ToolRuntime)
    ctx.provide('lmoPipeline', pipelineService() as never)
    const fiber = await ctx.plugin(ToolPipeline, { maxPrdChars: 5 })
    const out = await ctx.tools.execute({
      signal, callId: CallId('prd-cap'), name: 'pipeline_get', arguments: { pipeline_id: 'pipe-1' },
    })
    const text = out.content.map(block => block.type === 'text' ? block.text : '').join('')
    expect(text).toContain('[PRD 已截断')
    await fiber.dispose()
  })

  it.each([0, -1, 1.5])('rejects an invalid maxPrdChars value %s at load', async (value) => {
    const ctx = new Context()
    await ctx.plugin(SystemPrompt)
    await ctx.plugin(ToolRuntime)
    ctx.provide('lmoPipeline', pipelineService() as never)
    await expect(ctx.plugin(ToolPipeline, { maxPrdChars: value }))
      .rejects.toThrow(/tool-lmo-pipeline: maxPrdChars must be a positive integer/)
  })
})
