# dsh-mcp-github

DSH bundle that mounts the GitHub MCP server from the official `ghcr.io/github/github-mcp-server` Docker image.

## What it does

Adds one `@deepseek-ai/dsh-mcp-client` row named `github` that runs:

```sh
docker run -i --rm -e GITHUB_PERSONAL_ACCESS_TOKEN ghcr.io/github/github-mcp-server
```

Discovered tools are exposed to the model as `mcp__github__<tool>`.

## Requirements

- Docker installed and running; the image is pulled on first run.
- A GitHub personal access token, exported to the environment, never committed:

```sh
export GITHUB_PERSONAL_ACCESS_TOKEN='...'
```

The patch reads it at load time with `!!js process.env.GITHUB_PERSONAL_ACCESS_TOKEN`.

## Install

```sh
dsh plugin --profile web add ./packages/dsh-mcp-github   # from this repo root
# or, after npm publish:
dsh plugin --profile web add dsh-mcp-github
```

## Notes

- The server command is trusted executable code (Docker) that runs outside the agent sandbox; enable it only when that is acceptable.
