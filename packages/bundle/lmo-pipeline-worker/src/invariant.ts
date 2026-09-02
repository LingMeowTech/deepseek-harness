/**
 * Package-owned invariant companion for
 * `@deepseek-ai/dsh-bundle-lmo-pipeline-worker`.
 * @module @deepseek-ai/dsh-bundle-lmo-pipeline-worker/invariant
 */

import type { Context } from '@deepseek-ai/cordis'
import type { InvariantInstaller } from '@deepseek-ai/dsh-invariants'

const PACKAGE_NAME = '@deepseek-ai/dsh-bundle-lmo-pipeline-worker'

/** Cordis companion plugin name. */
export const name = 'lmo-pipeline-worker-invariant'

/** Service required before the companion can register. */
export const inject = ['invariants']

// No runtime invariant: the package is a composition carrier (a patch layer
// plus a flat worker cordis.yml whose rows are owned by other packages). Its
// only own runtime code is the tag-writer companion, which has no durable
// mutable relation of its own to check — tag persistence is the
// session-tags registry's invariant.
const install: InvariantInstaller = () => {}

/**
 * Register this package's invariant companion.
 * @param ctx - Cordis context carrying the invariant service.
 * @returns the installed registration's disposer after setup succeeds.
 */
export const apply = (ctx: Context): Promise<() => void> =>
  Promise.resolve(ctx.invariants.register(PACKAGE_NAME, install))
