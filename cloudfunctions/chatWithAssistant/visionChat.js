/**
 * 精灵小管家 - 带图片的多模态对话（TokenHub / 混元 HTTP 视觉）
 */
const cloud = require('wx-server-sdk')
const { buildSystemPrompt } = require('./config.js')
const { resolveVisionHttpTargets } = require('./hunyuanHttp.js')

const DEFAULT_IMAGE_PROMPT = '请看看这张照片，从穿搭角度帮我分析：识别单品、风格、颜色，并给出具体搭配建议。'

function extractContent(res) {
  if (!res) return ''
  const choice = res.choices && res.choices[0]
  const msg = choice && choice.message
  if (msg && typeof msg.content === 'string') return msg.content
  if (msg && Array.isArray(msg.content)) {
    return msg.content.map((part) => part.text || part.content || '').join('')
  }
  if (typeof res.text === 'string') return res.text
  return ''
}

function buildVisionMessages(systemPrompt, messages) {
  const out = [{ role: 'system', content: systemPrompt }]
  for (const m of messages) {
    if (m.role === 'assistant') {
      out.push({ role: 'assistant', content: m.content || '' })
      continue
    }
    if (m.role !== 'user') continue
    if (m.imageUrl) {
      const text = (m.content && String(m.content).trim()) || DEFAULT_IMAGE_PROMPT
      out.push({
        role: 'user',
        content: [
          { type: 'image_url', image_url: { url: m.imageUrl } },
          { type: 'text', text }
        ]
      })
    } else if (m.content) {
      out.push({ role: 'user', content: m.content })
    }
  }
  return out
}

async function resolveMessageImages(messages) {
  const list = Array.isArray(messages) ? messages.slice() : []
  const fileIDs = [...new Set(
    list.filter((m) => m && m.imageFileID && !m.imageUrl).map((m) => m.imageFileID)
  )]
  if (!fileIDs.length) return list

  const tempRes = await cloud.getTempFileURL({ fileList: fileIDs })
  const urlMap = {}
  ;(tempRes.fileList || []).forEach((item) => {
    if (item && item.status === 0 && item.tempFileURL) {
      urlMap[item.fileID] = item.tempFileURL
    }
  })
  return list.map((m) => ({
    ...m,
    imageUrl: m.imageUrl || urlMap[m.imageFileID] || ''
  }))
}

function messageHasVision(messages) {
  return Array.isArray(messages) && messages.some((m) => m && m.role === 'user' && (m.imageUrl || m.imageFileID))
}

function requestVisionOnce(apiUrl, API_KEY, modelName, chatMessages) {
  const body = JSON.stringify({
    model: modelName,
    messages: chatMessages,
    max_tokens: 500,
    temperature: 0.7
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
      timeout: 55000
    }, (res) => {
      let data = ''
      res.setEncoding('utf8')
      res.on('data', (chunk) => { data += chunk })
      res.on('end', () => {
        try {
          const json = JSON.parse(data)
          if (res.statusCode === 401 || res.statusCode === 403) {
            reject(new Error(json.error?.message || json.message || '视觉对话鉴权失败'))
            return
          }
          if (res.statusCode === 429) {
            reject(new Error(json.error?.message || '视觉对话请求过于频繁(429)'))
            return
          }
          const text = extractContent(json)
          if (text && String(text).trim()) {
            resolve(String(text).trim())
            return
          }
          reject(new Error(json.error?.message || json.message || '视觉对话返回为空'))
        } catch (e) {
          reject(e)
        }
      })
    })
    req.on('error', reject)
    req.on('timeout', () => {
      req.destroy()
      reject(new Error('视觉对话请求超时'))
    })
    req.write(body)
    req.end()
  })
}

async function callVisionHTTP(systemPrompt, messages) {
  const API_KEY = process.env.HUNYUAN_API_KEY
  if (!API_KEY) {
    throw new Error('发送图片对话需配置 HUNYUAN_API_KEY（TokenHub）')
  }

  const chatMessages = buildVisionMessages(systemPrompt, messages)
  const targets = resolveVisionHttpTargets(API_KEY)
  const attempts = []
  for (const target of targets) {
    const models = target.models && target.models.length ? target.models : ['hy-vision-2.0-instruct']
    for (const modelName of models) {
      attempts.push({ apiUrl: target.url, modelName })
    }
  }

  let lastErr = null
  for (const attempt of attempts) {
    try {
      return await requestVisionOnce(attempt.apiUrl, API_KEY, attempt.modelName, chatMessages)
    } catch (err) {
      lastErr = err
      console.warn(`vision chat failed (${attempt.modelName}):`, err.message)
    }
  }
  throw lastErr || new Error('图片对话不可用')
}

async function callVisionChat(messages, userContext) {
  const resolved = await resolveMessageImages(messages)
  const systemPrompt = buildSystemPrompt(userContext) + '\n\n【图片对话】用户可能发送穿搭/OOTD/单品照片。请结合图片内容识别风格、单品与配色，并联系用户资料给出穿搭建议；若图片与穿搭无关，礼貌说明并引导回穿搭话题。'
  return callVisionHTTP(systemPrompt, resolved)
}

module.exports = {
  callVisionChat,
  resolveMessageImages,
  messageHasVision
}
