/**
 * 精灵小管家 AI 对话云函数
 * 优先使用 cloud.extend.AI（成长计划免费额度），失败时回退到 HTTP API
 */
const cloud = require('wx-server-sdk')
const { buildSystemPrompt } = require('./config.js')
const { resolveHttpChatUrl, isTokenHubKey } = require('./hunyuanHttp.js')
const { callVisionChat, resolveMessageImages, messageHasVision } = require('./visionChat.js')

cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV })

/** 从用户消息中解析偏好（简单关键词匹配） */
function parseUserPreferences(userMsg) {
  if (!userMsg) return null
  const text = typeof userMsg === 'string' ? userMsg.trim() : ''
  if (!text || text === '[图片]') return null
  const avoid = []
  const prefer = []
  const avoidPatterns = [
    /不(?:喜欢|爱|想)穿?\s*([^，。！？、]+)/gi,
    /讨厌\s*([^，。！？、]+)/gi,
    /别推荐\s*([^，。！？、]+)/gi,
    /不要\s*([^，。！？、]+)/gi,
    /避免\s*([^，。！？、]+)/gi,
    /(?:裙子|高跟鞋|紧身裤|短裙|连衣裙)/g
  ]
  const preferPatterns = [
    /(?:喜欢|爱|想要)\s*([^，。！？、]+)/gi,
    /偏好\s*([^，。！？、]+)/gi,
    /(?:宽松款|运动鞋|卫衣|休闲风)/g
  ]
  avoidPatterns.forEach(p => {
    let m
    while ((m = p.exec(text)) !== null) {
      const s = (m[1] || m[0] || '').trim()
      if (s && s.length <= 10) avoid.push(s)
    }
  })
  preferPatterns.forEach(p => {
    let m
    while ((m = p.exec(text)) !== null) {
      const s = (m[1] || m[0] || '').trim()
      if (s && s.length <= 10) prefer.push(s)
    }
  })
  if (avoid.length === 0 && prefer.length === 0) return null
  return { avoid: [...new Set(avoid)], prefer: [...new Set(prefer)] }
}

function resolveHttpModel() {
  if (process.env.HUNYUAN_MODEL) return process.env.HUNYUAN_MODEL
  return isTokenHubKey() ? 'hy3-preview' : 'hunyuan-2.0-instruct-20251111'
}

const HUNYUAN_MODEL = resolveHttpModel()

/** 尝试 cloud.extend.AI（显式指定 provider/model/network） */
async function callCloudAI(messages, userContext) {
  const systemPrompt = buildSystemPrompt(userContext)
  const chatMessages = [
    { role: 'system', content: systemPrompt },
    ...messages.map(m => ({ role: m.role, content: m.content }))
  ]

  if (cloud.extend && cloud.extend.AI) {
    const ai = cloud.extend.AI
    let model
    try {
      model = ai.createModel({ provider: 'hunyuan', model: HUNYUAN_MODEL, network: 'public' })
    } catch (_) {
      model = ai.createModel('hunyuan')
    }
    const res = await model.generateText({
      messages: chatMessages,
      temperature: 0.7,
      max_tokens: 500
    })
    const text = res?.choices?.[0]?.message?.content || res?.text
    return (text && String(text).trim()) || ''
  }

  const tcb = require('@cloudbase/node-sdk')
  const envId = process.env.TCB_ENV || process.env.ENV_ID
  const app = tcb.init(envId ? { env: envId, timeout: 60000 } : { timeout: 60000 })
  const ai = app.ai()
  const model = ai.createModel('hunyuan-exp')
  const res = await model.generateText({
    model: HUNYUAN_MODEL,
    messages: chatMessages,
    max_tokens: 500,
    temperature: 0.7
  })
  return (res && res.text && String(res.text).trim()) || ''
}

/** HTTP 调用混元 API（需配置 HUNYUAN_API_KEY） */
function callHunyuanHTTP(messages, userContext) {
  const API_KEY = process.env.HUNYUAN_API_KEY
  if (!API_KEY) {
    throw new Error('未配置 HUNYUAN_API_KEY，请在云开发控制台配置环境变量')
  }
  const systemPrompt = buildSystemPrompt(userContext)
  const body = JSON.stringify({
    model: HUNYUAN_MODEL,
    messages: [
      { role: 'system', content: systemPrompt },
      ...messages.map(m => ({ role: m.role, content: m.content }))
    ],
    max_tokens: 500,
    temperature: 0.7
  })
  return new Promise((resolve, reject) => {
    const https = require('https')
    const apiUrl = resolveHttpChatUrl(API_KEY)
    const url = new URL(apiUrl)
    const req = https.request({
      hostname: url.hostname,
      path: url.pathname,
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer ' + API_KEY,
        'Content-Length': Buffer.byteLength(body)
      }
    }, res => {
      let data = ''
      res.setEncoding('utf8')
      res.on('data', chunk => { data += chunk })
      res.on('end', () => {
        try {
          const json = JSON.parse(data)
          const choice = json.choices && json.choices[0]
          const content = choice && choice.message && choice.message.content
          if (content) {
            resolve(content.trim())
          } else {
            reject(new Error(json.error?.message || json.message || 'AI 返回异常'))
          }
        } catch (e) {
          reject(e)
        }
      })
    })
    req.on('error', reject)
    req.write(body)
    req.end()
  })
}

exports.main = async (event, context) => {
  let messages = event.messages
  const userContext = event.context || {}
  if (event.userMessage) {
    messages = [{ role: 'user', content: event.userMessage }]
  }
  if (event.gender) userContext.gender = event.gender
  if (event.roleType) userContext.roleType = event.roleType
  if (event.age != null) userContext.age = event.age
  if (event.stylePreference) userContext.stylePreference = event.stylePreference
  if (event.weatherData) userContext.weatherData = event.weatherData
  if (event.userClothes) userContext.userClothes = event.userClothes
  if (event.context && event.context.forecast) userContext.forecast = event.context.forecast
  if (event.context && event.context.outfitPreferences) userContext.outfitPreferences = event.context.outfitPreferences
  if (event.context && event.context.learningLibrary) userContext.learningLibrary = event.context.learningLibrary
  if (event.context && event.context.profile) userContext.profile = event.context.profile
  if (event.context && event.context.userDataSummary) userContext.userDataSummary = event.context.userDataSummary
  if (event.context && event.context.userDataLibrary) userContext.userDataLibrary = event.context.userDataLibrary
  if (event.context && event.context.isGuestMode === true) userContext.isGuestMode = true
  if (!messages || !Array.isArray(messages) || messages.length === 0) {
    return { errMsg: '缺少 messages 参数', data: { reply: '精灵小管家走神了，稍等一下哦～ 😅' } }
  }

  try {
    messages = await resolveMessageImages(messages)
  } catch (err) {
    console.warn('resolveMessageImages failed:', err.message)
  }

  const hasVision = messageHasVision(messages)

  let reply = ''
  try {
    console.log('开始调用混元模型，消息数：', messages.length, '含图片：', hasVision)
    const startTime = Date.now()
    if (hasVision) {
      reply = await callVisionChat(messages, userContext)
    } else {
      reply = await callCloudAI(messages, userContext)
    }
    console.log(`模型调用成功，耗时：${Date.now() - startTime}ms`)
  } catch (e) {
    console.error('完整错误：', e)
    const msg = String(e.message || e).toLowerCase()
    const isTimeout = msg.includes('timeout')
    const is403 = msg.includes('403') || msg.includes('forbidden') || msg.includes('permission')
    const isAuth = msg.includes('401') || msg.includes('unauthorized') || msg.includes('api key')

    let userMsg = '精灵小管家走神了，稍等一下哦～ 😅'
    if (hasVision && !process.env.HUNYUAN_API_KEY) {
      return { errMsg: '', data: { reply: '图片对话需配置混元 API Key，暂时只能文字聊天哦～' } }
    }
    if (is403 || isAuth) {
      userMsg = '权限配置中，稍等1分钟再试～ ⏳'
      if (process.env.HUNYUAN_API_KEY && !hasVision) {
        try {
          reply = await callHunyuanHTTP(messages, userContext)
        } catch (e2) {
          console.error('HTTP fallback error:', e2)
          return { errMsg: '', data: { reply: userMsg } }
        }
      } else if (process.env.HUNYUAN_API_KEY && hasVision) {
        try {
          reply = await callVisionChat(messages, userContext)
        } catch (e2) {
          console.error('Vision fallback error:', e2)
          return { errMsg: '', data: { reply: '图片识别暂时不可用，请稍后再试～ 📷' } }
        }
      } else {
        return { errMsg: '', data: { reply: userMsg } }
      }
    } else if (isTimeout) {
      userMsg = '思考时间有点长，再问一次吧～ 🤔'
      return { errMsg: '', data: { reply: userMsg } }
    } else if (hasVision) {
      return { errMsg: '', data: { reply: '图片识别暂时不可用，请稍后再试～ 📷' } }
    } else {
      return { errMsg: '', data: { reply: userMsg } }
    }
  }

  const lastUserMsg = messages && messages.length > 0
    ? messages.filter(m => m.role === 'user').pop()
    : null
  const extractedPreferences = lastUserMsg
    ? parseUserPreferences(lastUserMsg.content)
    : null

  if (reply) {
    const data = { reply }
    if (extractedPreferences) data.extractedPreferences = extractedPreferences
    return { errMsg: '', data }
  }
  return { errMsg: '', data: { reply: '精灵小管家走神了，稍后再试～ 😅' } }
}
