/**
 * Package-owned invariant companion for `@deepseek-ai/dsh-lmo-pipeline`.
 * @module @deepseek-ai/dsh-lmo-pipeline/invariant
 */

import type { Context } from '@deepseek-ai/cordis'
import type { InvariantInstaller } from '@deepseek-ai/dsh-invariants'

const PACKAGE_NAME = '@deepseek-ai/dsh-lmo-pipeline'

/** Cordis companion plugin name. */
export const name = 'lmo-pipeline-invariant'
/** Service required before the companion can reserve package ownership. */
export const inject = ['invariants']

/**
 * No runtime invariant: this stateless Service Definition owns request/result
 * types and the error vocabulary; Service Providers own transport observation.
 */
const install: InvariantInstaller = () => {}

/**
 * Register this package's invariant companion.
 * @param ctx - Cordis context carrying the invariant service.
 * @returns the installed registration's disposer after setup succeeds.
 */
export const apply = (ctx: Context): Promise<() => void> =>
  Promise.resolve(ctx.invariants.register(PACKAGE_NAME, install))
