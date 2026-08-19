# dsh-mcp-reference-langchain

DSH bundle that mounts the LangChain Reference MCP server over Streamable HTTP.

## What it does

Adds one `@deepseek-ai/dsh-mcp-client` row named `reference-langchain` pointing at `https://reference.langchain.com/mcp`. Discovered tools are exposed to the model as `mcp__reference-langchain__<tool>`.

## Install

```sh
dsh plugin --profile web add ./packages/dsh-mcp-reference-langchain   # from this repo root
# or, after npm publish:
dsh plugin --profile web add dsh-mcp-reference-langchain
```
