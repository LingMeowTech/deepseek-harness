/**
 * Keyless end-to-end smoke for the lmo-pipeline-worker composition: boots the
 * real `dsh-jsonrpc-agent` source bin over `worker.cordis.yml`, drives the
 * frozen stdio JSON-RPC handshake against a scripted local model server, and
 * asserts the worker-visible outcomes: `.lmo/output.json` written by the
 * model-driven `write` tool, pipeline session tags durably stored, and two
 * concurrent dsh-sdk subagent child processes returning their reports.
 */

import { createServer } from 'node:http'
import { existsSync, mkdirSync, readFileSync, readdirSync } from 'node:fs'
import { mkdtemp, readdir, rm } from 'node:fs/promises'
import { join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { execa } from 'execa'
import { describe, expect, it } from 'vitest'

const binScript = fileURLToPath(new URL('../../../../packages/examples/jsonrpc-demo/src/bin.ts', import.meta.url))
const workerConfig = fileURLToPath(new URL('../worker.cordis.yml', import.meta.url))
const repoRoot = fileURLToPath(new URL('../../../..', import.meta.url))

interface RecordedRequest {
  body: Record<string, unknown>
  receivedAt: number
  respondedAt?: number
}

/** One OpenAI-compatible SSE chat completion, driven by a per-request script. */
function sseChunks(
  response: import('node:http').ServerResponse,
  chunks: readonly unknown[],
): void {
  for (const chunk of chunks) {
    response.write(`data: ${JSON.stringify(chunk)}\n\n`)
  }
  response.write('data: [DONE]\n\n')
  response.end()
}

function deltaChunk(delta: Record<string, unknown>, finish: string | null = null): Record<string, unknown> {
  return { choices: [{ index: 0, delta, finish_reason: finish }] }
}

/** A finish_reason tool_calls chunk carrying two parallel tool calls. */
function toolCallsChunk(calls: readonly { index: number; id: string; name: string; args: string }[]): Record<string, unknown> {
  return {
    choices: [{
      index: 0,
      delta: { tool_calls: calls.map(call => ({
        index: call.index,
        id: call.id,
        type: 'function',
        function: { name: call.name, arguments: call.args },
      })) },
      finish_reason: null,
    }],
  }
}

function textChunk(text: string, finish: string): Record<string, unknown> {
  return { choices: [{ index: 0, delta: { content: text }, finish_reason: finish }] }
}

function startModelServer(
  script: (request: Record<string, unknown>, response: import('node:http').ServerResponse, records: RecordedRequest[]) => void,
): Promise<{ port: number; records: RecordedRequest[]; close: () => Promise<void> }> {
  const records: RecordedRequest[] = []
  const server = createServer((request, response) => {
    let body = ''
    request.setEncoding('utf8')
    request.on('data', (chunk: string) => { body += chunk })
    request.on('end', () => {
      const record: RecordedRequest = { body: JSON.parse(body) as Record<string, unknown>, receivedAt: Date.now() }
      records.push(record)
      response.writeHead(200, { 'content-type': 'text/event-stream' })
      response.on('close', () => { record.respondedAt = Date.now() })
      script(record.body, response, records)
    })
  })
  return new Promise(resolve => server.listen(0, '127.0.0.1', () => {
    const address = server.address()
    if (address === null || typeof address === 'string') throw new Error('model server did not bind a TCP port')
    resolve({
      port: address.port,
      records,
      close: () => new Promise<void>(done => server.close(() => done())),
    })
  }))
}

function waitForLine(
  lines: string[],
  predicate: (value: Record<string, unknown>) => boolean,
  stderr: () => string,
): Promise<Record<string, unknown>> {
  return new Promise((resolve, reject) => {
    const deadline = Date.now() + 60_000
    const poll = (): void => {
      while (lines.length > 0) {
        const line = lines.shift()!
        if (!line.trim()) continue
        try {
          const value = JSON.parse(line) as Record<string, unknown>
          if (predicate(value)) { resolve(value); return }
        } catch {
          reject(new Error(`non-JSON stdout from JSON-RPC agent runtime: ${line}`))
          return
        }
      }
      if (Date.now() >= deadline) {
        reject(new Error(`timed out waiting for JSON-RPC response; stderr=${stderr()}`))
        return
      }
      setTimeout(poll, 5)
    }
    poll()
  })
}

interface WorkerChild {
  lines: string[]
  stderr: string
  child: ReturnType<typeof execa>
}

function spawnWorker(
  modelPort: number,
  env: Record<string, string>,
  cwd: string,
): WorkerChild {
  const child = execa(process.execPath, ['--import', 'tsx', binScript, workerConfig], {
    cwd,
    env: {
      DEEPSEEK_API_KEY: 'keyless-worker-smoke',
      DEEPSEEK_BASE_URL: `http://127.0.0.1:${modelPort}/v1`,
      // Keyless smoke never calls lmo-server; the provider still needs a
      // load-valid credential set.
      LMO_SERVER_HOST: 'https://127.0.0.1:1',
      LMO_SERVER_SECRET_ID: 'keyless-smoke-id',
      LMO_SERVER_SECRET_KEY: 'a'.repeat(64),
      ...env,
    },
    timeout: 90_000,
    killSignal: 'SIGKILL',
    reject: false,
  })
  const lines: string[] = []
  let stdoutBuffer = ''
  let stderr = ''
  child.stdout?.on('data', (chunk: Buffer) => {
    stdoutBuffer += chunk.toString('utf8')
    const parts = stdoutBuffer.split('\n')
    stdoutBuffer = parts.pop() ?? ''
    lines.push(...parts)
  })
  child.stderr?.on('data', (chunk: Buffer) => { stderr += chunk.toString('utf8') })
  return { lines, stderr, child: child as unknown as ReturnType<typeof execa> }
}

/** The runner-shaped minimal pipeline job prompt (S3 frozen layout). */
function pipelineJobPrompt(outputPath: string): string {
  return [
    'pipeline_id: test-pipeline-1',
    'stage: smoke-state',
    'state_id/job_id/node_id: smoke-state / smoke-job / smoke-state',
    `工作目录: ${outputPath}`,
    'repo: smoke/repo branch: dev-smoke',
    '',
    'job command:',
    '把结构化结果写入 .lmo/output.json（{"result":[{"type":"markdown","value":"smoke 完成","name":"smoke_output"}]}），然后输出一句话进度。',
  ].join('\n')
}

describe('lmo-pipeline-worker keyless smoke', () => {
  // Source-launched workers and their dsh-sdk children resolve bare specifiers
  // (`--import tsx`, plugin packages) through the parent-directory walk, so
  // the smoke worktree lives under the repo root during development; the
  // packaged executable needs no such anchor.
  const smokeRoot = fileURLToPath(new URL('../../../.tmp-lmo-worker-smoke', import.meta.url))

  it('runs a minimal pipeline job and writes .lmo/output.json with pipeline session tags', async () => {
    const root = await mkdtemp(`${smokeRoot}-`)
    const worktree = join(root, 'worktree')
    mkdirSync(join(worktree, '.lmo'), { recursive: true })
    const home = join(root, 'home')
    mkdirSync(home, { recursive: true })
    const outputPath = join(worktree, '.lmo', 'output.json')
    const outputContent = JSON.stringify({ result: [{ type: 'markdown', value: 'smoke 完成', name: 'smoke_output' }] })

    // Request 1: the model writes the structured result; request 2: it closes
    // with a progress line. Anything after the script exhausts fails loud.
    let calls = 0
    const model = await startModelServer((_request, response) => {
      calls += 1
      if (calls === 1) {
        const args = JSON.stringify({ file_path: outputPath.replace(/\\/g, '\\\\'), content: outputContent })
        sseChunks(response, [
          toolCallsChunk([{ index: 0, id: 'call-write', name: 'write', args }]),
          deltaChunk({ tool_calls: [{ index: 0, function: { arguments: '' } }] }, null),
          { choices: [{ index: 0, delta: {}, finish_reason: 'tool_calls' }], usage: { prompt_tokens: 10, completion_tokens: 2 } },
        ])
        return
      }
      if (calls === 2) {
        sseChunks(response, [textChunk('已完成 smoke job', 'stop')])
        return
      }
      response.writeHead(500).end()
    })

    const worker = spawnWorker(model.port, {
      DSH_CWD: worktree,
      DSH_HOME: home,
      PIPELINE_ID: 'test-pipeline-1',
      STATE_ID: 'smoke-state',
      JOB_ID: 'smoke-job',
      NODE_ID: 'smoke-state',
      LMO_WORKTREE_PATH: worktree,
      LMO_REPO: 'smoke/repo',
      LMO_BRANCH: 'dev-smoke',
      DSH_WORKER_PROFILE: 'lmo-pipeline-worker',
    }, repoRoot)

    try {
      worker.child.stdin?.write(`${JSON.stringify({
        jsonrpc: '2.0',
        id: 1,
        method: 'initialize',
        params: { cwd: worktree, provider: 'deepseek-official', model: 'deepseek-v4-pro', maxTokens: 2048 },
      })}\n`)
      const initialized = await waitForLine(worker.lines, value => value.id === 1, () => worker.stderr)
      expect(initialized).toMatchObject({
        jsonrpc: '2.0',
        id: 1,
        result: { serverInfo: { name: 'deepseek-harness-sdk-runtime' } },
      })

      worker.child.stdin?.write(`${JSON.stringify({
        jsonrpc: '2.0',
        id: 2,
        method: 'session/prompt',
        params: { sessionId: 'smoke-session', contentBlocks: [{ type: 'text', text: pipelineJobPrompt(worktree) }] },
      })}\n`)
      const prompt = await waitForLine(worker.lines, value => value.id === 2, () => worker.stderr)
      expect(prompt).toMatchObject({ jsonrpc: '2.0', id: 2, result: { messageId: expect.any(String) as unknown } })

      // The whole agent lifecycle streams through session.event; the smoke
      // turn ends with a clean stop.
      const turnEnd = await waitForLine(worker.lines, (value) => {
        if (value.method !== 'session.event') return false
        const params = value.params as Record<string, unknown> | undefined
        const event = params?.event as Record<string, unknown> | undefined
        return params?.sessionId === 'smoke-session' && event?.type === 'turn/end'
      }, () => worker.stderr)
      expect(turnEnd).toMatchObject({
        jsonrpc: '2.0',
        method: 'session.event',
        params: { sessionId: 'smoke-session', event: { type: 'turn/end', data: { reason: { kind: 'completed' } } } },
      })

      worker.child.stdin?.write(`${JSON.stringify({ jsonrpc: '2.0', id: 3, method: 'shutdown' })}\n`)
      const shutdown = await waitForLine(worker.lines, value => value.id === 3, () => worker.stderr)
      expect(shutdown).toMatchObject({ jsonrpc: '2.0', id: 3, result: {} })
      const exit = await worker.child
      expect(exit.exitCode, `signal=${String(exit.signal)}; stderr=${worker.stderr}`).toBe(0)

      // The model-driven write tool produced the structured result file.
      expect(existsSync(outputPath)).toBe(true)
      expect(JSON.parse(readFileSync(outputPath, 'utf8'))).toEqual({
        result: [{ type: 'markdown', value: 'smoke 完成', name: 'smoke_output' }],
      })

      // Pipeline session tags persist in the shared storage root.
      const storageRoot = join(home, 'storages')
      expect(existsSync(storageRoot)).toBe(true)
      const tagged = readdirSync(storageRoot, { recursive: true, encoding: 'utf8' })
        .map(file => join(storageRoot, file))
        .filter(file => file.endsWith('.json'))
        .map(file => readFileSync(file, 'utf8'))
        .join('\n')
      expect(tagged).toContain('pipeline_id:test-pipeline-1')
      expect(tagged).toContain('job_id:smoke-job')
    } finally {
      worker.child.kill('SIGKILL')
      await worker.child.catch(() => {})
      await model.close()
      await rm(root, { recursive: true, force: true })
    }
  }, 120_000)

  it('delegates two concurrent dsh-sdk subagent child processes and receives both reports', async () => {
    const root = await mkdtemp(`${smokeRoot}-sub-`)
    const worktree = join(root, 'worktree')
    mkdirSync(join(worktree, '.lmo'), { recursive: true })
    const home = join(root, 'home')
    mkdirSync(home, { recursive: true })
    const sessionsRoot = join(root, 'sessions')

    // Parent request 1 asks for two subagent_dsh delegations in ONE turn
    // (parallel tool calls); each child boots a full harness process and hits
    // this same server; parent request 2 closes after both reports return.
    let parentTurns = 0
    // Hold both child responses until the second child request arrives, so
    // the overlap assertion is deterministic: an immediate first-child reply
    // closes the SSE window before the heavier second child process boots,
    // which flaked the concurrency check.
    const heldChildResponses: import('node:http').ServerResponse[] = []
    const model = await startModelServer((_request, response, _records) => {
      parentTurns += 1
      if (parentTurns === 1) {
        const argsA = JSON.stringify({ description: '子任务 A', prompt: '输出: child-A-marker，然后结束。' })
        const argsB = JSON.stringify({ description: '子任务 B', prompt: '输出: child-B-marker，然后结束。' })
        sseChunks(response, [
          toolCallsChunk([
            { index: 0, id: 'call-a', name: 'subagent_dsh', args: argsA },
            { index: 1, id: 'call-b', name: 'subagent_dsh', args: argsB },
          ]),
          deltaChunk({ tool_calls: [{ index: 0, function: { arguments: '' } }, { index: 1, function: { arguments: '' } }] }, null),
          { choices: [{ index: 0, delta: {}, finish_reason: 'tool_calls' }], usage: { prompt_tokens: 10, completion_tokens: 2 } },
        ])
        return
      }
      // Child processes: both boot at once; answer with the child's marker.
      if (parentTurns === 2 || parentTurns === 3) {
        heldChildResponses.push(response)
        if (heldChildResponses.length === 2) {
          for (const held of heldChildResponses) {
            sseChunks(held, [textChunk('child-marker-report', 'stop')])
          }
        }
        return
      }
      if (parentTurns === 4) {
        sseChunks(response, [textChunk('两个子 agent 已完成', 'stop')])
        return
      }
      response.writeHead(500).end()
    })

    const worker = spawnWorker(model.port, {
      DSH_CWD: worktree,
      DSH_HOME: home,
      DSH_SESSION_ROOT: sessionsRoot,
      DSH_WORKER_SUBAGENT_BIN: process.execPath,
      DSH_WORKER_SUBAGENT_ARGS: JSON.stringify(['--import', 'tsx', binScript, workerConfig]),
      PIPELINE_ID: 'test-pipeline-2',
      STATE_ID: 'sub-state',
      JOB_ID: 'sub-job',
      NODE_ID: 'sub-state',
      LMO_WORKTREE_PATH: worktree,
    }, repoRoot)

    try {
      worker.child.stdin?.write(`${JSON.stringify({
        jsonrpc: '2.0', id: 1, method: 'initialize',
        params: { cwd: worktree, provider: 'deepseek-official', model: 'deepseek-v4-pro' },
      })}\n`)
      await waitForLine(worker.lines, value => value.id === 1, () => worker.stderr)

      worker.child.stdin?.write(`${JSON.stringify({
        jsonrpc: '2.0', id: 2, method: 'session/prompt',
        params: {
          sessionId: 'delegating-session',
          contentBlocks: [{ type: 'text', text: '委派两个 subagent_dsh 子 agent 并行完成任务。' }],
        },
      })}\n`)
      await waitForLine(worker.lines, value => value.id === 2, () => worker.stderr)

      // Both delegations return their reports before the turn ends cleanly.
      const toolResults: string[] = []
      const seenResults: string[] = []
      const turnEnd = await waitForLine(worker.lines, (value) => {
        if (value.method !== 'session.event') return false
        const params = value.params as Record<string, unknown> | undefined
        const event = params?.event as Record<string, unknown> | undefined
        if (params?.sessionId !== 'delegating-session') return false
        if (event?.type === 'tool/result') {
          const data = event.data as { message?: { content?: unknown } } | undefined
          const text = JSON.stringify(data?.message?.content ?? '')
          seenResults.push(text.slice(0, 400))
          if (text.includes('child-marker-report')) toolResults.push(text)
        }
        return event?.type === 'turn/end'
      }, () => worker.stderr)
      expect(turnEnd).toMatchObject({
        jsonrpc: '2.0',
        method: 'session.event',
        params: { sessionId: 'delegating-session', event: { type: 'turn/end', data: { reason: { kind: 'completed' } } } },
      })
      expect(toolResults, `seen tool results: ${JSON.stringify(seenResults)}\nstderr: ${worker.stderr.slice(-800)}`).toHaveLength(2)

      // Concurrency evidence: the two child model requests overlapped in
      // time — the second child's request arrived before the first child's
      // response completed. A child request is one whose user message is the
      // delegating prompt itself (the parent's own turns carry the marker
      // only inside tool-call arguments and tool results).
      const childRequests = model.records.filter(record =>
        (record.body.messages as Record<string, unknown>[] | undefined)?.some((message) => {
          if (message?.role !== 'user' || typeof message.content !== 'string') return false
          return message.content.includes('child-A-marker') || message.content.includes('child-B-marker')
        }),
      )
      expect(childRequests.length, `child requests=${JSON.stringify(model.records.map(r => (r.body.messages as unknown[] | undefined)?.length))}`).toBe(2)
      const first = childRequests[0]!
      const second = childRequests[1]!
      expect(Math.max(first.receivedAt, second.receivedAt))
        .toBeLessThanOrEqual(Math.min(first.respondedAt ?? Number.MAX_SAFE_INTEGER, second.respondedAt ?? Number.MAX_SAFE_INTEGER))

      // Each child is a real independent harness process with its own
      // persisted session under the shared root.
      const sessionFiles = await readdir(sessionsRoot, { recursive: true })
      const sessionLogs = sessionFiles.filter(file => String(file).includes('session'))
      expect(sessionLogs.length).toBeGreaterThanOrEqual(3)

      worker.child.stdin?.write(`${JSON.stringify({ jsonrpc: '2.0', id: 3, method: 'shutdown' })}\n`)
      await waitForLine(worker.lines, value => value.id === 3, () => worker.stderr)
      const exit = await worker.child
      expect(exit.exitCode, `signal=${String(exit.signal)}; stderr=${worker.stderr}`).toBe(0)
    } finally {
      worker.child.kill('SIGKILL')
      await worker.child.catch(() => {})
      await model.close()
      await rm(root, { recursive: true, force: true })
    }
  }, 180_000)
})
