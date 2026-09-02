/**
 * HTTP Service Provider for the LMO pipeline capability seam: signed lmo-server
 * requests with the same HMAC canonical request the `lmo_server_api.py` CLI
 * uses. The provider maps snake_case server JSON into `@deepseek-ai/dsh-lmo-pipeline`
 * camelCase values and maps HTTP/transport failures onto `LmoPipelineError`.
 * @module @deepseek-ai/dsh-lmo-pipeline-http
 */

import { createHash, createHmac, randomInt } from 'node:crypto'
import { Context } from '@deepseek-ai/cordis'
import z from '@deepseek-ai/schemastery'
import {
  LmoJobId,
  LmoNodeId,
  LmoPipeline,
  LmoPipelineError,
  LmoPipelineId,
  LmoProjectId,
  LmoRunnerId,
  LmoStateId,
} from '@deepseek-ai/dsh-lmo-pipeline'
import type {
  LmoApproveResult,
  LmoJobPatch,
  LmoJobSummary,
  LmoNodeStatus,
  LmoPatchJobResult,
  LmoPipelineDetail,
  LmoPipelineSummary,
  LmoProject,
  LmoProjectSummary,
  LmoPrd,
  LmoPushPrdResult,
  LmoReportNodeResult,
  LmoRerunPipelineResult,
  LmoRunnerNode,
  LmoStateSummary,
} from '@deepseek-ai/dsh-lmo-pipeline'

const ENV_BASE_URL = 'LMO_SERVER_HOST'
const ENV_SECRET_ID = 'LMO_SERVER_SECRET_ID'
const ENV_SECRET_KEY = 'LMO_SERVER_SECRET_KEY'
const DEFAULT_PROVIDER_NAME = 'http'
const DEFAULT_TIMEOUT_MS = 30_000
const NONCE_ALPHABET = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789'

/**
 * Provider config, validated by the static schemastery schema. `baseUrl`,
 * `secretId`, and `secretKey` fall back to `LMO_SERVER_HOST`,
 * `LMO_SERVER_SECRET_ID`, and `LMO_SERVER_SECRET_KEY` when omitted.
 */
export interface Config {
  /** Provider identity for diagnostics and dump-config; default `http`. */
  providerName?: string
  /** lmo-server origin, with or without scheme; default `$LMO_SERVER_HOST`. */
  baseUrl?: string
  /** HMAC secret id; default `$LMO_SERVER_SECRET_ID`. */
  secretId?: string
  /** HMAC signing key as a hex string; default `$LMO_SERVER_SECRET_KEY`. */
  secretKey?: string
  /** Per-request fetch timeout in milliseconds; default 30000. */
  timeoutMs?: number
}

/** Fully resolved provider facts after config/env fallback and validation. */
interface ResolvedConfig {
  providerName: string
  baseUrl: string
  secretId: string
  secretKey: string
  timeoutMs: number
}

type JsonObject = Record<string, unknown>

/**
 * Resolve raw config plus ambient environment into one validated connection
 * value. Programmatic construction can bypass schemastery, so every default
 * and bound is re-judged here and fails at load.
 * @param config - raw plugin config.
 * @returns resolved connection facts.
 */
function resolveConfig(config: Config): ResolvedConfig {
  const rawBaseUrl = (config.baseUrl ?? process.env[ENV_BASE_URL])?.trim()
  const secretId = (config.secretId ?? process.env[ENV_SECRET_ID])?.trim()
  const secretKey = (config.secretKey ?? process.env[ENV_SECRET_KEY])?.trim()
  if (rawBaseUrl === undefined || rawBaseUrl.length === 0) {
    throw new Error(`lmo-pipeline-http: baseUrl is required (set config baseUrl or $${ENV_BASE_URL})`)
  }
  if (secretId === undefined || secretId.length === 0) {
    throw new Error(`lmo-pipeline-http: secretId is required (set config secretId or $${ENV_SECRET_ID})`)
  }
  if (secretKey === undefined || secretKey.length === 0 || !/^[0-9a-fA-F]+$/.test(secretKey)) {
    throw new Error(`lmo-pipeline-http: secretKey must be a non-empty hex string (set config secretKey or $${ENV_SECRET_KEY})`)
  }
  const timeoutMs = config.timeoutMs ?? DEFAULT_TIMEOUT_MS
  if (!Number.isFinite(timeoutMs) || timeoutMs <= 0) {
    throw new Error('lmo-pipeline-http: timeoutMs must be a positive finite number')
  }
  return {
    providerName: config.providerName ?? DEFAULT_PROVIDER_NAME,
    baseUrl: withScheme(rawBaseUrl).replace(/\/+$/, ''),
    secretId,
    secretKey,
    timeoutMs,
  }
}

/** Prefix a host-only value with https, matching `lmo_server_api.py` defaulting. */
function withScheme(raw: string): string {
  return /^https?:\/\//i.test(raw) ? raw : `https://${raw}`
}

/** Build one request URL from the resolved origin, path, and query entries. */
function requestUrl(baseUrl: string, path: string, query?: Record<string, string>): URL {
  const url = new URL(path, `${baseUrl}/`)
  for (const [key, value] of Object.entries(query ?? {})) {
    url.searchParams.set(key, value)
  }
  return url
}

/** SHA-256 hex digest of one byte sequence. */
function sha256Hex(bytes: Uint8Array): string {
  return createHash('sha256').update(bytes).digest('hex')
}

/** One nonce in the CLI's shape: 16 ASCII letters and digits. */
function randomNonce(): string {
  let nonce = ''
  for (let index = 0; index < 16; index += 1) {
    nonce += NONCE_ALPHABET.charAt(randomInt(0, NONCE_ALPHABET.length))
  }
  return nonce
}

/** Canonical HMAC string shared with `lmo_server_api.py`. */
function canonicalRequest(
  method: string,
  path: string,
  query: string,
  bodySha256: string,
  timestamp: string,
  nonce: string,
): string {
  return `${method}\n${path}\n${query}\n${bodySha256}\n${timestamp}\n${nonce}`
}

/** Decode a URL path the way Go's `r.URL.Path` sees it, like the Python CLI. */
function decodedPath(pathname: string): string {
  try {
    return decodeURIComponent(pathname)
  } catch {
    return pathname
  }
}

/** HMAC-SHA256 signature over one canonical string with a hex key. */
function signature(secretKey: string, canonical: string): string {
  return createHmac('sha256', Buffer.from(secretKey, 'hex')).update(canonical, 'utf8').digest('hex')
}

/** Non-JSON server body text carried on an HTTP failure. */
function serverErrorText(text: string): string {
  try {
    const value: unknown = JSON.parse(text)
    if (typeof value === 'object' && value !== null) {
      const record = value as JsonObject
      for (const key of ['error', 'message', 'msg', 'detail']) {
        const candidate = record[key]
        if (typeof candidate === 'string' && candidate.length > 0) return candidate
      }
    }
  } catch {
    // Non-JSON bodies are their own text.
  }
  return text
}

/** Map one non-2xx response onto the stable seam error codes. */
function httpError(status: number, text: string, method: string, url: string): LmoPipelineError {
  const serverError = serverErrorText(text)
  const message = `lmo-server ${method} ${url} failed with HTTP ${status}${serverError.length > 0 ? `: ${serverError}` : ''}`
  if (status === 404) return new LmoPipelineError('LMO_NOT_FOUND', message, status, serverError)
  if (status === 401) return new LmoPipelineError('LMO_UNAUTHORIZED', message, status, serverError)
  if (status === 403) return new LmoPipelineError('LMO_FORBIDDEN', message, status, serverError)
  return new LmoPipelineError('LMO_UPSTREAM_ERROR', message, status, serverError)
}

function invalidResponse(field: string): never {
  throw new LmoPipelineError(
    'LMO_INVALID_RESPONSE',
    `lmo-server response is invalid: ${field}`,
    undefined,
    field,
  )
}

function objectValue(value: unknown): JsonObject {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) invalidResponse('expected an object')
  return value as JsonObject
}

function requiredString(record: JsonObject, key: string): string {
  const value = record[key]
  if (typeof value !== 'string') invalidResponse(`"${key}" must be a string`)
  return value
}

function optionalString(record: JsonObject, key: string): string | undefined {
  const value = record[key]
  if (value === undefined || value === null) return undefined
  if (typeof value !== 'string') invalidResponse(`"${key}" must be a string`)
  return value.length > 0 ? value : undefined
}

function requiredNumber(record: JsonObject, key: string): number {
  const value = record[key]
  if (typeof value !== 'number' || !Number.isInteger(value)) invalidResponse(`"${key}" must be an integer`)
  return value
}

function statusValue(record: JsonObject, key: string): LmoNodeStatus {
  const value = requiredNumber(record, key)
  if (value < 0 || value > 7) invalidResponse(`"${key}" must be a status code from 0 to 7`)
  return value as LmoNodeStatus
}

function requiredBoolean(record: JsonObject, key: string): boolean {
  const value = record[key]
  if (typeof value !== 'boolean') invalidResponse(`"${key}" must be a boolean`)
  return value
}

function requiredArray(record: JsonObject, key: string): unknown[] {
  const value = record[key]
  if (!Array.isArray(value)) invalidResponse(`"${key}" must be an array`)
  return value
}

function projectSummary(value: unknown): LmoProjectSummary {
  const record = objectValue(value)
  const descText = optionalString(record, 'desc_text')
  const updatedAt = optionalString(record, 'updated_at')
  return {
    projectId: LmoProjectId(requiredString(record, 'project_id')),
    parentId: LmoProjectId(requiredString(record, 'parent_id')),
    name: requiredString(record, 'name'),
    ...descText === undefined ? {} : { descText },
    status: statusValue(record, 'status'),
    pipelineTotal: requiredNumber(record, 'pipeline_total'),
    pipelineRunning: requiredNumber(record, 'pipeline_running'),
    pipelineStopped: requiredNumber(record, 'pipeline_stopped'),
    ...updatedAt === undefined ? {} : { updatedAt },
  }
}

function pipelineSummary(value: unknown): LmoPipelineSummary {
  const record = objectValue(value)
  const descText = optionalString(record, 'desc_text')
  const updatedAt = optionalString(record, 'updated_at')
  return {
    pipelineId: LmoPipelineId(requiredString(record, 'pipeline_id')),
    projectId: LmoProjectId(requiredString(record, 'project_id')),
    name: requiredString(record, 'name'),
    ...descText === undefined ? {} : { descText },
    status: statusValue(record, 'status'),
    stateTotal: requiredNumber(record, 'state_total'),
    stateCompleted: requiredNumber(record, 'state_completed'),
    jobTotal: requiredNumber(record, 'job_total'),
    jobCompleted: requiredNumber(record, 'job_completed'),
    isLooping: requiredBoolean(record, 'is_looping'),
    ...updatedAt === undefined ? {} : { updatedAt },
  }
}

function prd(value: unknown): LmoPrd {
  const record = objectValue(value)
  const updatedAt = optionalString(record, 'updated_at')
  return {
    version: requiredString(record, 'version'),
    content: requiredString(record, 'content'),
    ...updatedAt === undefined ? {} : { updatedAt },
  }
}

function stateSummary(value: unknown): LmoStateSummary {
  const record = objectValue(value)
  const descText = optionalString(record, 'desc_text')
  const runnerId = optionalString(record, 'runner_id')
  const updatedAt = optionalString(record, 'updated_at')
  return {
    stateId: LmoStateId(requiredString(record, 'state_id')),
    pipelineId: LmoPipelineId(requiredString(record, 'pipeline_id')),
    name: requiredString(record, 'name'),
    ...descText === undefined ? {} : { descText },
    status: statusValue(record, 'status'),
    isDecomposed: requiredBoolean(record, 'is_decomposed'),
    isLooping: requiredBoolean(record, 'is_looping'),
    ...runnerId === undefined ? {} : { runnerId: LmoRunnerId(runnerId) },
    jobTotal: requiredNumber(record, 'job_total'),
    jobCompleted: requiredNumber(record, 'job_completed'),
    ...updatedAt === undefined ? {} : { updatedAt },
  }
}

function jobSummary(value: unknown): LmoJobSummary {
  const record = objectValue(value)
  const descText = optionalString(record, 'desc_text')
  const command = optionalString(record, 'command')
  const runnerId = optionalString(record, 'runner_id')
  const updatedAt = optionalString(record, 'updated_at')
  return {
    jobId: LmoJobId(requiredString(record, 'job_id')),
    stateId: LmoStateId(requiredString(record, 'state_id')),
    name: requiredString(record, 'name'),
    ...descText === undefined ? {} : { descText },
    ...command === undefined ? {} : { command },
    status: statusValue(record, 'status'),
    ...runnerId === undefined ? {} : { runnerId: LmoRunnerId(runnerId) },
    ...updatedAt === undefined ? {} : { updatedAt },
  }
}

function pipelineDetail(value: unknown): LmoPipelineDetail {
  const record = objectValue(value)
  const descText = optionalString(record, 'desc_text')
  const repo = optionalString(record, 'repo')
  const branch = optionalString(record, 'branch')
  const autoPlan = optionalString(record, 'auto_plan')
  return {
    pipelineId: LmoPipelineId(requiredString(record, 'pipeline_id')),
    projectId: LmoProjectId(requiredString(record, 'project_id')),
    name: requiredString(record, 'name'),
    ...descText === undefined ? {} : { descText },
    status: statusValue(record, 'status'),
    ...repo === undefined ? {} : { repo },
    ...branch === undefined ? {} : { branch },
    isLooping: requiredBoolean(record, 'is_looping'),
    prd: prd(record.prd),
    ...autoPlan === undefined ? {} : { autoPlan },
    states: requiredArray(record, 'states').map(stateSummary),
    jobs: requiredArray(record, 'jobs').map(jobSummary),
  }
}

function runnerNode(value: unknown): LmoRunnerNode {
  const record = objectValue(value)
  const content = optionalString(record, 'content')
  const sessionId = optionalString(record, 'session_id')
  const payload = optionalString(record, 'payload')
  const runnerId = optionalString(record, 'runner_id')
  const path = optionalString(record, 'path')
  const type = requiredString(record, 'type')
  if (type !== 'project' && type !== 'pipeline' && type !== 'state' && type !== 'job') {
    invalidResponse('"type" must be project, pipeline, state, or job')
  }
  return {
    nodeId: LmoNodeId(requiredString(record, 'node_id')),
    type,
    parentId: requiredString(record, 'parent_id'),
    ownerProjectId: LmoProjectId(requiredString(record, 'owner_project_id')),
    name: requiredString(record, 'name'),
    descText: requiredString(record, 'desc_text'),
    ...content === undefined ? {} : { content },
    ...sessionId === undefined ? {} : { sessionId },
    agentBackend: requiredString(record, 'agent_backend'),
    status: statusValue(record, 'status'),
    isDecomposed: requiredBoolean(record, 'is_decomposed'),
    isLooping: requiredBoolean(record, 'is_looping'),
    isEntry: requiredBoolean(record, 'is_entry'),
    isExit: requiredBoolean(record, 'is_exit'),
    ...payload === undefined ? {} : { payload },
    ...runnerId === undefined ? {} : { runnerId: LmoRunnerId(runnerId) },
    depth: requiredNumber(record, 'depth'),
    ...path === undefined ? {} : { path },
    updatedAt: requiredString(record, 'updated_at'),
  }
}

/**
 * HTTP implementation of {@link LmoPipeline}. Requests use Node's global
 * `fetch` with `AbortSignal.timeout`; the DSH web fetch capability is a
 * GET-only anonymous retrieval seam without custom HMAC headers, POST/PATCH
 * methods, or error-status throwing, so it cannot carry this provider.
 */
export class HttpLmoPipeline extends LmoPipeline {
  /** Stable provider identity; default `http`. */
  static Config: z<Config> = z.object({
    providerName: z.string().default(DEFAULT_PROVIDER_NAME),
    baseUrl: z.string(),
    secretId: z.string(),
    secretKey: z.string(),
    timeoutMs: z.number().default(DEFAULT_TIMEOUT_MS),
  })

  readonly providerName: string
  private readonly baseUrl: string
  private readonly secretId: string
  private readonly secretKey: string
  private readonly timeoutMs: number

  /**
   * @param ctx - Cordis context this service registers into.
   * @param config - provider facts; defaults come from the `LMO_SERVER_*` environment.
   */
  constructor(ctx: Context, config: Config = {}) {
    super(ctx)
    const resolved = resolveConfig(config)
    this.providerName = resolved.providerName
    this.baseUrl = resolved.baseUrl
    this.secretId = resolved.secretId
    this.secretKey = resolved.secretKey
    this.timeoutMs = resolved.timeoutMs
  }

  override async listProjects(): Promise<readonly LmoProjectSummary[]> {
    const value = await this.request('GET', '/pipeline/project/list')
    return requiredArray(objectValue(value), 'projects').map(projectSummary)
  }

  override async getProject(id: LmoProjectId): Promise<LmoProject> {
    const value = await this.request('GET', `/pipeline/project/${encodeURIComponent(id)}`)
    const record = objectValue(value)
    const descText = optionalString(record, 'desc_text')
    return {
      projectId: LmoProjectId(requiredString(record, 'project_id')),
      name: requiredString(record, 'name'),
      ...descText === undefined ? {} : { descText },
      status: statusValue(record, 'status'),
      pipelines: requiredArray(record, 'pipelines').map(pipelineSummary),
    }
  }

  override async listPipelines(
    projectId?: LmoProjectId,
    running?: boolean,
  ): Promise<readonly LmoPipelineSummary[]> {
    const query: Record<string, string> = {}
    if (projectId !== undefined) query.project_id = projectId
    if (running !== undefined) query.running = running ? '1' : '0'
    const value = await this.request('GET', '/pipeline/pipeline/list', query)
    return requiredArray(objectValue(value), 'pipelines').map(pipelineSummary)
  }

  override async getPipeline(id: LmoPipelineId): Promise<LmoPipelineDetail> {
    return pipelineDetail(await this.request('GET', `/pipeline/pipeline/${encodeURIComponent(id)}`))
  }

  override async pushPrd(
    id: LmoPipelineId,
    content: string,
  ): Promise<LmoPushPrdResult> {
    const value = await this.request('POST', `/pipeline/pipeline/${encodeURIComponent(id)}/prd`, undefined, { content })
    const record = objectValue(value)
    return {
      pipelineId: LmoPipelineId(requiredString(record, 'pipeline_id')),
      prdVersion: requiredString(record, 'prd_version'),
    }
  }

  override async approve(id: LmoPipelineId): Promise<LmoApproveResult> {
    const value = await this.request('POST', `/pipeline/pipeline/${encodeURIComponent(id)}/approve`)
    const record = objectValue(value)
    return {
      pipelineId: LmoPipelineId(requiredString(record, 'pipeline_id')),
      status: statusValue(record, 'status'),
    }
  }

  override async listStates(pipelineId: LmoPipelineId): Promise<readonly LmoStateSummary[]> {
    const value = await this.request('GET', '/pipeline/state/list', { pipeline_id: pipelineId })
    return requiredArray(objectValue(value), 'states').map(stateSummary)
  }

  override async listJobs(stateId: LmoStateId): Promise<readonly LmoJobSummary[]> {
    const value = await this.request('GET', '/pipeline/job/list', { state_id: stateId })
    return requiredArray(objectValue(value), 'jobs').map(jobSummary)
  }

  override async patchJob(id: LmoJobId, patch: LmoJobPatch): Promise<LmoPatchJobResult> {
    const body: JsonObject = {}
    if (patch.name !== undefined) body.name = patch.name
    if (patch.descText !== undefined) body.desc_text = patch.descText
    if (patch.command !== undefined) body.command = patch.command
    if (patch.status !== undefined) body.status = patch.status
    if (patch.runnerId !== undefined) body.runner_id = patch.runnerId
    if (patch.payload !== undefined) body.payload = patch.payload
    const value = await this.request('PATCH', `/pipeline/job/${encodeURIComponent(id)}`, undefined, body)
    const record = objectValue(value)
    return { jobId: LmoJobId(requiredString(record, 'job_id')) }
  }

  override async rerunPipeline(id: LmoPipelineId): Promise<LmoRerunPipelineResult> {
    const value = await this.request('POST', `/pipeline/pipeline/${encodeURIComponent(id)}/rerun`)
    const record = objectValue(value)
    return {
      pipelineId: LmoPipelineId(requiredString(record, 'pipeline_id')),
      resetCount: requiredNumber(record, 'reset_count'),
    }
  }

  override async reportNode(
    runnerId: LmoRunnerId,
    nodeId: import('@deepseek-ai/dsh-lmo-pipeline').LmoNodeId,
    status: LmoNodeStatus,
    desc: string,
    output?: string,
  ): Promise<LmoReportNodeResult> {
    const body: JsonObject = { node_id: nodeId, status }
    if (desc.length > 0) body.progress_desc = desc
    if (output !== undefined) body.output = output
    const value = await this.request(
      'POST',
      `/pipeline/runner/server/${encodeURIComponent(runnerId)}/nodes/${encodeURIComponent(nodeId)}/report`,
      undefined,
      body,
    )
    const record = objectValue(value)
    return { ok: requiredBoolean(record, 'ok') }
  }

  override async listRunnerNodes(
    runnerId: LmoRunnerId,
    status: 'pending' | 'all' = 'pending',
  ): Promise<readonly LmoRunnerNode[]> {
    const value = await this.request('GET', `/pipeline/runner/server/${encodeURIComponent(runnerId)}/nodes`, { status })
    return requiredArray(objectValue(value), 'nodes').map(runnerNode)
  }

  /** Run one signed request and return the parsed JSON value. */
  private async request(
    method: string,
    path: string,
    query?: Record<string, string>,
    body?: JsonObject,
  ): Promise<unknown> {
    const url = requestUrl(this.baseUrl, path, query)
    const bodyBytes = body === undefined ? undefined : new TextEncoder().encode(JSON.stringify(body))
    const timestamp = String(Math.floor(Date.now() / 1000))
    const nonce = randomNonce()
    const canonical = canonicalRequest(
      method,
      decodedPath(url.pathname),
      url.search.startsWith('?') ? url.search.slice(1) : '',
      sha256Hex(bodyBytes ?? new Uint8Array()),
      timestamp,
      nonce,
    )
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      'X-Secret-Id': this.secretId,
      'X-Timestamp': timestamp,
      'X-Nonce': nonce,
      'X-Signature': signature(this.secretKey, canonical),
    }
    let response: Response
    try {
      response = await fetch(url, {
        method,
        headers,
        ...bodyBytes === undefined ? {} : { body: bodyBytes },
        signal: AbortSignal.timeout(this.timeoutMs),
      })
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : String(error)
      throw new LmoPipelineError(
        'LMO_REQUEST_FAILED',
        `lmo-server ${method} ${url.toString()} request failed: ${message}`,
        undefined,
        message,
        error,
      )
    }
    let text: string
    try {
      text = await response.text()
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : String(error)
      throw new LmoPipelineError(
        'LMO_REQUEST_FAILED',
        `lmo-server ${method} ${url.toString()} response read failed: ${message}`,
        undefined,
        message,
        error,
      )
    }
    if (!response.ok) throw httpError(response.status, text, method, url.toString())
    if (text.length === 0) return {}
    try {
      return JSON.parse(text) as unknown
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : String(error)
      throw new LmoPipelineError(
        'LMO_INVALID_RESPONSE',
        `lmo-server ${method} ${url.toString()} returned non-JSON: ${message}`,
        undefined,
        message,
        error,
      )
    }
  }
}

export default HttpLmoPipeline
