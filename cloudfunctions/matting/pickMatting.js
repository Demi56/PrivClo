/**
 * 双引擎抠图结果 AI 择优
 */
const cloud = require('wx-server-sdk')

const VISION_SPECS = [
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

function parseJsonFromText(text) {
  if (!text || typeof text !== 'string') return null
  try {
    const m = text.match(/\{[\s\S]*\}/)
    if (m) return JSON.parse(m[0])
  } catch (e) {}
  return null
}

function createVisionModel() {
  if (!cloud.extend || !cloud.extend.AI) return null
  const ai = cloud.extend.AI
  for (const spec of VISION_SPECS) {
    try {
      return typeof spec === 'string' ? ai.createModel(spec) : ai.createModel(spec)
    } catch (_) {}
  }
  try {
    return ai.createModel('cloudbase')
  } catch (_) {
    return null
  }
}

async function generateVisionCompare(model, prompt, goodsUrl, generalUrl) {
  try {
    return await model.generateText({
      messages: [{
        role: 'user',
        content: prompt,
        images: [goodsUrl, generalUrl]
      }],
      temperature: 0.1
    })
  } catch (_) {}

  for (const modelName of CLOUDBASE_VISION_MODELS) {
    try {
      return await model.generateText({
        model: modelName,
        messages: [{
          role: 'user',
          content: [
            { type: 'text', text: prompt },
            { type: 'image_url', image_url: { url: goodsUrl } },
            { type: 'image_url', image_url: { url: generalUrl } }
          ]
        }],
        temperature: 0.1
      })
    } catch (_) {}
  }
  return null
}

/**
 * @param {string} goodsUrl 商品抠图结果 URL
 * @param {string} generalUrl 通用抠图结果 URL
 * @returns {Promise<{choice: 'goods'|'general', reason: string}>}
 */
async function pickBestMattingResult(goodsUrl, generalUrl) {
  const model = createVisionModel()
  if (!model) {
    return { choice: 'general', reason: '默认通用抠图' }
  }

  const prompt = `你是专业抠图质量评估师。图1是商品抠图(GoodsMatting)，图2是通用抠图(AIPicMatting)。
请比较哪张背景更干净、边缘更自然、衣物主体更完整，避免背景残留和过度抠缺。
只返回 JSON，不要其他文字：
{"choice":"goods"|"general","reason":"10字以内说明"}`

  try {
    const res = await generateVisionCompare(model, prompt, goodsUrl, generalUrl)
    if (!res) {
      return { choice: 'general', reason: '视觉模型不可用' }
    }
    const text = res?.choices?.[0]?.message?.content || res?.text || ''
    const parsed = parseJsonFromText(text)
    const choice = parsed && parsed.choice === 'goods' ? 'goods' : 'general'
    const reason = parsed && parsed.reason ? String(parsed.reason).trim() : ''
    return { choice, reason }
  } catch (err) {
    console.warn('pickBestMattingResult failed:', err.message)
    return { choice: 'general', reason: '择优失败，默认通用' }
  }
}

module.exports = { pickBestMattingResult }
