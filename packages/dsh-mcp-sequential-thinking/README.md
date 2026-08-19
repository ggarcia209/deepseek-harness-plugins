# dsh-mcp-sequential-thinking

DSH bundle that mounts the [Sequential Thinking](https://github.com/modelcontextprotocol/servers/tree/main/src/sequentialthinking) MCP server.

## What it does

Adds one `@deepseek-ai/dsh-mcp-client` row named `sequential-thinking` that spawns:

```sh
npx -y @modelcontextprotocol/server-sequential-thinking
```

Discovered tools are exposed to the model as `mcp__sequential-thinking__<tool>`.

## Install

```sh
dsh plugin --profile web add ./packages/dsh-mcp-sequential-thinking   # from this repo root
# or, after npm publish:
dsh plugin --profile web add dsh-mcp-sequential-thinking
```

## Notes

- The server package is fetched on first use by `npx -y`; it needs a network connection.
