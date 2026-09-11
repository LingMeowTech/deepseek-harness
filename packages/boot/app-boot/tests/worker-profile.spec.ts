/**
 * The harness must stop shipping the LMTech pipeline-worker profile and must
 * keep its official manifest free of plugin-package reverse dependencies
 * (018 FR-008): the worker composition now lives in the plugins package and is
 * mounted through the user profile's plugin list, not through an official
 * bundle.
 *
 * Tasks 018 T039 name this file `profile.test.ts`; the harness vitest include
 * glob only collects `packages/<group>/<pkg>/tests/` specs named `*.spec.ts`,
 * so the collected name is `worker-profile.spec.ts` (`profile.spec.ts`
 * already covers the profile machinery itself).
 */

import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'
import { PROFILE_TEMPLATES } from '../src/index.ts'

const WEB_APP_MANIFEST = new URL('../../../bundle/web-app/package.json', import.meta.url)

describe('app-boot shipped profile templates', () => {
  it('app_boot_profile_lacks_lmo_pipeline_worker_block', () => {
    expect(Object.keys(PROFILE_TEMPLATES)).not.toContain('lmo-pipeline-worker')
    const bundles = Object.values(PROFILE_TEMPLATES).flatMap(template => template.bundles)
    expect(bundles).not.toContain('@deepseek-ai/dsh-bundle-lmo-pipeline-worker')
  })
})

describe('dsh-web-app official manifest', () => {
  it('web_app_package_json_lacks_plugin_dependency', () => {
    const raw = readFileSync(WEB_APP_MANIFEST, 'utf8')
    const manifest = JSON.parse(raw) as {
      dependencies?: Record<string, string>
      peerDependencies?: Record<string, string>
      devDependencies?: Record<string, string>
    }
    const declared = Object.keys({
      ...manifest.dependencies,
      ...manifest.peerDependencies,
      ...manifest.devDependencies,
    })
    expect(declared).not.toContain('@deepseek-ai/dsh-session-tags')
  })
})
