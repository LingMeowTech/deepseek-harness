import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { afterEach, describe, expect, it } from 'vitest'
import { renderModuleGraph } from './gen-module-graph.ts'
import { collectPackageGraph } from './package-graph.ts'

const roots: string[] = []

afterEach(() => {
  for (const root of roots.splice(0)) rmSync(root, { recursive: true, force: true })
})

function tempRoot(): string {
  const root = mkdtempSync(join(tmpdir(), 'dsh-package-graph-'))
  roots.push(root)
  return root
}

/** Write one workspace manifest with explicit full package names. */
function writeManifest(root: string, leaf: string, name: string, peers: readonly string[]): void {
  const directory = join(root, 'packages', 'client', leaf)
  mkdirSync(directory, { recursive: true })
  writeFileSync(join(directory, 'package.json'), `${JSON.stringify({
    name,
    peerDependencies: Object.fromEntries(peers.map(peer => [peer, 'workspace:^'])),
  }, null, 2)}\n`)
}

function fixture(packages: Readonly<Record<string, readonly string[]>>): string {
  const root = tempRoot()
  for (const [name, dependencies] of Object.entries(packages)) {
    writeManifest(root, name, `@deepseek-ai/dsh-${name}`, dependencies.map(dependency => `@deepseek-ai/dsh-${dependency}`))
  }
  return root
}

describe('collectPackageGraph', () => {
  it('orders packages after their dependencies', () => {
    const root = fixture({ application: ['feature'], feature: ['foundation'], foundation: [] })

    expect(collectPackageGraph(root, ['client'], 'fixture').map(pkg => pkg.short))
      .toEqual(['foundation', 'feature', 'application'])
  })

  it('keeps a dependency cycle together and before its consumers', () => {
    const root = fixture({ consumer: ['left'], left: ['right'], right: ['left'], foundation: [] })

    expect(collectPackageGraph(root, ['client'], 'fixture').map(pkg => pkg.short))
      .toEqual(['foundation', 'left', 'right', 'consumer'])
  })

  it('rejects a missing in-repo peer', () => {
    const root = fixture({ consumer: ['missing'] })

    expect(() => collectPackageGraph(root, ['client'], 'fixture'))
      .toThrow('fixture: @deepseek-ai/dsh-consumer references missing in-repo peer @deepseek-ai/dsh-missing')
  })

  it('rejects two scopes collapsing to one graph name', () => {
    const root = tempRoot()
    writeManifest(root, 'upstream', '@deepseek-ai/dsh-twin', [])
    writeManifest(root, 'fork', '@lingmeow.tech/dsh-twin', [])

    expect(() => collectPackageGraph(root, ['client'], 'fixture'))
      .toThrow("fixture: 'twin' names two workspace packages")
  })
})

describe('renderModuleGraph', () => {
  it('renders the same peer edge in both generated languages', () => {
    const packages = [
      { short: 'provider', name: '@deepseek-ai/dsh-provider', group: 'core', rel: 'packages/core/provider', deps: [] },
      { short: 'consumer', name: '@deepseek-ai/dsh-consumer', group: 'core', rel: 'packages/core/consumer', deps: ['provider'] },
    ]

    const english = renderModuleGraph(packages, 'en')
    const chinese = renderModuleGraph(packages, 'zh')

    expect(english).toContain('# Shared-instance dependency graph')
    expect(chinese).toContain('# 共享实例依赖关系图')
    expect(chinese).toContain('[English](module-graph.md) | 中文')
    for (const output of [english, chinese]) {
      expect(output).toContain('pkg_consumer --> pkg_provider')
      expect(output).toContain('| [`consumer`](../packages/core/consumer) | `core` | [`provider`](../packages/core/provider) |')
    }
  })
})
