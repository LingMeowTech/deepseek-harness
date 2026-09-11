/**
 * The web-app bundle patch must reference the LMTech plugins package for
 * per-session pipeline tags (018 FR-008; 016 delegates the codemod to 018).
 *
 * The row `name` is the only plugin-resolution seam a deployment sees, so the
 * official bundle MUST NOT keep pointing at the `@deepseek-ai/dsh-session-tags`
 * name — that package does not exist in this fork, while the row itself is the
 * composition slot the pipeline zone filters sessions through.
 *
 * Tasks 018 T038 name this file `cordis-reference.test.ts`; the harness
 * vitest include glob only collects `packages/<group>/<pkg>/tests/` specs
 * named `*.spec.ts`, so the collected name is `cordis-reference.spec.ts`.
 */

import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'

const PATCH_PATH = new URL('../cordis.patch.yml', import.meta.url)

/** The `name:` of the row carrying the given id in a cordis patch file. */
function rowName(patch: string, id: string): string | undefined {
  const lines = patch.split(/\r?\n/u)
  const start = lines.findIndex(line => line.trim() === `- id: ${id}`)
  if (start === -1) return undefined
  const indent = lines[start]!.search(/\S/u)
  for (const line of lines.slice(start + 1)) {
    if (line.trim() === '') continue
    if (line.search(/\S/u) <= indent) return undefined
    const name = /^\s*name:\s*(.+?)\s*$/u.exec(line)
    if (name) return name[1]!.replace(/^(['"])(.*)\1$/u, '$2')
  }
  return undefined
}

describe('web-app cordis patch plugin references', () => {
  const patch = readFileSync(PATCH_PATH, 'utf8')

  it('web_app_cordis_session_tags_row_references_lmtech_package', () => {
    expect(rowName(patch, 'session-tags')).toBe('@lingmeow.tech/dsh-session-tags')
    expect(patch).not.toContain('@deepseek-ai/dsh-session-tags')
  })
})
