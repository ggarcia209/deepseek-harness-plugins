/**
 * Always-on workspace rules from a per-repo directory.
 *
 * One host-plane instance serves every agent/session. On the first entering
 * step of a session it reads every top-level `*.md` file in the rules
 * directory (default `<repoRoot>/.dsh/rules`, overridable via the
 * `RULE_LOCATION_DIR` env var or `<repoRoot>/.dsh/config.yml`) and folds a
 * durable `<system-reminder>` message into the step, so the rules are present
 * in every later request.
 *
 * @module dsh-workspace-rules
 */

import { createUserMessage } from '@deepseek-ai/dsh-llm'
import { isAbsolute, join, resolve } from 'node:path'
import { findRepoRoot, listRuleFiles, readRepoConfig, renderRules } from './rules.js'

export const name = 'workspace-rules'

/** Source kind tagged on injected messages; used for resume dedup. */
const SOURCE_KIND = 'workspace-rules'

/** Default plugin configuration. */
const DEFAULTS = {
  maxBytes: 16384,
  defaultLocation: '.dsh/rules',
  envVar: 'RULE_LOCATION_DIR',
  repoConfigFile: '.dsh/config.yml',
  fileExtension: '.md',
}

/**
 * Register the always-on workspace-rules loader.
 * @param ctx - cordis context.
 * @param config - optional overrides; see DEFAULTS.
 */
export function apply(ctx, config = {}) {
  const cfg = { ...DEFAULTS, ...config }

  /**
   * Resolve the rules directory for one session. Precedence: env var, repo
   * config file, plugin default. Relative values resolve against the repo root.
   * @param cwd - absolute session working directory.
   * @returns the absolute rules directory.
   */
  async function resolveRulesDir(cwd) {
    const repoRoot = await findRepoRoot(cwd)
    const candidates = []
    const env = process.env[cfg.envVar]
    if (typeof env === 'string' && env.trim() !== '') candidates.push(env.trim())
    const repo = await readRepoConfig(join(repoRoot, cfg.repoConfigFile))
    if (repo !== undefined) candidates.push(repo)
    candidates.push(cfg.defaultLocation)
    for (const candidate of candidates) {
      const value = String(candidate).trim()
      if (value === '') continue
      return isAbsolute(value) ? value : resolve(repoRoot, value)
    }
    return resolve(repoRoot, cfg.defaultLocation)
  }

  /**
   * Load and render the rules for one agent, returning the digest plus the
   * ready-to-inject user message, or `undefined` when there is nothing to add.
   */
  async function loadRules(agent, signal) {
    signal?.throwIfAborted?.()
    const cwd = agent?.session?.header?.cwd ?? process.cwd()
    const dir = await resolveRulesDir(resolve(cwd))
    const files = await listRuleFiles(dir, cfg.fileExtension)
    if (files.length === 0) return undefined
    const rendered = await renderRules(files, dir, cfg.maxBytes)
    return {
      digest: rendered.digest,
      message: createUserMessage({
        content: [{ type: 'text', text: rendered.text }],
        source: { kind: SOURCE_KIND, digest: rendered.digest, location: dir },
      }),
    }
  }

  /**
   * True when this digest already appears in durable history, so a resumed
   * session with unchanged rules does not re-inject a duplicate.
   */
  function findInjected(agent, digest) {
    const session = agent?.session
    if (!session) return false
    const nodes = Array.isArray(session.surface?.nodes) ? session.surface.nodes : []
    for (const seq of nodes) {
      const event = session.events?.[seq]
      if (
        event?.type === 'user/message'
        && event.data?.source?.kind === SOURCE_KIND
        && event.data.source.digest === digest
      ) {
        return true
      }
    }
    return false
  }

  // Agents whose rules have already been resolved this process lifetime; the
  // surface scan above covers resume, this covers the ordinary same-process case.
  const seeded = new WeakSet()

  ctx.on('agent/pre-step', async ({ agent, messages, signal }, next) => {
    const decision = await next()
    if (decision.kind !== 'enter') return decision
    if (seeded.has(agent)) return decision
    // An empty entering batch is a no-step turn; keep rules pending instead of
    // turning it into a standalone request (next pre-step retries).
    if (decision.messages.length === 0) return decision

    let rules
    try {
      rules = await loadRules(agent, signal)
    } catch (error) {
      seeded.add(agent)
      ctx.logger.warn('workspace-rules load failed: %o', error)
      return decision
    }
    seeded.add(agent)
    if (rules === undefined) return decision
    if (findInjected(agent, rules.digest)) return decision

    // Fold the rules right after the claimed batch, so the direct prompt
    // precedes them (same placement the instruction loader uses).
    const lastClaimedIndex = decision.messages.findLastIndex((message) => messages.includes(message))
    const entered = decision.messages.toSpliced(lastClaimedIndex + 1, 0, rules.message)
    return { kind: 'enter', messages: entered }
  })
}
