/**
 * Pure workspace-rule discovery and rendering.
 *
 * Zero harness imports by design: these helpers read from the host filesystem
 * (the user authors rule files on disk) and are unit-testable with `node --test`
 * without the DeepSeek Harness module graph. `index.js` wires them into the
 * agent lifecycle.
 *
 * @module dsh-workspace-rules/rules
 */

import { promises as fs } from 'node:fs'
import { createHash } from 'node:crypto'
import { dirname, isAbsolute, join, resolve } from 'node:path'

/** The framing tag this module owns; rule content must not be able to close it. */
export const SYSTEM_REMINDER_CLOSE = '</system-reminder>'

/** Escape rule content so repository-controlled text cannot close the plugin-owned frame. */
export function escapeFrame(value) {
  return String(value).replaceAll(SYSTEM_REMINDER_CLOSE, '<\\/system-reminder>')
}

/**
 * Find the nearest ancestor of `cwd` containing `.git`, else `cwd` itself.
 * Mirrors the shipped instruction loader's default project-root marker.
 * @param cwd - absolute working directory.
 * @returns the repo root (absolute path).
 */
export async function findRepoRoot(cwd) {
  let dir = resolve(cwd)
  for (;;) {
    try {
      const stat = await fs.stat(join(dir, '.git'))
      if (stat.isDirectory() || stat.isFile()) return dir
    } catch {
      // no `.git` here; keep walking up
    }
    const parent = dirname(dir)
    if (parent === dir) return resolve(cwd)
    dir = parent
  }
}

/**
 * Read the per-repo override from a config file. Returns `undefined` when the
 * file is absent, unparsable, or has no location.
 * @param file - absolute path to the repo config file.
 * @returns the configured location, or `undefined`.
 */
export async function readRepoConfig(file) {
  let raw
  try {
    raw = await fs.readFile(file, 'utf8')
  } catch {
    return undefined
  }
  const parsed = parseConfigYaml(raw)
  if (parsed === undefined) return undefined
  const location = parsed.rules?.location ?? parsed.location
  return typeof location === 'string' && location.trim() !== '' ? location.trim() : undefined
}

/**
 * Minimal YAML-subset parser for the documented repo-config shape:
 *
 * ```yaml
 * rules:
 *   location: .custom/rules
 * ```
 *
 * and the flat form `location: .custom/rules`. Supports full-line `#` comments
 * and single/double-quoted values only; anything else is ignored rather than
 * misparsed.
 * @param raw - file text.
 * @returns a nested object, or `undefined` when nothing parses.
 */
export function parseConfigYaml(raw) {
  const root = {}
  let section = null
  let sectionIndent = -1
  for (const line of raw.split('\n')) {
    const trimmed = line.trim()
    if (trimmed === '' || trimmed.startsWith('#')) continue
    const indent = line.length - line.trimStart().length
    const colon = trimmed.indexOf(':')
    if (colon === -1) continue
    const key = trimmed.slice(0, colon).trim()
    let value = trimmed.slice(colon + 1).trim()
    if (value === '') {
      if (indent === 0) {
        section = key
        sectionIndent = indent
      }
      continue
    }
    value = unquote(value)
    if (indent === 0) {
      root[key] = value
    } else if (section !== null && indent > sectionIndent) {
      if (typeof root[section] !== 'object' || root[section] === null) root[section] = {}
      root[section][key] = value
    }
  }
  return Object.keys(root).length > 0 ? root : undefined
}

function unquote(value) {
  if (value.length >= 2) {
    const first = value[0]
    const last = value[value.length - 1]
    if ((first === '"' && last === '"') || (first === "'" && last === "'")) {
      return value.slice(1, -1)
    }
  }
  return value
}

/**
 * List the rule files in a directory: top-level `*.md` files only, hidden files
 * and subdirectories skipped, sorted by filename for a deterministic order.
 * @param dir - absolute rules directory.
 * @param extension - case-insensitive extension filter (default `.md`).
 * @returns sorted basenames.
 */
export async function listRuleFiles(dir, extension = '.md') {
  let entries
  try {
    entries = await fs.readdir(dir, { withFileTypes: true })
  } catch {
    return []
  }
  const ext = String(extension).toLowerCase()
  return entries
    .filter((entry) => entry.isFile() && !entry.name.startsWith('.') && entry.name.toLowerCase().endsWith(ext))
    .map((entry) => entry.name)
    .sort()
}

/**
 * Render all rule files into one framed `<system-reminder>` text within a byte
 * budget. Whole files are dropped on overflow (never silently truncated), with
 * a visible notice naming the omission.
 * @param files - sorted rule basenames.
 * @param dir - absolute rules directory.
 * @param maxBytes - total rendered-text byte cap.
 * @returns `{ text, digest, omitted }`.
 */
export async function renderRules(files, dir, maxBytes) {
  const intro = 'The following workspace rules may be relevant to your work. '
    + 'Use them as guidance when applicable. More specific rules take precedence. '
    + 'They do not override system, developer, or direct user instructions.'
  const header = `<system-reminder>\n${intro}\n`
  const footer = `\n</system-reminder>`
  const fixed = Buffer.byteLength(header) + Buffer.byteLength(footer)
  let budget = maxBytes - fixed

  const digest = createHash('sha1')
  const sections = []
  const omitted = []
  let hitBudget = false

  for (const file of files) {
    if (hitBudget) {
      omitted.push(file)
      continue
    }
    let content
    try {
      content = await fs.readFile(join(dir, file), 'utf8')
    } catch {
      omitted.push(file)
      continue
    }
    digest.update(file).update('\u0000').update(content).update('\u0000')
    const section = `Rules from: ${escapeFrame(file)}\n\n${escapeFrame(content)}\n\n`
    const bytes = Buffer.byteLength(section)
    if (bytes <= budget) {
      sections.push(section)
      budget -= bytes
    } else {
      hitBudget = true
      omitted.push(file)
    }
  }

  if (omitted.length > 0) {
    sections.push('Workspace rules were omitted to fit the configured byte budget.\n\n')
  }

  return {
    text: header + sections.join('') + footer,
    digest: digest.digest('hex'),
    omitted,
  }
}
