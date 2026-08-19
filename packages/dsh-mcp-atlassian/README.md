# dsh-mcp-atlassian

DSH bundle that mounts the Atlassian MCP server through the `mcp-remote` stdio-to-SSE bridge.

## What it does

Adds one `@deepseek-ai/dsh-mcp-client` row named `atlassian` that spawns:

```sh
npx -y mcp-remote https://mcp.atlassian.com/v1/sse
```

Discovered tools are exposed to the model as `mcp__atlassian__<tool>`.

## Install

```sh
dsh plugin --profile web add ./packages/dsh-mcp-atlassian   # from this repo root
# or, after npm publish:
dsh plugin --profile web add dsh-mcp-atlassian
```

## Notes

- `mcp-remote` is fetched on first use by `npx -y`; it needs a network connection.
- The upstream endpoint is an SSE URL; `mcp-remote` bridges it to stdio for the `stdio` transport.
