/**
 * 和风天气 API 配置
 * 环境变量（任选其一）：
 *   WEATHER_PRIVATE_KEY 或 QWEATHER_PRIVATE_KEY - Ed25519 私钥完整 PEM
 *   WEATHER_PROJECT_ID 或 QWEATHER_PROJECT_ID
 *   WEATHER_KEY_ID 或 QWEATHER_KEY_ID
 *   WEATHER_API_HOST 或 QWEATHER_API_HOST - 须为控制台 API Host，可带或不带 https://
 */
const DEFAULT_API_HOST = 'https://mv3md9t3ju.re.qweatherapi.com'

function normalizeApiHost(host) {
  const raw = String(host || '').trim()
  if (!raw) return DEFAULT_API_HOST
  let normalized = raw.replace(/\/+$/, '')
  if (!/^https?:\/\//i.test(normalized)) {
    normalized = 'https://' + normalized
  }
  try {
    // eslint-disable-next-line no-new
    new URL(normalized)
    return normalized
  } catch (e) {
    console.warn('[weather] invalid WEATHER_API_HOST, use default:', raw)
    return DEFAULT_API_HOST
  }
}

function normalizePrivateKey(key) {
  if (!key) return ''
  return String(key).trim().replace(/\\n/g, '\n')
}

const API_HOST = normalizeApiHost(
  process.env.WEATHER_API_HOST || process.env.QWEATHER_API_HOST || DEFAULT_API_HOST
)
const PROJECT_ID = process.env.WEATHER_PROJECT_ID || process.env.QWEATHER_PROJECT_ID || '2NKPCWYAPJ'
const KEY_ID = process.env.WEATHER_KEY_ID || process.env.QWEATHER_KEY_ID || 'T5H2XKPKE3'
const PRIVATE_KEY = normalizePrivateKey(
  process.env.WEATHER_PRIVATE_KEY || process.env.QWEATHER_PRIVATE_KEY
)

module.exports = {
  API_HOST,
  PROJECT_ID,
  KEY_ID,
  PRIVATE_KEY,
  DEFAULT_API_HOST
}
