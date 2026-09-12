/** Model-visible wrap-up instruction for a terminal autonomous goal update. */

import type { ContentBlock } from '@deepseek-ai/dsh-llm'

/**
 * Whether a session's creation header names a structured-output preset whose
 * final delivery must stay machine-readable instead of addressing the user
 * (e.g. the pipeline runner's lazy-decomposition agent emits a pure-JSON
 * action array), so it must not be told to write a closing prose message.
 * @param header - the calling session's immutable creation header; the preset
 * is recorded there by the deployment composing the session (see the pipeline
 * runner's `session.create` agentPreset flow).
 * @param presets - the deployment-configured preset names to suppress; the
 * list is a validated `Config` field, never a module constant.
 * @returns whether the header's preset is in the configured suppression list.
 */
export function isStructuredOutputSession(
  header: { readonly agentPreset?: string },
  presets: readonly string[],
): boolean {
  return header.agentPreset !== undefined && presets.includes(header.agentPreset)
}

const GROUNDING =
  'Report only what earlier rounds and tool results in this session actually establish; '
  + 'when a detail is not in the session, say so instead of inventing it. '

/**
 * Render the closing-message instruction injected after an autonomous goal
 * round reports `complete` or `blocked`, replacing the former hard turn stop
 * so the model still addresses the user once before the turn ends.
 * @param objective - the terminal goal's objective, echoed for grounding.
 * @param blockedReason - the validated report for `blocked`; omitted for `complete`.
 * @returns a fresh one-block context for `ToolRunContext.deferContext()`.
 */
export function renderWrapupContext(objective: string, blockedReason?: string): ContentBlock[] {
  const heading = `Objective: ${JSON.stringify(objective)}\n`
  const text = blockedReason === undefined
    ? '<goal_complete>\n'
      + heading
      + 'The goal is marked complete and this autonomous run is ending. Write the closing '
      + 'message to the user now: state the outcome, summarize what was done and how it was '
      + 'verified, and point to the concrete results (files, commits, or other artifacts). '
      + GROUNDING
      + 'Note anything the user should review or do next. Address the user directly. Do not '
      + "call any more tools in this run; further work waits for the user's next instruction.\n"
      + '</goal_complete>'
    : '<goal_blocked>\n'
      + heading
      + `Blocked: ${JSON.stringify(blockedReason)}\n`
      + 'The goal is marked blocked and this autonomous run is ending. Write the closing '
      + 'message to the user now: state what has been completed so far, describe the concrete '
      + 'blocking condition and what you tried, and say exactly what you need from the user to '
      + 'continue. '
      + GROUNDING
      + 'Address the user directly. Do not call any more tools in this run; further work '
      + "waits for the user's next instruction.\n"
      + '</goal_blocked>'
  return [{ type: 'text', text }]
}
