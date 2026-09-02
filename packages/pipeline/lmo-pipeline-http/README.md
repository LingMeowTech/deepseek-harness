# @deepseek-ai/dsh-lmo-pipeline-http

The **`HttpLmoPipeline`** provider implements `ctx.lmoPipeline` over lmo-server's HMAC-signed HTTP API. It maps snake_case server JSON into the `@deepseek-ai/dsh-lmo-pipeline` camelCase values and maps HTTP/transport failures onto `LmoPipelineError`.

## Config

| Key | Default | Meaning |
|---|---|---|
| `providerName` | `http` | Provider identity for diagnostics |
| `baseUrl` | `$LMO_SERVER_HOST` | lmo-server origin; `https://` is prepended when no scheme is present |
| `secretId` | `$LMO_SERVER_SECRET_ID` | HMAC secret id |
| `secretKey` | `$LMO_SERVER_SECRET_KEY` | HMAC signing key as a hex string |
| `timeoutMs` | `30000` | Per-request fetch timeout |

A missing base URL or credential fails at plugin load.

## Signing

Each request is signed with the `lmo_server_api.py` canonical form: `METHOD\nPATH\nQUERY\nBODY_SHA256\nTIMESTAMP\nNONCE`. The headers are `X-Secret-Id`, `X-Timestamp`, `X-Nonce`, and `X-Signature`; the body hash covers the exact bytes sent, and the path is decoded the way lmo-server's `r.URL.Path` sees it.

## Transport boundary

This provider uses Node's global `fetch` directly. `ctx.web` fetch is a GET-only anonymous public-resource capability with no custom headers, no POST/PATCH, and non-2xx responses as results, so it cannot carry signed pipeline requests. The provider owns its HMAC headers, methods, timeout, and error mapping instead.

## Model Experience

Indirectly, through `dsh-tool-lmo-pipeline`, which renders the records this provider returns into the model-facing `pipeline_*` results.

#### KV Cache effect

No direct invalidation; the named consumer owns any request-prefix changes.

## Known Limitations and Deferred Work

- **No request-size or response-size caps** — pipeline PRDs and job outputs are passed through at server size; a byte budget belongs to the tool or host consumer once one needs it.
- **No retry policy** — lmo-server failures surface immediately; retry behavior is deferred until a caller proves it needs idempotent-safe retries.
