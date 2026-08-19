# dsh-workspace-rules

Always-on workspace rules from a per-repo directory of arbitrary `.md` files. Unlike the built-in instruction loader (which reads only fixed names like `AGENTS.md`), this plugin reads **every top-level `*.md` file** in a directory you choose, and injects them into every session whose working directory is under that repo.

## What it does

- On a session's first step, discovers the repo root (nearest `.git` ancestor of the session cwd).
- Reads all top-level `*.md` files in the rules directory, in filename order.
- Folds one durable `<system-reminder>` message into the first request, so the rules are present in every later turn.
- Skips re-injection on resume when the rules have not changed (content digest).

## Rules directory

Default: `<repoRoot>/.dsh/rules`. Override per repo or per session, in precedence order:

1. **Environment variable** `RULE_LOCATION_DIR` (absolute, or relative to the repo root).
2. **Repo config file** `<repoRoot>/.dsh/config.yml`:

   ```yaml
   rules:
     location: .team/rules
   ```

   (a flat `location: .team/rules` is also accepted).
3. **Plugin `defaultLocation`** (default `.dsh/rules`).

A missing or empty directory is a no-op — no message is injected.

## Install

```sh
# from this repository root:
dsh plugin --profile web add ./packages/dsh-workspace-rules
```

The plugin mounts on the host plane, so it applies to every agent/session regardless of preset. New sessions pick it up; running sessions keep their current composition.

## Config

| Field | Default | Meaning |
|---|---|---|
| `maxBytes` | `16384` | UTF-8 byte cap for the rendered message; whole files are dropped (with a notice) on overflow |
| `defaultLocation` | `.dsh/rules` | Fallback rules directory, relative to the repo root |
| `envVar` | `RULE_LOCATION_DIR` | Environment variable that overrides the location |
| `repoConfigFile` | `.dsh/config.yml` | Per-repo override file, relative to the repo root |
| `fileExtension` | `.md` | Case-insensitive extension filter |

Override any of these in the `config` of the `workspace-rules` row in your profile's `cordis.patch.yml`.

## Notes

- Only **top-level** `*.md` files are read (no recursion); hidden files and subdirectories are skipped.
- Rule content cannot close the injected frame: `</system-reminder>` in a rule is escaped.
- The package declares no install-time dependencies on `@deepseek-ai/*`: those resolve at runtime through the profile's module-fallback symlinks (`~/.dsh/profiles/node_modules`), which the `dsh` CLI maintains from its own install.
- Run tests with `node --test packages/dsh-workspace-rules/test` from the repo root.
