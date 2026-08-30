/**
 * B13 RED: decision-answer channel main path (T001, US1).
 *
 * Contract under test (scheme a, preferred): a continuable child that pauses
 * on ask_user_question can be answered through the subagent delivery channel —
 * `ctx.subagents.followup(parent, childId, content, { answers })` accepts a
 * structured decision answer for the pending ask, the child resumes with the
 * chosen option, and the settled run reports the outcome with the echoed rpcId.
 *
 * RED expectation: today an owned child's ask_user_question is rejected with
 * DELEGATED_CALLER (no pause exists) and followup accepts no `answers`, so the
 * pause assertion below fails with "channel missing / not implemented".
 */

import { afterEach, describe, expect, it, vi } from 'vitest'
import { mkdtempSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { Context } from '@deepseek-ai/cordis'
import type { Agent } from '@deepseek-ai/dsh-agent'
import AgentLoop from '@deepseek-ai/dsh-agent-loop'
import { mountAgentLoopTestDependencies } from '@deepseek-ai/dsh-agent-loop-testkit'
import { SessionId } from '@deepseek-ai/dsh-session'
import JsonlSessionPersistence from '@deepseek-ai/dsh-session-persistence-jsonl'
import * as SubagentSpawn from '@deepseek-ai/dsh-subagent-spawn-in-process'
import * as SubagentFork from '@deepseek-ai/dsh-subagent-fork-in-process'
import type { AskUserQuestionRequest } from '@deepseek-ai/dsh-user-questions'
import UserQuestionService from '@deepseek-ai/dsh-user-questions'
import * as AskUserTool from '@deepseek-ai/dsh-tool-ask-user'
import SubagentRuntime from '../src/index.ts'
import type { SubagentRunEndInfo } from '../src/index.ts'
import { MockAdapter, textResponse, toolCallResponse } from '../../../core/agent-loop/tests/mock-adapter.ts'

type Script = ConstructorParameters<typeof MockAdapter>[0]

// Persistence-backed temp root cleanup (Windows EPERM guard: dispose before rm).
const cleanups: Array<() => Promise<void>> = []
afterEach(async () => {
  const errors: unknown[] = []
  for (const cleanup of cleanups.splice(0)) {
    try { await cleanup() } catch (error) { errors.push(error) }
  }
  if (errors.length === 1) throw errors[0]
  if (errors.length > 1) throw new AggregateError(errors, 'temp-root cleanup failed')
})

/** Boot the continuable stack plus the user-questions seam (service + ask tool). */
async function setupWith(adapter: MockAdapter): Promise<{
  ctx: Context
  parent: Agent
  ask: ReturnType<typeof vi.fn>
}> {
  const ctx = new Context()
  await mountAgentLoopTestDependencies(ctx)
  const root = mkdtempSync(join(tmpdir(), 'dsh-subagent-decision-answer-'))
  const persistedRoot = root
  const persistenceFiber = await ctx.plugin(JsonlSessionPersistence, { root })
  cleanups.push(async () => {
    await persistenceFiber.dispose()
    rmSync(persistedRoot, { recursive: true, force: true, maxRetries: 10, retryDelay: 100 })
  })
  await ctx.plugin(AgentLoop, { agents: [] })
  await ctx.plugin(SubagentRuntime)
  await ctx.plugin(SubagentSpawn, { providerName: 'spawn' })
  await ctx.plugin(SubagentFork, { providerName: 'fork' })
  await ctx.plugin(UserQuestionService)
  await ctx.plugin(AskUserTool)
  ctx.llm.registerAdapter(['mock'], adapter)
  // Manual provider: records every ask; the test answers the pending ask by
  // resolving the captured promise, mirroring how the host pending table
  // parks a question/requested frame until /api/respond settles it.
  const resolvers: Array<(value: unknown) => void> = []
  const ask = vi.fn((request: AskUserQuestionRequest) => new Promise((resolve) => {
    resolvers.push(resolve)
    void request
  }))
  ctx.userQuestions.registerProvider({ ask } as never)
  const parent = ctx.agentLoop.create(SessionId('parent'), { provider: 'mock', model: 'mock' })
  return { ctx, parent, ask }
}

async function setup(script: Script) {
  const adapter = new MockAdapter(script)
  const booted = await setupWith(adapter)
  return { ...booted, adapter }
}

const testSignal = new AbortController().signal

function startSpec(parent: Agent) {
  return {
    provider: 'spawn',
    label: 'child task',
    request: { prompt: [{ type: 'text' as const, text: 'child task' }], parent },
    signal: testSignal,
  }
}

function message(text: string) {
  return [{ type: 'text' as const, text }]
}

/** Scheme-a delivery: followup with a structured decision answer batch. */
function answerFollowup(
  ctx: Context,
  parent: Agent,
  childId: SessionId,
  answers: unknown,
) {
  return ctx.subagents.followup(parent, childId, message('answer'), {
    source: { kind: 'user' },
    signal: testSignal,
    answers,
  } as never)
}

/** Wait until a child's Activation is gone, i.e. its handle finished disposal. */
async function waitNoActivation(ctx: Context, childId: SessionId): Promise<void> {
  await vi.waitFor(() => {
    expect(ctx.agents.get(childId)).toBeUndefined()
  }, { timeout: 5_000 })
}

/** Keep the top-level test parent out of the scripted model corpus. */
function parkParent(ctx: Context, parent: Agent): void {
  ctx.on('agent/pre-step', async ({ agent: subject }, next) => {
    if (subject !== parent) return next()
    return { kind: 'reject' as const }
  })
}

describe('B13 decision-answer channel (T001, scheme a)', () => {
  it('answers a paused child ask through followup answers and the child resumes with the chosen option', async () => {
    // Turn 1: the child calls ask_user_question (question id "target");
    // turn 2 (after the answer lands): it reports the chosen option.
    const { ctx, parent, adapter, ask } = await setup([
      toolCallResponse('t1', 'ask_user_question', {
        questions: [{
          id: 'target',
          question: 'Pick a target',
          options: [{ label: 'Code' }, { label: 'Docs' }],
        }],
      }),
      textResponse('chose Code'),
    ])
    parkParent(ctx, parent)
    const ends: SubagentRunEndInfo[] = []
    ctx.on('subagent/end', info => void ends.push(info))

    const started = await ctx.subagents.startContinuable(startSpec(parent))
    await vi.waitFor(() => {
      const found = ctx.agents.get(started.childId)
      expect(found).toBeDefined()
    })

    // The child's ask must PAUSE (reach the questions provider) instead of
    // dying with DELEGATED_CALLER. RED today: an owned child cannot pause, so
    // this waitFor times out — the decision-answer channel is missing.
    await vi.waitFor(() => {
      expect(ask.mock.calls.length).toBeGreaterThan(0)
    }, { timeout: 3_000 })
    const request = ask.mock.calls[0]?.[0] as AskUserQuestionRequest
    expect(request.questions[0]?.id).toBe('target')
    const child = ctx.agents.get(started.childId)
    expect(child?.status).toBe('running')

    // Parent answers the paused ask through the delivery channel (scheme a:
    // one ask answered as a whole batch, rpcId echoed in the answer id).
    const answered = await answerFollowup(ctx, parent, started.childId, {
      answers: [{ id: 'target', selected: ['Code'] }],
    })
    expect(answered).toBeTypeOf('string')

    // The child resumes with the chosen option and settles; the run reports
    // the outcome (turn 2 consumed by the child, not the parked parent).
    await vi.waitFor(() => {
      expect(adapter.requests.length).toBeGreaterThanOrEqual(2)
    })
    await waitNoActivation(ctx, started.childId)
    expect(ends.length).toBeGreaterThan(0)
    expect(ends.at(-1)?.stopReason).toBe('completed')
  }, 10_000)

  it('rejects a decision answer for an unknown rpcId with a structured error', async () => {
    const { ctx, parent } = await setup([textResponse('settled')])
    parkParent(ctx, parent)
    const started = await ctx.subagents.startContinuable(startSpec(parent))
    await waitNoActivation(ctx, started.childId)

    // A decision answer for a rpcId with no pending ask must surface a
    // structured not-found error, never a silent success.
    await expect(answerFollowup(ctx, parent, started.childId, {
      answers: [{ id: 'missing', selected: ['Code'] }],
    })).rejects.toMatchObject({ code: 'NOT_PENDING' })
  }, 10_000)
})
