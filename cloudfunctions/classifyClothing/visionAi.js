/**
 * 混元视觉调用 - 多通道 / 多模型回退（cloud.ai / CloudBase / extend / HTTP）
 * 注：新版基础库仅内置 cloudbase、hunyuan-v3 等 provider，hunyuan-vision 可能不在 definitions 中
 */
const cloud = require('wx-server-sdk')
const { resolveVisionHttpTargets, isTokenHubKey } = require('./hunyuanHttp.js')

const LEGACY_VISION_SPECS = [
  'hunyuan-vision-1.5-thinking',
  'hunyuan-vision',
  { provider: 'hunyuan', model: 'hunyuan-vision-1.5-thinking', network: 'public' },
  { provider: 'hunyuan', model: 'hunyuan-vision', network: 'public' }
]

const CLOUDBASE_VISION_MODELS = [
  process.env.HUNYUAN_VISION_MODEL,
  'hunyuan-t1-vision-20250916',
  'hunyuan-vision-1.5-thinking',
  'hunyuan-vision'
].filter(Boolean)

function isRateLimitError(err) {
  const msg = (err && err.message) || String(err || '')
  return /429|rate limit|too many|频率|限流/i.test(msg)
}

function isAuthError(err) {
  const msg = (err && err.message) || String(err || '')
  return /incorrect api key|invalid.*api.*key|401|unauthorized|api key.*invalid/i.test(msg)
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

async function runWithRateLimitRetry(fn, label) {
  try {
    return await fn()
  } catch (err) {
    if (!isRateLimitError(err)) throw err
    console.warn(`${label} rate limited, retry after 2s`)
    await sleep(2000)
    return await fn()
  }
}

function summarizeVisionErrors(errors) {
  const joined = (errors || []).join(' | ')
  if (!joined) return 'AI 识别不可用'
  if (isAuthError({ message: joined })) {
    if (isTokenHubKey() && /incorrect api key/i.test(joined)) {
      return 'TokenHub API Key 需配合 tokenhub.tencentmaas.com，请重新部署 classifyClothing'
    }
    return '混元 API Key 无效或接口域名不匹配，请检查 Key 来源与 HUNYUAN_API_URL'
  }
  if (isRateLimitError({ message: joined })) {
    return 'AI 调用过于频繁(429)，请稍后再试或手动选择分类'
  }
  if (/云开发 AI 扩展不可用|视觉模型均不可用|cloud\.ai 不可用|not found in definitions/i.test(joined)) {
    return '云开发视觉能力未开通，请配置有效混元 API Key 或在控制台开通多模态'
  }
  return joined
}

function parseJsonFromText(text) {
  if (!text || typeof text !== 'string') return null
  let s = String(text).trim()
  const codeBlock = s.match(/```(?:json)?\s*([\s\S]*?)```/i)
  if (codeBlock) s = codeBlock[1].trim()
  const m = s.match(/\{[\s\S]*\}/)
  if (!m) return null
  try {
    return JSON.parse(m[0])
  } catch (e) {
    try {
      return JSON.parse(m[0].replace(/,\s*([}\]])/g, '$1'))
    } catch (e2) {}
  }
  return null
}

function extractVisionContent(res) {
  if (!res) return ''
  const choice = res.choices && res.choices[0]
  const msg = choice && choice.message
  if (msg && typeof msg.content === 'string') return msg.content
  if (msg && Array.isArray(msg.content)) {
    return msg.content.map((part) => part.text || part.content || '').join('')
  }
  if (typeof res.text === 'string') return res.text
  if (typeof res.content === 'string') return res.content
  return ''
}

function createModelFromAI(ai, spec) {
  if (typeof spec === 'string') return ai.createModel(spec)
  return ai.createModel(spec)
}

async function generateVisionTextLegacy(model, prompt, imageUrl) {
  return model.generateText({
    messages: [{
      role: 'user',
      content: prompt,
      images: [imageUrl]
    }],
    temperature: 0.1
  })
}

async function generateVisionTextCloudbase(model, modelName, prompt, imageUrl) {
  return model.generateText({
    model: modelName,
    messages: [{
      role: 'user',
      content: [
        { type: 'text', text: prompt },
        { type: 'image_url', image_url: { url: imageUrl } }
      ]
    }],
    temperature: 0.1
  })
}

async function tryVisionModels(ai, label, prompt, imageUrl) {
  let lastErr = null

  for (const spec of LEGACY_VISION_SPECS) {
    const name = typeof spec === 'string' ? spec : spec.model
    try {
      const model = createModelFromAI(ai, spec)
      const res = await generateVisionTextLegacy(model, prompt, imageUrl)
      const text = extractVisionContent(res)
      const parsed = parseJsonFromText(text)
      if (parsed) return { parsed, rawText: text, model: `${label}:${name}` }
      lastErr = new Error('AI 返回无法解析为 JSON')
    } catch (err) {
      lastErr = err
      console.warn(`${label} legacy vision failed (${name}):`, err.message)
    }
  }

  try {
    const cloudbase = ai.createModel('cloudbase')
    for (const modelName of CLOUDBASE_VISION_MODELS) {
      try {
        const res = await generateVisionTextCloudbase(cloudbase, modelName, prompt, imageUrl)
        const text = extractVisionContent(res)
        const parsed = parseJsonFromText(text)
        if (parsed) return { parsed, rawText: text, model: `${label}:cloudbase:${modelName}` }
        lastErr = new Error('AI 返回无法解析为 JSON')
      } catch (err) {
        lastErr = err
        console.warn(`${label} cloudbase vision failed (${modelName}):`, err.message)
      }
    }
  } catch (err) {
    lastErr = err
    console.warn(`${label} cloudbase provider unavailable:`, err.message)
  }

  throw lastErr || new Error(`${label} 视觉模型均不可用`)
}

async function callViaCloudAi(prompt, imageUrl) {
  if (typeof cloud.ai !== 'function') {
    throw new Error('cloud.ai 不可用，请升级 wx-server-sdk >= 3.0.5 并重新部署')
  }
  return tryVisionModels(cloud.ai(), 'cloud.ai', prompt, imageUrl)
}

async function callViaExtendAi(prompt, imageUrl) {
  if (!cloud.extend || !cloud.extend.AI) {
    throw new Error('云开发 AI 扩展不可用')
  }
  return tryVisionModels(cloud.extend.AI, 'extend', prompt, imageUrl)
}

async function callViaCloudbase(prompt, imageUrl) {
  const tcb = require('@cloudbase/node-sdk')
  const envId = process.env.TCB_ENV || process.env.ENV_ID || cloud.DYNAMIC_CURRENT_ENV
  const app = tcb.init(envId ? { env: envId, timeout: 60000 } : { timeout: 60000 })
  const ai = app.ai()
  return tryVisionModels(ai, 'cloudbase', prompt, imageUrl)
}

function callViaHTTP(prompt, imageUrl) {
  const API_KEY = process.env.HUNYUAN_API_KEY
  if (!API_KEY) {
    return Promise.reject(new Error('未配置 HUNYUAN_API_KEY'))
  }

  const targets = resolveVisionHttpTargets(API_KEY)
  const attempts = []
  for (const target of targets) {
    const models = target.models && target.models.length ? target.models : ['hunyuan-vision']
    for (const modelName of models) {
      attempts.push({ apiUrl: target.url, modelName })
    }
  }

  function requestOnce(apiUrl, modelName) {
    const body = JSON.stringify({
      model: modelName,
      messages: [{
        role: 'user',
        content: [
          { type: 'text', text: prompt },
          { type: 'image_url', image_url: { url: imageUrl } }
        ]
      }],
      temperature: 0.1
    })

    return new Promise((resolve, reject) => {
      const https = require('https')
      const url = new URL(apiUrl)
      const req = https.request({
        hostname: url.hostname,
        path: url.pathname,
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: 'Bearer ' + API_KEY,
          'Content-Length': Buffer.byteLength(body)
        },
        timeout: 28000
      }, (res) => {
        let data = ''
        res.setEncoding('utf8')
        res.on('data', (chunk) => { data += chunk })
        res.on('end', () => {
          try {
            const json = JSON.parse(data)
            if (res.statusCode === 401 || res.statusCode === 403) {
              reject(new Error(json.error?.message || json.message || 'HTTP 视觉鉴权失败'))
              return
            }
            if (res.statusCode === 429) {
              reject(new Error(json.error?.message || json.message || 'HTTP 视觉请求过于频繁(429)'))
              return
            }
            const text = extractVisionContent(json)
            const parsed = parseJsonFromText(text)
            if (parsed) {
              resolve({ parsed, rawText: text, model: `http:${url.hostname}:${modelName}` })
              return
            }
            reject(new Error(json.error?.message || json.message || 'HTTP 视觉返回无法解析'))
          } catch (e) {
            reject(e)
          }
        })
      })
      req.on('error', reject)
      req.on('timeout', () => {
        req.destroy()
        reject(new Error('HTTP 视觉请求超时'))
      })
      req.write(body)
      req.end()
    })
  }

  return attempts.reduce((chain, attempt) => {
    return chain.catch((err) => {
      console.warn(`HTTP vision failed (${attempt.apiUrl} / ${attempt.modelName}):`, err.message)
      return requestOnce(attempt.apiUrl, attempt.modelName)
    })
  }, Promise.reject(new Error('start')))
}

function buildVisionRunners(prompt, imageUrl) {
  const httpRunner = () => callViaHTTP(prompt, imageUrl)
  const cloudRunners = [
    () => runWithRateLimitRetry(() => callViaCloudAi(prompt, imageUrl), 'cloud.ai'),
    () => runWithRateLimitRetry(() => callViaCloudbase(prompt, imageUrl), 'cloudbase'),
    () => runWithRateLimitRetry(() => callViaExtendAi(prompt, imageUrl), 'extend')
  ]
  // TokenHub sk- Key 仅走 HTTP（专用域名），避免云通道 429 重试拖垮总耗时
  if (process.env.HUNYUAN_API_KEY && isTokenHubKey()) {
    return [httpRunner]
  }
  return [...cloudRunners, httpRunner]
}

async function callVisionAI(imageUrl, prompt) {
  const errors = []
  const runners = buildVisionRunners(prompt, imageUrl)

  for (const run of runners) {
    try {
      return await run()
    } catch (err) {
      const message = err.message || String(err)
      // Key 无效时跳过 HTTP 后续模型尝试，避免重复报错
      if (isAuthError(err) && /HTTP|HUNYUAN_API_KEY|api key/i.test(message)) {
        errors.push('混元 API Key 无效')
        break
      }
      errors.push(message)
    }
  }

  throw new Error(summarizeVisionErrors(errors))
}

module.exports = {
  callVisionAI,
  parseJsonFromText,
  summarizeVisionErrors
}
