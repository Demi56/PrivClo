/**
 * 天气 API 配置（和风天气 QWeather）
 * 优先使用云函数（推荐），云函数内生成 JWT 并调用和风天气
 */

// ========== 云函数模式（推荐） ==========
// 使用 cloudfunctions/weather 云函数，JWT 与 API 调用均在云端完成
const USE_CLOUD_WEATHER = true

// ========== 直连模式（备用） ==========
const WEATHER_API_KEY = ''
const WEATHER_JWT_TOKEN = ''
const WEATHER_JWT_FETCH_URL = ''
const GEO_API_BASE = 'https://geoapi.qweather.com'
const WEATHER_API_BASE = 'https://devapi.qweather.com'

const USE_JWT = !WEATHER_API_KEY && (!!WEATHER_JWT_TOKEN || !!WEATHER_JWT_FETCH_URL)
const HAS_CREDENTIALS = USE_CLOUD_WEATHER || !!WEATHER_API_KEY || USE_JWT

module.exports = {
  USE_CLOUD_WEATHER,
  WEATHER_API_KEY,
  WEATHER_JWT_TOKEN,
  WEATHER_JWT_FETCH_URL,
  GEO_API_BASE,
  WEATHER_API_BASE,
  USE_JWT,
  HAS_CREDENTIALS
}
