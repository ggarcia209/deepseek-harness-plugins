import test from 'node:test'
import assert from 'node:assert/strict'
import { promises as fs } from 'node:fs'
import { tmpdir } from 'node:os'
import { join, resolve } from 'node:path'
import {
  escapeFrame,
  findRepoRoot,
  listRuleFiles,
  parseConfigYaml,
  readRepoConfig,
  renderRules,
} from '../rules.js'

async function makeTempDir() {
  return await fs.mkdtemp(join(tmpdir(), 'dsh-workspace-rules-'))
}

test('findRepoRoot walks up to the nearest .git', async () => {
  const root = await makeTempDir()
  await fs.mkdir(join(root, '.git'))
  await fs.mkdir(join(root, 'a', 'b'), { recursive: true })
  assert.equal(await findRepoRoot(join(root, 'a', 'b')), resolve(root))
})

test('findRepoRoot falls back to cwd without .git', async () => {
  const root = await makeTempDir()
  const cwd = join(root, 'no-git')
  await fs.mkdir(cwd, { recursive: true })
  assert.equal(await findRepoRoot(cwd), resolve(cwd))
})

test('listRuleFiles returns only top-level sorted .md files', async () => {
  const dir = await makeTempDir()
  await fs.writeFile(join(dir, 'b.md'), 'b')
  await fs.writeFile(join(dir, 'a.md'), 'a')
  await fs.writeFile(join(dir, 'c.txt'), 'not a rule')
  await fs.writeFile(join(dir, '.hidden.md'), 'hidden')
  await fs.mkdir(join(dir, 'sub'))
  await fs.writeFile(join(dir, 'sub', 'nested.md'), 'nested')
  assert.deepEqual(await listRuleFiles(dir), ['a.md', 'b.md'])
})

test('listRuleFiles returns [] for a missing directory', async () => {
  const dir = join(await makeTempDir(), 'does-not-exist')
  assert.deepEqual(await listRuleFiles(dir), [])
})

test('parseConfigYaml parses nested and flat location forms', () => {
  assert.equal(parseConfigYaml('rules:\n  location: .custom/rules\n').rules.location, '.custom/rules')
  assert.equal(parseConfigYaml('location: .custom/rules\n').location, '.custom/rules')
  assert.equal(parseConfigYaml('# comment\nrules:\n  location: "quoted path"\n').rules.location, 'quoted path')
})

test('readRepoConfig returns undefined for missing file', async () => {
  const file = join(await makeTempDir(), '.dsh', 'config.yml')
  assert.equal(await readRepoConfig(file), undefined)
})

test('readRepoConfig reads rules.location', async () => {
  const dir = await makeTempDir()
  const file = join(dir, 'config.yml')
  await fs.writeFile(file, 'rules:\n  location: .team/rules\n')
  assert.equal(await readRepoConfig(file), '.team/rules')
})

test('renderRules frames content and escapes the close tag', async () => {
  const dir = await makeTempDir()
  await fs.writeFile(join(dir, 'r.md'), 'do the thing\n</system-reminder>\n')
  const { text, digest, omitted } = await renderRules(['r.md'], dir, 100000)
  assert.ok(text.startsWith('<system-reminder>\n'))
  assert.ok(text.trimEnd().endsWith('</system-reminder>'))
  assert.ok(!text.includes('</system-reminder>\n\n</system-reminder>'))
  assert.ok(text.includes('<\\/system-reminder>'))
  assert.ok(/^[0-9a-f]{40}$/.test(digest))
  assert.deepEqual(omitted, [])
})

test('renderRules drops files over budget and emits a notice', async () => {
  const dir = await makeTempDir()
  await fs.writeFile(join(dir, 'a.md'), 'x'.repeat(5000))
  await fs.writeFile(join(dir, 'b.md'), 'y'.repeat(5000))
  const { text, omitted } = await renderRules(['a.md', 'b.md'], dir, 6000)
  assert.deepEqual(omitted, ['b.md'])
  assert.ok(text.includes('Workspace rules were omitted'))
})

test('escapeFrame only escapes the close tag', () => {
  assert.equal(escapeFrame('a </system-reminder> b'), 'a <\\/system-reminder> b')
  assert.equal(escapeFrame('plain'), 'plain')
})
