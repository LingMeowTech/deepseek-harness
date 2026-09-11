# Agent Note：SDK JSON-RPC 关闭时先排空原生句柄再退出

状态：已实现

[English](2026-08-16-sdk-exit-drain-windows-race.md) | 中文

## 问题

`dsh-jsonrpc-agent` 在 Windows 上可能以 `0xC0000409` 和 libuv
`UV_HANDLE_CLOSING` 断言崩溃，触发场景是 worker 某一轮使用了 `write` 工具。
关闭路径在根级 dispose 之后立即调用 `process.exit(0)`。根级 dispose 只能证明
Cordis 插件树已停稳，不能证明 Node 及其原生依赖已经回收所有异步句柄；
因此立即 `process.exit()` 可能在 Windows 上打断尚未完成的 fs/libuv 句柄清理。

同样的模式存在于 SDK server 插件
（`packages/sdk/server/src/index.ts`）与 JSON-RPC app bin runner
（`packages/examples/jsonrpc-demo/src/runner.ts`）。worker keyless smoke 在
模型调用 `write` 工具后稳定复现该崩溃，而纯文本模型轮不会触发。

## 决策

成功完成根级 dispose 后，两条退出路径都改为用 `process.exitCode` 记录退出码，
并关闭 stdio 流，而不是调用 `process.exit()`。Node 随后排空剩余原生句柄，
以记录的状态自然退出。

- `packages/sdk/server/src/index.ts`：生产环境的 `exit` 默认实现改为
  `process.exitCode = code`；dispose 后，在确为生产 stdio 时销毁
  `process.stdin` 并结束 `process.stdout`。测试注入的 `exit` 钩子保持不变，
  因此内存插件测试仍能观察到退出请求。
- `packages/examples/jsonrpc-demo/src/runner.ts`：`ctx.fiber.dispose()` 成功后
  记录 `process.exitCode`、销毁 stdin、结束 stdout；若 dispose 失败，
  树不能被假定为已停稳，仍用 `process.exit()` 强制以请求状态退出。

这与既有策略
[`2026-08-03-cli-signal-shutdown-escalation.zh.md`](2026-08-03-cli-signal-shutdown-escalation.zh.md)
一致：正常完成刻意避免 `process.exit()`，让 Node 先回收原生异步句柄。

## 备选方案

**dispose 成功后仍调用 `process.exit(0)`。** 否决：复现的 Windows 崩溃正是
立即强制退出触发的原生句柄竞态。

**只关闭流而不改 exit 默认实现。** 否决：生产默认仍会调用 `process.exit()`，
竞态本身没有消除。

**dispose 后定时强制退出。** 否决：SDK stdio 进程在根级 dispose 与 stdio
关闭后没有剩余应用句柄需要排空，定时器反而重新引入同一竞态窗口。

## 影响

SDK shutdown 与 EOF/信号 dispose 现在会在原生句柄排空后自然退出。协议仍先
返回 `shutdown` 响应再 dispose，干净关闭时进程仍以状态 0 退出。若未来某个
插件遗留非 stdio 句柄，进程可能不会立即退出；这对已停稳的进程是正确的失败
模式，且 SDK client 现有的 EOF/SIGTERM/SIGKILL 回收阶梯仍会兜底。

## 测试

- `packages/sdk/server/tests/plugin-apply.spec.ts` 保持关闭顺序断言：
  响应 → flush → 根级 dispose → 退出请求。
- `packages/sdk/server/tests/server.spec.ts` 与 protocol transport 测试全部通过。
- `worker-keyless-smoke.e2e.ts` 场景 1（模型调用 `write` 工具后 shutdown）
  在 Windows 上修复后连续 8 次压力运行通过；完整两场景 e2e 也通过一次，
  包括两个并发 `dsh-sdk` 子 agent 子进程。
