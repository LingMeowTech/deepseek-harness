import { describe, expect, it } from 'vitest'
import { Context } from '@deepseek-ai/cordis'
import Storage from '@deepseek-ai/dsh-storage'
import { DomainFacility } from '@deepseek-ai/dsh-storage-domain'
import type { DomainChanged } from '@deepseek-ai/dsh-storage-domain'
import { SessionId } from '@deepseek-ai/dsh-session'
import SessionTagRegistry from '@deepseek-ai/dsh-session-tags'
import { MemoryMediaPool, MemoryStorageBackend } from '../../../storage/storage-domain/tests/helpers/memory-backend.ts'

const sid = (id: string) => SessionId(id)

/** Boot the registry over one shared in-memory medium. */
async function harness(pool: MemoryMediaPool) {
  const ctx = new Context()
  await ctx.plugin(Storage)
  ctx.storage.backend.register('memory', new MemoryStorageBackend(pool))
  const facility = new DomainFacility(ctx, { backend: 'memory', routes: {} })
  ctx.storage.mount('domain', facility)
  ctx.provide('storageDomain', facility)
  const changes: DomainChanged[] = []
  ctx.on('domain/changed', (change) => { changes.push(change) })
  const fiber = await ctx.plugin(SessionTagRegistry)
  return {
    ctx,
    fiber,
    registry: ctx.sessionTags,
    changes,
    resetChanges: () => { changes.length = 0 },
  }
}

describe('SessionTagRegistry', () => {
  it('persists set/remove/list across registry reopen on the same storage medium', async () => {
    const pool = new MemoryMediaPool()
    const first = await harness(pool)
    expect(await first.registry.set(sid('s1'), ['pipeline_id', 'job_id'])).toEqual(['pipeline_id', 'job_id'])
    await first.fiber.dispose()

    const second = await harness(pool)
    expect(await second.registry.list(sid('s1'))).toEqual(['pipeline_id', 'job_id'])
    expect(await second.registry.remove(sid('s1'), ['pipeline_id'])).toEqual(['job_id'])
    await second.fiber.dispose()

    const third = await harness(pool)
    expect(await third.registry.list(sid('s1'))).toEqual(['job_id'])
    expect(await third.registry.remove(sid('s1'), ['job_id'])).toEqual([])
    await third.fiber.dispose()

    const fourth = await harness(pool)
    expect(await fourth.registry.list(sid('s1'))).toEqual([])
    await fourth.fiber.dispose()
  })

  it('publishes one domain/changed put per set and one delete when the last tag is removed', async () => {
    const first = await harness(new MemoryMediaPool())
    first.resetChanges()
    await first.registry.set(sid('s2'), ['pipeline_id', 'state_id'])
    expect(first.changes).toMatchObject([{ domain: 'session_tags', table: 'tags', operation: 'put', key: sid('s2') }])

    first.resetChanges()
    await first.registry.remove(sid('s2'), ['pipeline_id'])
    expect(first.changes).toMatchObject([{ domain: 'session_tags', table: 'tags', operation: 'put' }])

    first.resetChanges()
    await first.registry.remove(sid('s2'), ['state_id'])
    expect(first.changes).toMatchObject([{ domain: 'session_tags', table: 'tags', operation: 'deleted' }])
    await first.fiber.dispose()
  })

  it('normalizes, deduplicates, and bounds tag lists', async () => {
    const { registry, fiber } = await harness(new MemoryMediaPool())
    expect(await registry.set(sid('s3'), [' pipeline_id ', 'job_id', 'pipeline_id'])).toEqual(['pipeline_id', 'job_id'])
    await expect(registry.set(sid('s3'), ['  '])).rejects.toThrow(/non-empty/)
    await expect(registry.set(sid('s3'), ['x'.repeat(129)])).rejects.toThrow(/128 characters/)
    await fiber.dispose()
  })

  it('is a no-op for an absent remove and keeps an untouched list stable', async () => {
    const { registry, changes, fiber } = await harness(new MemoryMediaPool())
    await registry.set(sid('s4'), ['pipeline_id'])
    changes.length = 0
    expect(await registry.remove(sid('ghost'), ['pipeline_id'])).toEqual([])
    expect(await registry.remove(sid('s4'), ['other'])).toEqual(['pipeline_id'])
    expect(changes).toEqual([])
    await fiber.dispose()
  })

  it('rejects invalid config bounds at load', async () => {
    const ctx = new Context()
    await ctx.plugin(Storage)
    ctx.storage.backend.register('memory', new MemoryStorageBackend(new MemoryMediaPool()))
    const facility = new DomainFacility(ctx, { backend: 'memory', routes: {} })
    ctx.storage.mount('domain', facility)
    ctx.provide('storageDomain', facility)
    await expect(ctx.plugin(SessionTagRegistry, { maxTagsPerSession: 0 }))
      .rejects.toThrow(/maxTagsPerSession/)
  })

  it('keeps the registry service reachable as ctx.sessionTags', async () => {
    const { ctx, fiber } = await harness(new MemoryMediaPool())
    const viaContext = ctx.get('sessionTags') as SessionTagRegistry
    expect(await viaContext.list(sid('s5'))).toEqual([])
    await fiber.dispose()
    expect(ctx.get('sessionTags')).toBeUndefined()
  })
})
