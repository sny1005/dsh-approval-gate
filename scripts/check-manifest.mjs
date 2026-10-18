/**
 * Manifest consistency check for this DSH bundle.
 *
 * Verifies the pieces DSH's loader, profile installer and client-module scan
 * rely on, so a rename cannot silently detach the browser half:
 *   - package.json identity/version/engines (dsh >= 0.2, node >= 22.19)
 *   - dsh.manifestVersion + dsh.bundle.patch pointing at an existing file
 *   - cordis.patch.yml insert row `name` === package name
 *   - client bundle loader id === package name (served as /plugins/<name>/client.js)
 *   - dsh.client.platform === 'web' and the locale service injected when used
 *   - locale/*.json entries carry localized plugin metadata
 *
 * Usage: node scripts/check-manifest.mjs
 */
import { existsSync, readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')
const read = (file) => readFileSync(join(root, file), 'utf8')
const errors = []
const check = (condition, message) => {
  if (!condition) errors.push(message)
}

const pkg = JSON.parse(read('package.json'))
const dsh = pkg.dsh || {}

check(typeof pkg.name === 'string' && /^[a-z0-9][a-z0-9._-]*$/.test(pkg.name), 'package.json: name must be a lowercase package id')
check(/^\d+\.\d+\.\d+(?:-[0-9A-Za-z.-]+)?$/.test(String(pkg.version)), 'package.json: version must be SemVer')
check(pkg.type === 'module', 'package.json: "type" must be "module"')
check(typeof pkg.main === 'string' && existsSync(join(root, pkg.main)), 'package.json: main entry is missing on disk')
check(pkg.license, 'package.json: license is missing')
check(pkg.repository && pkg.repository.url, 'package.json: repository.url is missing')

check(pkg.engines && typeof pkg.engines.dsh === 'string' && pkg.engines.dsh.length > 0, 'package.json: engines.dsh SemVer range is missing')
check(pkg.engines && /^>=?\s*\d+/.test(String(pkg.engines.node || '')), 'package.json: engines.node is missing')
check(dsh.manifestVersion === 1, 'package.json: dsh.manifestVersion must be 1')

const patchFile = dsh.bundle && dsh.bundle.patch
check(typeof patchFile === 'string', 'package.json: dsh.bundle.patch is missing')
if (typeof patchFile === 'string') {
  check(existsSync(join(root, patchFile)), `package.json: dsh.bundle.patch points at a missing file (${patchFile})`)
  const patch = read(patchFile)
  const rows = [...patch.matchAll(/-\s*insert:\s*\r?\n\s*-\s*id:\s*([^\s#]+)\s*\r?\n\s*name:\s*['"]?([^'"\s#]+)['"]?/g)]
  check(rows.length > 0, `${patchFile}: no "- insert:" row with id+name found`)
  const names = rows.map((row) => row[2])
  check(names.includes(pkg.name), `${patchFile}: insert row name must equal package name "${pkg.name}" (found: ${names.join(', ') || 'none'})`)
}

check(pkg.exports && pkg.exports['./client'] === './client.js', 'package.json: exports["./client"] must point at ./client.js')
check(existsSync(join(root, 'client.js')), 'client.js is missing')

const client = read('client.js')
const loaderId = /__ModuleLoader__\.load\(\{\s*[\s\S]{0,160}?id:\s*['"]([^'"]+)['"]/.exec(client)
check(loaderId !== null && loaderId[1] === pkg.name, `client.js: __ModuleLoader__.load id must equal package name "${pkg.name}" (found: ${loaderId ? loaderId[1] : 'none'})`)
check(!/dsh-approval-gate(?!-plus)/.test(client), 'client.js: a stale "dsh-approval-gate" identity remains')
check(!/dsh-approval-gate(?!-plus)/.test(patchFile ? read(patchFile) : ''), `${patchFile || 'cordis.patch.yml'}: a stale "dsh-approval-gate" identity remains`)

const clientManifest = dsh.client || {}
check(clientManifest.platform === 'web', 'package.json: dsh.client.platform must be "web"')
if (client.includes('ctx.locale.register')) {
  const inject = Array.isArray(clientManifest.inject) ? clientManifest.inject : []
  check(inject.includes('@deepseek-ai/dsh-client-locale'), 'package.json: dsh.client.inject must declare @deepseek-ai/dsh-client-locale')
}

const files = Array.isArray(pkg.files) ? pkg.files : []
for (const entry of ['src', 'client.js', 'cordis.patch.yml', 'locale/*.json']) {
  check(files.includes(entry), `package.json: files must include "${entry}"`)
}

for (const lang of ['zh', 'en']) {
  const file = `locale/${lang}.json`
  check(existsSync(join(root, file)), `${file} is missing`)
  if (!existsSync(join(root, file))) continue
  try {
    const data = JSON.parse(read(file))
    check(data.meta && typeof data.meta.title === 'string' && data.meta.title.length > 0, `${file}: meta.title is missing`)
    check(data.meta && typeof data.meta.description === 'string' && data.meta.description.length > 0, `${file}: meta.description is missing`)
  } catch (error) {
    errors.push(`${file}: invalid JSON (${error.message})`)
  }
}

if (errors.length > 0) {
  console.error(`Manifest check failed (${errors.length}):`)
  for (const message of errors) console.error(`  - ${message}`)
  process.exit(1)
}

console.log(`Manifest OK: ${pkg.name}@${pkg.version} (dsh ${pkg.engines.dsh}, node ${pkg.engines.node})`)
