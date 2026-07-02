/**
 * 混元 HTTP 调用配置
 * - TokenHub Key（通常 sk- 开头）→ tokenhub.tencentmaas.com
 * - 旧混元控制台 Key → api.hunyuan.cloud.tencent.com
 */
const TOKENHUB_CHAT_URL = 'https://tokenhub.tencentmaas.com/v1/chat/completions'
const LEGACY_HUNYUAN_CHAT_URL = 'https://api.hunyuan.cloud.tencent.com/v1/chat/completions'

const TOKENHUB_VISION_MODELS = [
  'hy-vision-2.0-instruct',
  'hunyuan-t1-vision-20250916',
  'youtu-vita'
]

const LEGACY_VISION_MODELS = [
  'hunyuan-t1-vision-20250916',
  'hunyuan-vision-1.5-thinking',
  'hunyuan-vision'
]

function uniqueList(items) {
  const seen = new Set()
  const out = []
  for (const item of items || []) {
    if (!item || seen.has(item)) continue
    seen.add(item)
    out.push(item)
  }
  return out
}

function resolveHttpChatUrl(apiKey) {
  const custom = process.env.HUNYUAN_API_URL || process.env.TOKENHUB_API_URL
  if (custom) return custom
  const key = apiKey || process.env.HUNYUAN_API_KEY || ''
  if (key.startsWith('sk-')) return TOKENHUB_CHAT_URL
  return LEGACY_HUNYUAN_CHAT_URL
}

function resolveVisionHttpTargets(apiKey) {
  const key = apiKey || process.env.HUNYUAN_API_KEY || ''
  const envModel = process.env.HUNYUAN_VISION_MODEL
  const custom = process.env.HUNYUAN_API_URL || process.env.TOKENHUB_API_URL

  if (custom) {
    return [{
      url: custom,
      models: uniqueList([envModel, ...TOKENHUB_VISION_MODELS, ...LEGACY_VISION_MODELS])
    }]
  }

  if (key.startsWith('sk-')) {
    return [{
      url: TOKENHUB_CHAT_URL,
      models: uniqueList([envModel, ...TOKENHUB_VISION_MODELS])
    }]
  }

  return [{
    url: LEGACY_HUNYUAN_CHAT_URL,
    models: uniqueList([envModel, ...LEGACY_VISION_MODELS])
  }]
}

function isTokenHubKey(apiKey) {
  const key = apiKey || process.env.HUNYUAN_API_KEY || ''
  if (process.env.TOKENHUB_API_URL || (process.env.HUNYUAN_API_URL && /tokenhub/i.test(process.env.HUNYUAN_API_URL))) {
    return true
  }
  return key.startsWith('sk-')
}

module.exports = {
  TOKENHUB_CHAT_URL,
  LEGACY_HUNYUAN_CHAT_URL,
  resolveHttpChatUrl,
  resolveVisionHttpTargets,
  isTokenHubKey
}
