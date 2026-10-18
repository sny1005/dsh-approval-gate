/**
 * 无 DSH 运行时依赖的 apply() 集成测试：用桩 ctx 挂载插件，直接调用真实路由处理器。
 * 覆盖：模型目录聚合（去重/单 provider 失败降级）、judgeRoute 原子写入、
 * 半截路由拒绝（routeIncomplete）、legacy 单键 op、effectiveModel 解析。
 */
import { mkdirSync, readFileSync, mkdtempSync, rmSync } from 'node:fs'
import { join } from 'node:path'
import { tmpdir } from 'node:os'
import assert from 'node:assert/strict'

const home = mkdtempSync(join(tmpdir(), 'dsh-approval-gate-test-'))
mkdirSync(join(home, 'auto-approve'), { recursive: true })
process.env.DSH_HOME = home

const routes = []
let approvalHandler = null
const ctx = {
  llm: {
    listProviders: () => [
      { id: 'deepseek-official', name: 'DeepSeek' },
      { id: 'llama-cpp', name: 'llama.cpp' },
      { id: 'broken', name: 'Broken Provider' },
    ],
    listModels: async (provider) => {
      if (provider === 'broken') throw new Error('adapter offline')
      if (provider === 'llama-cpp') return [{ provider, id: 'unsloth/Qwen3.5-4B-GGUF:Q4_K_M', name: 'Qwen 4B' }]
      return [
        { provider, id: 'deepseek-flash', name: 'DeepSeek Flash' },
        { provider, id: 'deepseek-pro', name: 'DeepSeek Pro' },
        { provider, id: 'deepseek-flash', name: 'duplicate' },
      ]
    },
    stream: async function* () {},
  },
  permissionPresets: { current: () => ({ mode: 'auto-approve' }) },
  get: (name) => (name === 'agentDefaultModel'
    ? { currentSelection: () => ({ provider: 'llama-cpp', model: 'unsloth/Qwen3.5-4B-GGUF:Q4_K_M' }) }
    : undefined),
  effect: (fn) => { const dispose = fn(); return () => { if (typeof dispose === 'function') dispose() } },
  on: (name, handler) => { if (name === 'approval/request') approvalHandler = handler; return () => {} },
  timeout: () => new Promise(() => {}),
  webServer: { register: (route) => { routes.push(route); return () => {} } },
  logger: console,
}

try {
  const mod = await import('../src/index.mjs')
  mod.default.apply(ctx)

  const call = async (path, method, body) => {
    const route = routes.find((r) => r.path === path)
    assert.ok(route, `route ${path} registered`)
    const handlers = {}
    const req = {
      method,
      url: path,
      headers: {},
      on(event, cb) { (handlers[event] || (handlers[event] = [])).push(cb); return this },
      destroy() {},
    }
    let status = 0
    let payload = ''
    const res = { writeHead: (code) => { status = code }, end: (text) => { payload = text } }
    const pending = route.handler(req, res)
    if (body !== undefined) {
      setImmediate(() => {
        for (const cb of handlers.data || []) cb(Buffer.from(JSON.stringify(body)))
        for (const cb of handlers.end || []) cb()
      })
    }
    await pending
    return { status, body: payload ? JSON.parse(payload) : null }
  }
  const cfgNow = () => JSON.parse(readFileSync(join(home, 'auto-approve', 'allowlist.json'), 'utf8'))

  const models = await call('/api/auto-approve/models', 'GET')
  assert.equal(models.status, 200)
  assert.deepEqual(models.body.providers.map((p) => p.id), ['deepseek-official', 'llama-cpp', 'broken'])
  assert.deepEqual(models.body.providers[0].models.map((m) => m.id), ['deepseek-flash', 'deepseek-pro'], 'catalog dedupes model ids')
  assert.deepEqual(models.body.providers[2].models, [], 'a failing provider degrades to an empty list')
  assert.equal(models.body.providers[1].models[0].id, 'unsloth/Qwen3.5-4B-GGUF:Q4_K_M')

  const ok = await call('/api/auto-approve/rules', 'POST', { op: 'set', kind: 'judgeRoute', value: { provider: 'deepseek-official', model: 'deepseek-flash' } })
  assert.equal(ok.status, 200)
  assert.equal(cfgNow().judgeProvider, 'deepseek-official')
  assert.equal(cfgNow().judgeModel, 'deepseek-flash')

  const partial = await call('/api/auto-approve/rules', 'POST', { op: 'set', kind: 'judgeRoute', value: { provider: 'deepseek-official', model: '' } })
  assert.equal(partial.status, 400)
  assert.equal(partial.body.code, 'routeIncomplete')
  assert.equal(cfgNow().judgeModel, 'deepseek-flash', 'a rejected partial write leaves the config untouched')

  const cleared = await call('/api/auto-approve/rules', 'POST', { op: 'set', kind: 'judgeRoute', value: { provider: '', model: '' } })
  assert.equal(cleared.status, 200)
  assert.equal(cfgNow().judgeProvider, '')
  assert.equal(cfgNow().judgeModel, '')

  const legacy = await call('/api/auto-approve/rules', 'POST', { op: 'set', kind: 'judgeProvider', value: 'llama-cpp' })
  assert.equal(legacy.status, 200, 'single-key ops stay supported')
  assert.equal(cfgNow().judgeProvider, 'llama-cpp')

  const rules = await call('/api/auto-approve/rules', 'GET')
  assert.equal(rules.body.effectiveModel.provider, 'llama-cpp')
  assert.equal(typeof approvalHandler, 'function')

  console.log('apply() integration: PASS')
} finally {
  rmSync(home, { recursive: true, force: true })
}
