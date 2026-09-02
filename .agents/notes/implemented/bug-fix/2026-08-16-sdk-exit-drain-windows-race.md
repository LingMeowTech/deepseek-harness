# Agent Note: SDK JSON-RPC shutdown drains native handles before exit

Status: implemented

English | [中文](2026-08-16-sdk-exit-drain-windows-race.zh.md)

## Problem

`dsh-jsonrpc-agent` could crash on Windows with `0xC0000409` and the libuv
`UV_HANDLE_CLOSING` assertion after a worker turn that used the `write` tool.
The shutdown path called `process.exit(0)` immediately after root disposal.
Root disposal proves the Cordis tree is quiescent, but it does not prove Node
and its native dependencies have finished retiring every asynchronous handle.
An immediate `process.exit()` can therefore interrupt an in-flight fs/libuv
handle cleanup on Windows.

The same pattern existed in the SDK server plugin
(`packages/sdk/server/src/index.ts`) and in the JSON-RPC app bin runner
(`packages/examples/jsonrpc-demo/src/runner.ts`). The worker keyless smoke
reproduced the crash after a model-driven `write` tool call, while a
text-only model turn did not.

## Decision

After a successful root disposal, both exit paths now record the exit code with
`process.exitCode` and close the stdio streams instead of calling
`process.exit()`. Node then drains remaining native handles and exits
naturally with the recorded status.

- `packages/sdk/server/src/index.ts`: the production `exit` default becomes
  `process.exitCode = code`; after disposal it destroys `process.stdin` and
  ends `process.stdout` when those are the real production streams. The test
  `exit` hook is unchanged, so in-memory plugin tests still observe the exit
  request.
- `packages/examples/jsonrpc-demo/src/runner.ts`: after `ctx.fiber.dispose()`
  succeeds, it records `process.exitCode`, destroys stdin, and ends stdout.
  If disposal fails, the tree cannot be assumed quiescent and `process.exit()`
  still forces the requested status.

This follows the existing policy recorded in
[`2026-08-03-cli-signal-shutdown-escalation.md`](2026-08-03-cli-signal-shutdown-escalation.md):
normal completion deliberately avoids `process.exit()` so Node can retire
native async handles first.

## Alternatives considered

**Keep `process.exit(0)` after successful disposal.** Rejected because the
reproduced Windows crash is exactly the native-handle race that an immediate
forced exit can trigger.

**Only close streams without changing the exit default.** Rejected because the
production default still called `process.exit()`, which is the race itself.

**Force exit on a timer after disposal.** Rejected as unnecessary: after root
disposal and stdio close there are no remaining application handles to drain in
the SDK stdio process, and a timer reintroduces the same race window.

## Consequences

SDK shutdown and EOF/signal disposal now exit naturally after native handles
drain. The protocol still returns the `shutdown` response before disposal and
the process still exits with status 0 for a clean shutdown. If a future plugin
leaves a non-stdio handle alive, the process may stay up instead of being cut
short; that is the correct failure mode for a process whose tree is already
quiescent, and the SDK client's existing EOF/SIGTERM/SIGKILL reap ladder still
bounds it.

## Testing

- `packages/sdk/server/tests/plugin-apply.spec.ts` keeps the shutdown ordering
  assertions: response → flush → root disposal → exit request.
- `packages/sdk/server/tests/server.spec.ts` and protocol transport tests still
  pass.
- `worker-keyless-smoke.e2e.ts` scenario 1 (model-driven `write` tool then
  shutdown) passed 8 consecutive stress runs on Windows after the fix; the full
  two-scenario e2e also passed once, including two concurrent `dsh-sdk`
  subagent child processes.
