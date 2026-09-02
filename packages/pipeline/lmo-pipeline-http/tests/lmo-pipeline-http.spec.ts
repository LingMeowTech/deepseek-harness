import { createHash, createHmac } from 'node:crypto'
import { createServer, type IncomingMessage, type Server, type ServerResponse } from 'node:http'
import { AddressInfo } from 'node:net'
import { afterEach, describe, expect, it } from 'vitest'
import { Context } from '@deepseek-ai/cordis'
import HttpLmoPipeline from '@deepseek-ai/dsh-lmo-pipeline-http'
import {
  LmoPipelineError, LmoPipelineId, LmoProjectId,
} from '@deepseek-ai/dsh-lmo-pipeline'

const SECRET_ID = 'test-secret-id'
const SECRET_KEY = 'ab'.repeat(32)
const servers: Server[] = []

afterEach(async () => {
  await Promise.all(servers.splice(0).map(server => new Promise<void>((resolve) => {
    server.close(() => { resolve() })
  })))
})

interface CapturedRequest {
  method: string
  url: string
  headers: IncomingMessage['headers']
  body: Buffer
}

async function startServer(
  handler: (request: CapturedRequest, response: ServerResponse) => void,
): Promise<{ baseUrl: string; requests: CapturedRequest[] }> {
  const requests: CapturedRequest[] = []
  const server = createServer((request, response) => {
    const chunks: Buffer[] = []
    request.on('data', (chunk) => { chunks.push(chunk as Buffer) })
    request.on('end', () => {
      const captured: CapturedRequest = {
        method: request.method ?? 'GET',
        url: request.url ?? '/',
        headers: request.headers,
        body: Buffer.concat(chunks),
      }
      requests.push(captured)
      handler(captured, response)
    })
  })
  servers.push(server)
  await new Promise<void>(resolve => server.listen(0, '127.0.0.1', resolve))
  const address = server.address() as AddressInfo
  return { baseUrl: `http://127.0.0.1:${address.port}`, requests }
}

async function mountPipeline(baseUrl: string, config: import('@deepseek-ai/dsh-lmo-pipeline-http').Config = {}): Promise<{ ctx: Context; pipeline: import('@deepseek-ai/dsh-lmo-pipeline').LmoPipeline; dispose: () => Promise<void> }> {
  const ctx = new Context()
  const fiber = await ctx.plugin(HttpLmoPipeline, {
    baseUrl,
    secretId: SECRET_ID,
    secretKey: SECRET_KEY,
    ...config,
  })
  return { ctx, pipeline: ctx.lmoPipeline, dispose: async () => { await fiber.dispose() } }
}

/** Recompute the expected signature from the captured request, like the server verifier. */
function expectSignature(request: CapturedRequest): void {
  const timestamp = request.headers['x-timestamp']
  const nonce = request.headers['x-nonce']
  expect(typeof timestamp).toBe('string')
  expect(typeof nonce).toBe('string')
  const url = new URL(request.url, 'http://lmo.test')
  const bodySha256 = createHash('sha256').update(request.body).digest('hex')
  const canonical = `${request.method}\n${url.pathname}\n${url.search.slice(1)}\n${bodySha256}\n${String(timestamp)}\n${String(nonce)}`
  const expected = createHmac('sha256', Buffer.from(SECRET_KEY, 'hex')).update(canonical, 'utf8').digest('hex')
  expect(request.headers['x-secret-id']).toBe(SECRET_ID)
  expect(request.headers['x-signature']).toBe(expected)
}

describe('HttpLmoPipeline signing', () => {
  it('signs GET requests with the lmo_server_api canonical form and maps project summaries', async () => {
    const server = await startServer((request, response) => {
      expectSignature(request)
      response.setHeader('content-type', 'application/json')
      response.end(JSON.stringify({
        projects: [{
          project_id: 'proj-1', parent_id: 'root', name: '平台', desc_text: 'desc',
          status: 2, pipeline_total: 3, pipeline_running: 1, pipeline_stopped: 2,
          updated_at: '2026-08-15T00:00:00Z',
        }],
      }))
    })
    const { pipeline, dispose } = await mountPipeline(server.baseUrl)
    const projects = await pipeline.listProjects()
    expect(projects).toEqual([{
      projectId: LmoProjectId('proj-1'), parentId: LmoProjectId('root'), name: '平台',
      descText: 'desc', status: 2, pipelineTotal: 3, pipelineRunning: 1,
      pipelineStopped: 2, updatedAt: '2026-08-15T00:00:00Z',
    }])
    expect(server.requests).toHaveLength(1)
    expect(server.requests[0]?.method).toBe('GET')
    expect(server.requests[0]?.url).toBe('/pipeline/project/list')
    await dispose()
  })

  it('hashes the exact POST body bytes for pushPrd', async () => {
    const server = await startServer((request, response) => {
      expectSignature(request)
      expect(request.body.toString('utf8')).toBe('{"content":"# PRD"}')
      response.setHeader('content-type', 'application/json')
      response.end(JSON.stringify({ pipeline_id: 'pipe-1', prd_version: 'v3' }))
    })
    const { pipeline, dispose } = await mountPipeline(server.baseUrl)
    expect(await pipeline.pushPrd(LmoPipelineId('pipe-1'), '# PRD'))
      .toEqual({ pipelineId: 'pipe-1', prdVersion: 'v3' })
    await dispose()
  })

  it('encodes path segments before signing and keeps raw query ordering', async () => {
    const server = await startServer((request, response) => {
      expectSignature(request)
      response.setHeader('content-type', 'application/json')
      response.end(JSON.stringify({ states: [] }))
    })
    const { pipeline, dispose } = await mountPipeline(server.baseUrl)
    await pipeline.listStates(LmoPipelineId('pipe id'))
    expect(server.requests[0]?.url).toBe('/pipeline/state/list?pipeline_id=pipe+id')
    await dispose()
  })
})

describe('HttpLmoPipeline error mapping', () => {
  it.each([
    [404, 'LMO_NOT_FOUND', 'project missing'],
    [401, 'LMO_UNAUTHORIZED', 'token rejected'],
    [403, 'LMO_FORBIDDEN', 'signature mismatch'],
    [500, 'LMO_UPSTREAM_ERROR', 'storage down'],
  ] as const)('maps HTTP %s onto %s with the server error text', async (status, code, serverError) => {
    const server = await startServer((_request, response) => {
      response.statusCode = status
      response.setHeader('content-type', 'application/json')
      response.end(JSON.stringify({ error: serverError }))
    })
    const { pipeline, dispose } = await mountPipeline(server.baseUrl)
    const error = await pipeline.getProject(LmoProjectId('missing')).then(
      () => null,
      (reason: unknown) => reason as LmoPipelineError,
    )
    expect(error).toBeInstanceOf(LmoPipelineError)
    expect(error?.code).toBe(code)
    expect(error?.httpStatus).toBe(status)
    expect(error?.serverError).toBe(serverError)
    await dispose()
  })

  it('reports transport failures as LMO_REQUEST_FAILED', async () => {
    const ctx = new Context()
    const fiber = await ctx.plugin(HttpLmoPipeline, {
      baseUrl: 'http://127.0.0.1:1',
      secretId: SECRET_ID,
      secretKey: SECRET_KEY,
    })
    await expect(ctx.lmoPipeline.listProjects()).rejects.toMatchObject({ code: 'LMO_REQUEST_FAILED' })
    await fiber.dispose()
  })

  it('fails loud at load when baseUrl or credentials are missing', async () => {
    const ctx = new Context()
    await expect(ctx.plugin(HttpLmoPipeline, { baseUrl: 'http://x', secretId: '', secretKey: SECRET_KEY }))
      .rejects.toThrow(/secretId is required/)
  })
})
