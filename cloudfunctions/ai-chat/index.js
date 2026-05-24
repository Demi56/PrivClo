/**
 * 精灵小管家 AI 对话云函数
 * 调用腾讯混元大模型 API，返回穿搭顾问风格的回复
 */
const cloud = require('wx-server-sdk')
const { API_KEY, API_URL, MODEL } = require('./config.js')
const { buildSystemPrompt } = require('./config.js')

cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV })

function callHunyuan(messages, context) {
  if (!API_KEY) {
    return Promise.reject(new Error('未配置 HUNYUAN_API_KEY 环境变量'))
  }
  const systemPrompt = buildSystemPrompt(context)
  const body = JSON.stringify({
    model: MODEL,
    messages: [
      { role: 'system', content: systemPrompt },
      ...messages
    ],
    max_tokens: 256,
    temperature: 0.7
  })
  return new Promise((resolve, reject) => {
    const https = require('https')
    const url = new URL(API_URL)
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
  const { messages, context: userContext } = event
  if (!messages || !Array.isArray(messages) || messages.length === 0) {
    return { errMsg: '缺少 messages 参数', data: null }
  }
  try {
    const reply = await callHunyuan(messages, userContext)
    return { errMsg: '', data: { reply } }
  } catch (e) {
    console.error('ai-chat error:', e)
    return { errMsg: e.message || 'AI 服务异常', data: null }
  }
}
