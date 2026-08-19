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

## How to use

Install a bundle into a profile with `dsh plugin --profile <name> add <spec>`. The command initializes the profile when missing, forwards to pnpm inside the profile directory, and appends the bundle to the profile's layer stack when the package declares `dsh.bundle` (every bundle here does). Relative path specs are anchored to the directory you run the command from.

### 1. Install from this checkout

```sh
# from the repository root:
dsh plugin --profile web add ./packages/dsh-mcp-atlassian
```

### 2. Install from a tarball

```sh
cd packages/dsh-mcp-atlassian && pnpm pack          # -> dsh-mcp-atlassian-0.1.0.tgz in that directory
dsh plugin --profile web add ./packages/dsh-mcp-atlassian/dsh-mcp-atlassian-0.1.0.tgz
```

### 3. Install from npm

```sh
dsh plugin --profile web add dsh-mcp-atlassian      # after publishing (see below)
```

### Verify and use

```sh
dsh --profile web --dump-config                     # shows the inserted mcp row
dsh --profile web                                   # boot; the model sees mcp__<serverName>__<tool> tools
```

The stdio bundles need `npx`/Docker and network access at runtime; the GitHub bundle also needs `GITHUB_PERSONAL_ACCESS_TOKEN` (see [Secrets](#secrets)). Remove a bundle with `dsh plugin --profile web remove dsh-mcp-atlassian`, which removes both the dependency and its layer.

Each bundle is a package in a monorepo, not the repository root, so a single `dsh plugin add github:<you>/deepseek-harness-plugins` installs only this root (which ships no `dsh.bundle` layer). Install individual packages by clone + path spec, tarball, or npm name.

## Publishing via pnpm / npm

Each bundle is an independent npm package, so publish them one at a time to the npm registry. The published tarball contains only `cordis.patch.yml`, `package.json`, and `README.md` (the `files` field) — no build step is required for these configuration-only bundles.

Prerequisites:

- an npm account (`npm login`) with publish rights for the package name you choose
- `pnpm` on PATH

Per package:

1. (Recommended) Rename to a scoped name you own and make the scope public, e.g. in `packages/dsh-mcp-atlassian/package.json`:

   ```json
   {
     "name": "@your-scope/dsh-mcp-atlassian",
     "publishConfig": { "access": "public" }
   }
   ```

   Unscoped names publish public by default; scoped packages default to restricted and need `publishConfig.access`.

2. Bump `version` as needed.

3. Publish from the repository root, one package per command:

   ```sh
   pnpm --filter dsh-mcp-atlassian publish
   # or, after renaming:
   pnpm --filter @your-scope/dsh-mcp-atlassian publish
   ```

4. Install the published package in any profile:

   ```sh
   dsh plugin --profile web add @your-scope/dsh-mcp-atlassian
   ```

Before publishing, test the exact artifact locally: `pnpm pack` (see [Install from a tarball](#2-install-from-a-tarball)) and confirm the bundle loads with `dsh --profile web --dump-config`.

## Secrets

No secret is stored in this repository. The GitHub bundle reads `GITHUB_PERSONAL_ACCESS_TOKEN` from the environment at load time (`!!js process.env.GITHUB_PERSONAL_ACCESS_TOKEN`); export it (or put it in `.env`) before booting. Never commit a token.
