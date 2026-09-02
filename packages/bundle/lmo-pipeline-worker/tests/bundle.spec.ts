/**
 * The bundle's substance is its patch file plus the flat worker
 * `worker.cordis.yml`: the `dsh.bundle.patch` manifest field must name a
 * real, parseable patch list, and the model-visible persona text pinned in
 * `src/prompts.ts` must match both composition files verbatim (request-cache
 * stability).
 */

import { existsSync, readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'
import * as yaml from 'js-yaml'
import { entryListSchema } from '@deepseek-ai/cordis-plugin-include'
import { PERSONA } from '../src/prompts.ts'

const root = fileURLToPath(new URL('..', import.meta.url))

interface PatchRow {
  id?: string
  name?: string
  config?: Record<string, unknown>
  disabled?: unknown
}

interface PatchEntry {
  id?: string
  config?: Record<string, unknown>
  disabled?: unknown
  insert?: PatchRow[]
}

function readPatch(): { manifest: Record<string, unknown>; patches: PatchEntry[]; rows: PatchRow[] } {
  const manifest = JSON.parse(readFileSync(resolve(root, 'package.json'), 'utf8')) as Record<string, unknown>
  const patchField = (manifest.dsh as { bundle?: { patch?: string } } | undefined)?.bundle?.patch
  expect(patchField).toBe('./cordis.patch.yml')
  const parsed = yaml.load(readFileSync(resolve(root, patchField!), 'utf8'), { schema: entryListSchema })
  expect(Array.isArray(parsed)).toBe(true)
  const patches = parsed as PatchEntry[]
  const rows = patches.flatMap(patch => patch.insert ?? [])
  return { manifest, patches, rows }
}

describe('dsh-bundle-lmo-pipeline-worker bundle', () => {
  it('declares a parseable patch list naming the worker rows', () => {
    const { rows } = readPatch()
    const ids = new Set(rows.map(row => row.id))
    for (const id of [
      'sdk-jsonrpc-server',
      'code-runtime',
      'storage',
      'storage-json',
      'storage-domain',
      'session-tags',
      'pipeline-worker-tags',
      'lmo-pipeline',
      'tool-lmo-pipeline',
      'subagent-dsh-sdk',
      'tool-subagent-dsh-sdk',
      'pty',
      'terminal-bash',
      'tool-terminal',
    ]) {
      expect(ids.has(id), `insert must mount ${id}`).toBe(true)
    }
    // Worker overrides over base rows.
    const byId = new Map(rows.map(row => [row.id, row]))
    expect(byId.get('tool-subagent-dsh-sdk')?.config).toMatchObject({
      provider: 'dsh-sdk',
      toolName: 'subagent_dsh',
    })
    const terminalBash = byId.get('terminal-bash')
    expect(terminalBash?.disabled).toEqual({ __jsExpr: "process.platform === 'win32'" })
    const toolTerminal = byId.get('tool-terminal')
    expect(toolTerminal?.disabled).toEqual({ __jsExpr: "process.platform === 'win32'" })
    // No web/browser rows: the worker composition stays UI-free.
    const names = rows.map(row => row.name ?? '').join('\n')
    expect(names).not.toContain('dsh-web-app')
    expect(names).not.toContain('dsh-client-')
  })

  it('pins the model-visible persona verbatim in the patch layer', () => {
    const { patches } = readPatch()
    const persona = patches.find(patch => patch.id === 'system-prompt')?.config?.persona
    expect(typeof persona).toBe('string')
    expect((persona as string).trim()).toBe(PERSONA.trim())
  })

  it('turns every interactive approval off and sets the lmtech skill roots', () => {
    const { patches } = readPatch()
    const approval = patches.find(patch => patch.id === 'approval')?.config
    expect(approval).toMatchObject({ policy: 'never' })
    const skills = patches.find(patch => patch.id === 'skill-filesystem')?.config
    expect(skills).toMatchObject({ includeDefaultRoots: true })
    expect(skills?.customSkillDirs).toHaveProperty('__jsExpr')
  })
})

describe('dsh-bundle-lmo-pipeline-worker worker.cordis.yml', () => {
  const workerPath = resolve(root, 'worker.cordis.yml')

  it('parses as an entry list pinning the same persona', () => {
    expect(existsSync(workerPath)).toBe(true)
    const parsed = yaml.load(readFileSync(workerPath, 'utf8'), { schema: entryListSchema })
    expect(Array.isArray(parsed)).toBe(true)
    const rows = parsed as { id?: string; name?: string; config?: Record<string, unknown> }[]
    const ids = new Set(rows.map(row => row.id))
    for (const id of [
      'sdk-jsonrpc-server',
      'llm-deepseek',
      'agent-spine',
      'sessions',
      'subagent',
      'subagent-dsh-sdk',
      'tool-subagent-dsh-sdk',
      'tool-subagent-report',
      'storage-domain',
      'session-tags',
      'pipeline-worker-tags',
      'lmo-pipeline',
      'tool-lmo-pipeline',
      'fs-local',
      'tool-todo',
    ]) {
      expect(ids.has(id), `worker config must mount ${id}`).toBe(true)
    }
    const names = rows.map(row => row.name ?? '').join('\n')
    expect(names).not.toContain('dsh-web-app')
    const spine = rows.find(row => row.id === 'agent-spine')
    const persona = spine?.config?.persona
    expect(typeof persona).toBe('string')
    expect((persona as string).trim()).toBe(PERSONA.trim())
    // The runner handshake rows read their deployment seams from env.
    const dshSdk = rows.find(row => row.id === 'subagent-dsh-sdk')?.config
    expect(dshSdk?.command).toHaveProperty('__jsExpr')
    expect(dshSdk?.args).toHaveProperty('__jsExpr')
    const sessions = rows.find(row => row.id === 'sessions')?.config
    expect(sessions?.root).toHaveProperty('__jsExpr')
  })
})
