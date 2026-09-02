/**
 * Decision-answer channel for continuable subagents.
 *
 * A continuable child that calls `ask_user_question` is rejected by the host
 * questions service with `DELEGATED_CALLER` (an owned agent has no human
 * answerer). This module gives the child a scoped `userQuestions` shadow whose
 * `ask` parks the question in a per-child pending table instead of dying, and
 * forwards the same request to the host domain (agent stripped, so the fence
 * never fires) for visibility. The direct parent or an external client settles
 * the pending ask through the delivery channel — `followup({ answers })` or
 * the `subagent.answer` RPC — and the parked promise resolves with the chosen
 * option, letting the child resume its current turn.
 *
 * The question id is the echoed rpcId (host questions-domain alignment: one
 * ask is answered as a whole batch, never split per question).
 *
 * @module @deepseek-ai/dsh-subagent/decision-answer
 */

import type { Context } from '@deepseek-ai/cordis'
import type { SessionId } from '@deepseek-ai/dsh-session'
import { SubagentError } from './error.ts'

/** One question a continuable child parked while waiting for a decision. */
export interface DecisionAskQuestion {
  /** Stable caller-provided question id, echoed in the answer. */
  readonly id: string
  /** The question to display. */
  readonly question: string
  /** Optional short heading/group label. */
  readonly header?: string
  /** Optional choices the UI can render as a menu. */
  readonly options?: ReadonlyArray<{ readonly label: string; readonly description?: string }>
  /** Whether more than one option may be selected. Defaults to single-select. */
  readonly multiSelect?: boolean
}

/** Answer to one parked question (id is the echoed question id). */
export interface DecisionAnswerItem {
  readonly id: string
  /** Selected option labels; may accompany custom text for a multi-select question. */
  readonly selected: readonly string[]
  /** Optional free-text "Other" answer. */
  readonly custom?: string
}

/** The whole batch answering one parked ask. */
export interface DecisionAnswer {
  readonly answers: readonly DecisionAnswerItem[]
}

/** The subset of the host ask request this channel parks. */
export interface DecisionAskRequest {
  readonly questions: readonly DecisionAskQuestion[]
  readonly signal?: AbortSignal
}

/** One parked ask entry in the decision table. */
interface PendingAsk {
  readonly childId: SessionId
  readonly questions: readonly DecisionAskQuestion[]
  readonly resolve: (answer: DecisionAnswer) => void
  readonly reject: (error: unknown) => void
  readonly abort: () => void
}

/**
 * Per-child pending-ask table for the decision-answer channel. One entry per
 * child: a child that parks a second ask while one is pending is a protocol
 * violation and rejects.
 */
export class SubagentDecisionAnswerTable {
  private readonly pending = new Map<SessionId, PendingAsk>()
  private readonly children = new Set<SessionId>()

  /**
   * Install the scoped `userQuestions` shadow on a continuable child's agent
   * context. The shadow parks asks from this table's children and forwards
   * them (without the owned-agent field) to the host questions domain for
   * visibility; every other member (provider state, registerProvider, events)
   * transparently delegates to the host service.
   * @param childCtx - the child agent's scoped creation context.
   * @param childId - the durable child session id.
   */
  installOn(childCtx: Context, childId: SessionId): void {
    const root = childCtx.get('userQuestions')
    if (root === undefined) return
    this.children.add(childId)
    // The ask tool resolves `ctx.userQuestions` from the tool plugin's own
    // context (which carries the host service in its fiber store), never from
    // a child-scoped fiber store, so a shadow installed there is invisible.
    // Instead we intercept the cordis `internal/get` waterfall on the child's
    // context: every `userQuestions` resolution routed through this child
    // (including the tool plugin's) returns the shadow. Asks are then routed
    // by the requesting agent id: children owned by this table park here,
    // everything else transparently reaches the host service.
    const shadow = new Proxy(root, {
      get: (target, prop) => {
        if (prop === 'ask') {
          return (request: DecisionAskRequest) => {
            const agentId = (request as { agent?: { id?: unknown } }).agent?.id
            if (typeof agentId === 'string' && this.children.has(agentId as SessionId)) {
              return this.decisionAsk(agentId as SessionId, request, target)
            }
            return target.ask(request as never)
          }
        }
        return Reflect.get(target, prop)
      },
    }) as never
    childCtx.on('internal/get', (_subject, prop, _error, next) => {
      if (prop === 'userQuestions') return shadow
      return next()
    }, { global: true, prepend: true })
  }

  /**
   * Park one ask: record the questions and return a promise that resolves when
   * {@link answer} settles the batch. The host request is forwarded without
   * the owned-agent field so the host questions domain renders it without the
   * `DELEGATED_CALLER` fence; the parked promise alone drives the child.
   * @param childId - the asking child session id.
   * @param request - the questions and caller signal.
   * @param root - the host questions service (resolved before the shadow is installed).
   * @returns the decision answer once {@link answer} settles the batch.
   */
  private decisionAsk(
    childId: SessionId,
    request: DecisionAskRequest,
    root: { ask(request: unknown): Promise<unknown> },
  ): Promise<DecisionAnswer> {
    const parked = this.pause(childId, request.questions, request.signal)
    // Forward to the host questions domain for visibility; the host pending
    // table may render and even answer it, but the child waits on this table.
    void Promise.resolve(root.ask({ ...request, agent: undefined } as never)).catch(() => undefined)
    return parked
  }

  /**
   * Park the child's ask and return the promise the scoped tool waits on.
   * @param childId - the asking child session id.
   * @param questions - the questions to park.
   * @param signal - optional caller cancellation; abort rejects with ASK_ABORTED.
   * @returns the decision answer once {@link answer} settles the batch.
   */
  private pause(
    childId: SessionId,
    questions: readonly DecisionAskQuestion[],
    signal?: AbortSignal,
  ): Promise<DecisionAnswer> {
    if (this.pending.has(childId)) {
      return Promise.reject(new SubagentError(
        `subagent "${childId}" already has a pending ask; answer it before asking again`,
        'ASK_CONFLICT',
      ))
    }
    return new Promise<DecisionAnswer>((resolve, reject) => {
      const onAbort = (): void => {
        if (this.pending.delete(childId)) {
          reject(new SubagentError('ask_user_question was aborted before the answer landed', 'ASK_ABORTED'))
        }
      }
      const entry: PendingAsk = {
        childId,
        questions,
        resolve: (answer) => {
          signal?.removeEventListener('abort', onAbort)
          resolve(answer)
        },
        reject: (error) => {
          signal?.removeEventListener('abort', onAbort)
          reject(error)
        },
        abort: onAbort,
      }
      this.pending.set(childId, entry)
      signal?.addEventListener('abort', onAbort, { once: true })
    })
  }

  /**
   * Settle one child's parked ask with a structured answer batch. Every answer
   * id must name a parked question; an unknown id or a child with no pending
   * ask rejects with `NOT_PENDING` (never a silent success).
   * @param childId - the answered child session id.
   * @param items - the answer batch (one ask answered as a whole).
   * @throws {SubagentError} `NOT_PENDING` when no parked ask matches the batch.
   */
  answer(childId: SessionId, items: readonly DecisionAnswerItem[]): Promise<void> {
    const entry = this.pending.get(childId)
    if (entry === undefined) {
      return Promise.reject(new SubagentError(
        `subagent "${childId}" has no pending ask to answer`,
        'NOT_PENDING',
      ))
    }
    const known = new Set(entry.questions.map(question => question.id))
    for (const item of items) {
      if (!known.has(item.id)) {
        return Promise.reject(new SubagentError(
          `answer "${item.id}" matches no pending question of subagent "${childId}"`,
          'NOT_PENDING',
        ))
      }
    }
    this.pending.delete(childId)
    entry.resolve({
      answers: items.map(item => ({
        id: item.id,
        selected: [...item.selected],
        ...(item.custom === undefined ? {} : { custom: item.custom }),
      })),
    })
    return Promise.resolve()
  }

  /**
   * List the questions of a child's parked ask, if any.
   * @param childId - the child session id to inspect.
   * @returns the parked questions, or an empty array when none are parked.
   */
  pendingQuestions(childId: SessionId): readonly DecisionAskQuestion[] {
    return this.pending.get(childId)?.questions ?? []
  }

  /** Drop any parked ask for a child (settlement/teardown cleanup). */
  clear(childId: SessionId): void {
    const entry = this.pending.get(childId)
    if (entry === undefined) return
    this.pending.delete(childId)
    entry.reject(new SubagentError(
      `subagent "${childId}" settled while its ask was pending`,
      'ASK_ABORTED',
    ))
  }
}
