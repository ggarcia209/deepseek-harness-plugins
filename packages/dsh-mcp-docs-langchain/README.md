# dsh-mcp-docs-langchain

DSH bundle that mounts the LangChain Docs MCP server over Streamable HTTP.

## What it does

Adds one `@deepseek-ai/dsh-mcp-client` row named `docs-langchain` pointing at `https://docs.langchain.com/mcp`. Discovered tools are exposed to the model as `mcp__docs-langchain__<tool>`.

## Install

```sh
dsh plugin --profile web add ./packages/dsh-mcp-docs-langchain   # from this repo root
# or, after npm publish:
dsh plugin --profile web add dsh-mcp-docs-langchain
```

## Known limitation

The source configuration disabled `submit_feedback` (`disabledTools`). `@deepseek-ai/dsh-mcp-client` does not yet support per-server tool filtering, so that tool is still exposed. The fix belongs in `dsh-mcp-client` (a `disabledTools` config field filtered during discovery); until then the `mcp__docs-langchain__submit_feedback` tool remains visible.
