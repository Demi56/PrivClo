/**
 * 和风天气 API 配置
 * 环境变量（任选其一）：
 *   WEATHER_PRIVATE_KEY 或 QWEATHER_PRIVATE_KEY - Ed25519 私钥完整 PEM
 *   WEATHER_PROJECT_ID 或 QWEATHER_PROJECT_ID
 *   WEATHER_KEY_ID 或 QWEATHER_KEY_ID
 *   WEATHER_API_HOST 或 QWEATHER_API_HOST
 */
const API_HOST = process.env.WEATHER_API_HOST || process.env.QWEATHER_API_HOST || 'https://mv3md9t3ju.re.qweatherapi.com'
const PROJECT_ID = process.env.WEATHER_PROJECT_ID || process.env.QWEATHER_PROJECT_ID || '2NKPCWYAPJ'
const KEY_ID = process.env.WEATHER_KEY_ID || process.env.QWEATHER_KEY_ID || 'T5H2XKPKE3'

const PRIVATE_KEY = process.env.WEATHER_PRIVATE_KEY || process.env.QWEATHER_PRIVATE_KEY

module.exports = {
  API_HOST,
  PROJECT_ID,
  KEY_ID,
  PRIVATE_KEY
}
