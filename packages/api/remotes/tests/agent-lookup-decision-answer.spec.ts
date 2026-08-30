/**
 * B13 RED: decision-answer path must bypass the subagent-ownership fence
 * (T003, US1), while ordinary session.prompt keeps returning agent-busy.
 *
 * Contract under test: agent-lookup exposes a decision-answer resolution path
 * (`resolveDecisionAnswerAgent`) that, unlike the generic resolver, resumes a
 * subagent-owned session instead of answering agent-busy. The generic
 * `createApiRemoteAgentResolver` fence is unchanged (regression red line).
 *
 * RED expectation: `resolveDecisionAnswerAgent` does not exist today, so the
 * decision-answer resolution fails with "not implemented"; the generic fence
 * already answers agent-busy and keeps passing.
 */

import { describe, expect, it, vi } from 'vitest'
import { Context } from '@deepseek-ai/cordis'
import AgentRegistry from '@deepseek-ai/dsh-agent'
import type { Agent } from '@deepseek-ai/dsh-agent'
import SessionStore from '@deepseek-ai/dsh-session'
import type { Session, SessionEvent, SessionHeader, SessionId } from '@deepseek-ai/dsh-session'
import { createApiRemoteAgentResolver } from '@deepseek-ai/dsh-api-remotes'

const sid = (value: string): SessionId => value as SessionId

function header(id: SessionId): SessionHeader {
  return { version: 0, id, createdAt: 1, cwd: '/proj' }
}

async function createContext(): Promise<Context> {
  const ctx = new Context()
  await ctx.plugin(SessionStore)
  await ctx.plugin(AgentRegistry)
  return ctx
}

function provideSession(
  ctx: Context,
  meta: SessionHeader,
  inspect: () => Promise<{ meta: SessionHeader; events: SessionEvent[] }>,
): void {
  ctx.provide('sessionPersistence', {
    list: () => Promise.resolve([meta]),
    inspect,
    locate: () => undefined,
  } as never)
}

function stubAgent(ctx: Context, session: Session): Agent {
  return { id: session.id, session, status: 'idle', ctx } as Agent
}

describe('B13 decision-answer fence bypass (T003)', () => {
  it('resolves a subagent-owned session through the decision-answer path (no agent-busy)', async () => {
    const ctx = await createContext()
    const sessionId = sid('decision-answer-owned')
    const meta = header(sessionId)
    provideSession(ctx, meta, () => Promise.resolve({ meta, events: [] }))
    const resumed = vi.spyOn(ctx.agents, 'resume').mockImplementation(async () => {
      const session = ctx.sessions.create(sessionId, { meta: { cwd: '/proj', origin: 'subagent' } })
      return { agent: stubAgent(ctx, session), dispose: () => Promise.resolve() }
    })

    // RED: `resolveDecisionAnswerAgent` is not exported today, so this
    // assertion fails with "decision-answer channel missing" — proving the
    // channel is unimplemented. When GREEN lands, it must return the resumed
    // agent for the subagent-owned session (no agent-busy).
    const mod = await import('@deepseek-ai/dsh-api-remotes')
    const resolveDecisionAnswerAgent = (mod as Record<string, unknown>)
      .resolveDecisionAnswerAgent as ((ctx: Context, sessionId: SessionId) => Promise<unknown>) | undefined
    expect(typeof resolveDecisionAnswerAgent).toBe('function')
    const result = await resolveDecisionAnswerAgent!(ctx, sessionId)

    // Narrow unknown -> object for the `in` guard; the decision-answer path
    // must resolve to a resumed agent envelope (no agent-busy error).
    expect(typeof result).toBe('object')
    expect(result).not.toBeNull()
    expect('agent' in (result as object)).toBe(true)
    expect(result).toMatchObject({ agent: { id: sessionId } })
    expect(resumed).toHaveBeenCalledWith({ resumeSessionId: sessionId })
    await ctx.fiber.dispose()
  })

  it('keeps the generic resolver agent-busy fence for subagent-owned sessions (regression red line)', async () => {
    const ctx = await createContext()
    const sessionId = sid('generic-still-fenced')
    const session = ctx.sessions.create(sessionId, { meta: { cwd: '/proj', origin: 'subagent' } })
    ctx.agents.register(stubAgent(ctx, session))

    const result = await createApiRemoteAgentResolver(ctx, {})(sessionId)

    // Ordinary session.prompt behavior is unchanged: agent-busy.
    expect(result).toMatchObject({ error: { code: 'agent-busy' } })
    await ctx.fiber.dispose()
  })

  it('keeps the generic resolver fence for an owned descendant session (regression red line)', async () => {
    const ctx = await createContext()
    const parentId = sid('parent-live')
    const childId = sid('owned-child')
    const parentSession = ctx.sessions.create(parentId, { meta: { cwd: '/proj' } })
    const childSession = ctx.sessions.create(childId, { meta: { cwd: '/proj', parentSession: parentId } })
    const parentAgent = stubAgent(ctx, parentSession)
    const childAgent = stubAgent(ctx, childSession)
    ctx.agents.register(parentAgent)
    ctx.agents.register(childAgent)
    // Attest ownership: child is owned by the live parent.
    vi.spyOn(ctx.agents, 'isOwnedBy').mockImplementation((id, parent) =>
      id === childId && parent === parentAgent)

    const result = await createApiRemoteAgentResolver(ctx, {})(childId)

    expect(result).toMatchObject({ error: { code: 'agent-busy' } })
    await ctx.fiber.dispose()
  })
})
