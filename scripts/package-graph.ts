/**
 * Shared workspace-package graph discovery and Mermaid identifier helpers for
 * the generated module graph and relationship-diagram generators. Each caller
 * supplies its own group ordering because the documents use different visual
 * priorities; manifest parsing and dependency-safe ordering have one owner.
 */

import { globSync, readFileSync } from 'node:fs'
import { dirname, resolve, sep } from 'node:path'

/** Workspace package-name prefixes the graph covers: the upstream harness
 * family plus this fork's own `@lingmeow.tech/dsh-*` packages. A workspace
 * member outside every listed scope is silently absent from the module graph
 * and from every diagram and table that resolves packages through this module. */
const SCOPES = ['@deepseek-ai/dsh-', '@lingmeow.tech/dsh-'] as const

/** One workspace package manifest as read for graph discovery. */
interface PackageManifest {
  /** Repo-relative manifest path. */
  rel: string
  /** Full npm package name. */
  name: string
  /** Declared peer dependencies, keyed by package name. */
  peerDependencies?: Record<string, string>
}

/**
 * Remove the matching scope prefix from a workspace package name.
 * @param name - full npm package name.
 * @returns the graph-facing short name, or undefined when no scope matches.
 */
function shortName(name: string): string | undefined {
  for (const scope of SCOPES) if (name.startsWith(scope)) return name.slice(scope.length)
  return undefined
}

/** One harness package and its in-repo peer-dependency edges. */
export interface PackageGraphNode {
  /** Package name with its scope prefix removed. */
  short: string
  /** Full npm package name. */
  name: string
  /** Package group from `packages/<group>/<pkg>`. */
  group: string
  /** Repo-relative package directory. */
  rel: string
  /** Short names of in-repo peer dependencies, sorted. */
  deps: string[]
}

/**
 * Read every harness package manifest and return dependency-first graph nodes.
 * @param root - absolute repository root.
 * @param groupOrder - caller-specific tiebreak order for packages in the same dependency layer.
 * @param gate - command name used in structural error messages.
 * @returns package nodes ordered after their in-repo dependencies, except for
 *   stable back edges inside a dependency cycle.
 */
export function collectPackageGraph(root: string, groupOrder: readonly string[], gate: string): PackageGraphNode[] {
  const manifests: PackageManifest[] = globSync('packages/*/*/package.json', { cwd: root })
    .map(path => path.split(sep).join('/'))
    .sort()
    .map((rel) => {
      const manifest = JSON.parse(readFileSync(resolve(root, rel), 'utf8')) as Omit<PackageManifest, 'rel'>
      return { rel, ...manifest }
    })
  const names = new Set(manifests.map(manifest => manifest.name))
  const packages: PackageGraphNode[] = []
  const shorts = new Set<string>()
  for (const { rel, name, peerDependencies } of manifests) {
    const short = shortName(name)
    if (short === undefined) continue
    const [, group, leaf] = rel.split('/')
    if (group === undefined || leaf === undefined) throw new Error(`${gate}: unexpected package path ${rel}`)
    if (shorts.has(short)) {
      throw new Error(`${gate}: '${short}' names two workspace packages; ${SCOPES.join(' and ')} must stay disjoint once the scope prefix is removed`)
    }
    shorts.add(short)
    const deps: string[] = []
    for (const peer of Object.keys(peerDependencies ?? {})) {
      const peerShort = shortName(peer)
      if (peerShort === undefined) continue
      if (!names.has(peer)) throw new Error(`${gate}: ${name} references missing in-repo peer ${peer}`)
      deps.push(peerShort)
    }
    packages.push({ short, name, group, rel: dirname(rel), deps: deps.sort() })
  }
  return topoSort(packages, groupOrder, gate)
}

function topoSort(packages: PackageGraphNode[], groupOrder: readonly string[], gate: string): PackageGraphNode[] {
  const remaining = new Map(packages.map(pkg => [pkg.short, pkg]))
  const placed = new Set<string>()
  const out: PackageGraphNode[] = []
  while (remaining.size > 0) {
    let ready = [...remaining.values()]
      .filter(pkg => pkg.deps.every(dep => placed.has(dep)))
      .sort((a, b) => comparePackages(a, b, groupOrder))
    if (ready.length === 0) {
      const cycle = sinkCycles(remaining)
        .map(component => component.sort((a, b) => comparePackages(a, b, groupOrder)))
        .sort((a, b) => comparePackages(a[0], b[0], groupOrder))[0]
      if (cycle === undefined) throw new Error(`${gate}: could not order package dependency graph`)
      ready = cycle
    }
    for (const pkg of ready) {
      out.push(pkg)
      placed.add(pkg.short)
      remaining.delete(pkg.short)
    }
  }
  return out
}

type PackageGraphComponent = [PackageGraphNode, ...PackageGraphNode[]]

function sinkCycles(remaining: ReadonlyMap<string, PackageGraphNode>): PackageGraphComponent[] {
  let nextIndex = 0
  const indices = new Map<string, number>()
  const lowLinks = new Map<string, number>()
  const stack: PackageGraphNode[] = []
  const stacked = new Set<string>()
  const components: PackageGraphComponent[] = []

  const visit = (pkg: PackageGraphNode): void => {
    const index = nextIndex
    nextIndex += 1
    indices.set(pkg.short, index)
    lowLinks.set(pkg.short, index)
    stack.push(pkg)
    stacked.add(pkg.short)
    for (const dependency of pkg.deps) {
      const target = remaining.get(dependency)
      if (target === undefined) continue
      if (!indices.has(target.short)) {
        visit(target)
        lowLinks.set(pkg.short, Math.min(requiredValue(lowLinks, pkg.short), requiredValue(lowLinks, target.short)))
      } else if (stacked.has(target.short)) {
        lowLinks.set(pkg.short, Math.min(requiredValue(lowLinks, pkg.short), requiredValue(indices, target.short)))
      }
    }
    if (lowLinks.get(pkg.short) !== indices.get(pkg.short)) return
    const first = stack.pop()
    if (first === undefined) throw new Error('package graph traversal lost its active component')
    stacked.delete(first.short)
    const component: PackageGraphComponent = [first]
    let member = first
    while (member !== pkg) {
      const next = stack.pop()
      if (next === undefined) throw new Error('package graph traversal lost its active component')
      stacked.delete(next.short)
      component.push(next)
      member = next
    }
    components.push(component)
  }

  for (const pkg of remaining.values()) {
    if (!indices.has(pkg.short)) visit(pkg)
  }
  return components.filter((component) => {
    const names = new Set(component.map(pkg => pkg.short))
    const first = component[0]
    const cyclic = component.length > 1 || first.deps.includes(first.short)
    return cyclic && component.every(pkg => pkg.deps.every(dep => !remaining.has(dep) || names.has(dep)))
  })
}

function requiredValue<K, V>(values: ReadonlyMap<K, V>, key: K): V {
  const value = values.get(key)
  if (value === undefined) throw new Error('package graph traversal lost an indexed node')
  return value
}

function comparePackages(a: PackageGraphNode, b: PackageGraphNode, groupOrder: readonly string[]): number {
  const groupA = groupOrder.indexOf(a.group)
  const groupB = groupOrder.indexOf(b.group)
  const normA = groupA === -1 ? Number.MAX_SAFE_INTEGER : groupA
  const normB = groupB === -1 ? Number.MAX_SAFE_INTEGER : groupB
  return normA - normB || a.group.localeCompare(b.group) || a.short.localeCompare(b.short)
}

/** Stable Mermaid id for a graph value. */
export function graphNodeId(prefix: string, value: string): string {
  return `${prefix}_${value.replace(/[^a-zA-Z0-9_]/g, '_')}`
}

/** Escape a value embedded in a quoted Mermaid label. */
export function escapeMermaidLabel(value: string): string {
  return value.replace(/"/g, '\\"')
}
