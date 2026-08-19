# DeepSeek Harness Plugins

Out-of-tree plugin bundles for [DeepSeek Harness](https://github.com/deepseek-ai/deepseek-harness), installed with `dsh plugin --profile <name> add <spec>`.

## MCP server bundles

Five installable bundles, one per MCP server. Each declares a single `@deepseek-ai/dsh-mcp-client` row; the client ships with the `dsh` CLI, so these bundles carry configuration only.

| Bundle | Package | Server | Transport |
|---|---|---|---|
| [`packages/dsh-mcp-atlassian`](packages/dsh-mcp-atlassian) | `dsh-mcp-atlassian` | Atlassian (via `mcp-remote` SSE bridge) | stdio |
| [`packages/dsh-mcp-github`](packages/dsh-mcp-github) | `dsh-mcp-github` | GitHub (`github/github-mcp-server` Docker image) | stdio |
| [`packages/dsh-mcp-sequential-thinking`](packages/dsh-mcp-sequential-thinking) | `dsh-mcp-sequential-thinking` | Sequential Thinking | stdio |
| [`packages/dsh-mcp-docs-langchain`](packages/dsh-mcp-docs-langchain) | `dsh-mcp-docs-langchain` | LangChain Docs | streamable-http |
| [`packages/dsh-mcp-reference-langchain`](packages/dsh-mcp-reference-langchain) | `dsh-mcp-reference-langchain` | LangChain Reference | streamable-http |

## Install

Each bundle installs into a profile by itself. From this checkout, install one with a local path spec (anchored to the invoking directory):

```sh
dsh plugin --profile web add ./packages/dsh-mcp-atlassian
```

Or package it and install the tarball, or install by npm name after publishing:

```sh
pnpm --filter dsh-mcp-atlassian pack
dsh plugin --profile web add ./packages/dsh-mcp-atlassian/dsh-mcp-atlassian-0.1.0.tgz
# or, after `pnpm publish`:
dsh plugin --profile web add dsh-mcp-atlassian
```

Each bundle is a package in a monorepo, not the repository root, so a single `dsh plugin add github:ggarcia209/deepseek-harness-plugins` installs only this root (which ships no `dsh.bundle` layer). Install individual packages by clone + path spec, tarball, or npm name.

## Secrets

No secret is stored in this repository. The GitHub bundle reads `GITHUB_PERSONAL_ACCESS_TOKEN` from the environment at load time (`!!js process.env.GITHUB_PERSONAL_ACCESS_TOKEN`); export it (or put it in `.env`) before booting. Never commit a token.
