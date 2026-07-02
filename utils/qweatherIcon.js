/**
 * 和风天气图标（与 API icon 字段一致）
 * 使用内嵌 SVG + data URI，不依赖外部 CDN，无需配置 downloadFile 合法域名
 */

const DEFAULT_ICON_CODE = '100'
const EFFECT_TO_ICON = {
  sun: '100', cloud: '101', cloudy: '104', rain: '305',
  snow: '400', fog: '501', thunder: '302'
}
const TEXT_TO_ICON = {
  '晴': '100', '多云': '101', '阴': '104', '小雨': '305',
  '雪': '400', '雾': '501', '霾': '501', '雷阵雨': '302', '雷': '302'
}

const _coloredCache = {}

function svgToDataUri(svg) {
  return 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(svg)
}

function applyColorToSvg(svg, color) {
  return String(svg)
    .replace(/fill="currentColor"/gi, 'fill="' + color + '"')
    .replace(/fill:currentColor/gi, 'fill:' + color)
    .replace(/stroke="currentColor"/gi, 'stroke="' + color + '"')
    .replace(/stroke:currentColor/gi, 'stroke:' + color)
}

const SVG_SUN = '<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" viewBox="0 0 16 16"><path d="M8.005 3.5a4.5 4.5 0 1 0 0 9 4.5 4.5 0 0 0 0-9Zm.004-.997a.5.5 0 0 1-.5-.5v-1.5a.5.5 0 0 1 1 0v1.5a.5.5 0 0 1-.5.5ZM3.766 4.255a.498.498 0 0 1-.353-.147l-1.062-1.06a.5.5 0 0 1 .707-.707L4.122 3.4a.5.5 0 0 1-.355.854v.001ZM2.004 8.493h-1.5a.5.5 0 1 1 0-1h1.5a.5.5 0 1 1 0 1Zm.691 5.303a.5.5 0 0 1-.354-.854l1.062-1.06a.5.5 0 0 1 .708.707l-1.063 1.06a.497.497 0 0 1-.353.147Zm5.301 2.201a.5.5 0 0 1-.5-.5v-1.5a.5.5 0 0 1 1 0v1.5a.5.5 0 0 1-.5.5Zm5.304-2.191a.496.496 0 0 1-.353-.147l-1.06-1.06a.5.5 0 1 1 .706-.707l1.06 1.06a.5.5 0 0 1-.353.854Zm2.203-5.299h-1.5a.5.5 0 0 1 0-1h1.5a.5.5 0 1 1 0 1ZM12.25 4.265a.5.5 0 0 1-.354-.854l1.06-1.06a.5.5 0 1 1 .708.707l-1.06 1.06a.498.498 0 0 1-.354.147Z"/></svg>'

const SVG_NIGHT_CLEAR = '<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" viewBox="0 0 16 16"><path d="M9.21 1.491c-3.757-.066-6.613 2.537-6.88 5.705-.292 3.494 2.107 4.947 2.428 5.232C2.853 12.4.585 10.28.204 8.296a.104.104 0 0 0-.1-.085.103.103 0 0 0-.103.114c.403 3.526 3.405 6.2 6.79 6.186 3.604-.016 6.518-2.147 6.89-5.646.35-3.295-2.108-5.008-2.424-5.292 2.023.02 4.162 2.15 4.54 4.133.008.048.05.084.098.085a.102.102 0 0 0 .1-.071.103.103 0 0 0 .004-.043c-.406-3.521-3.405-6.126-6.788-6.185ZM8 9.503A1.502 1.502 0 1 1 8 6.5a1.502 1.502 0 0 1 0 3.004Z"/></svg>'

const SVG_NIGHT_CLOUD = '<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" viewBox="0 0 16 16"><path d="M8.67 2.004a5.002 5.002 0 0 0-4.92 5.902A4.502 4.502 0 0 0 3.5 16h8.257A3.752 3.752 0 0 0 15.5 12.25a3.75 3.75 0 0 0-3.75-3.75c-.213 0-.422.018-.626.053A5.002 5.002 0 0 0 8.67 2.004Z"/></svg>'

const SVG_CLOUD = '<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" viewBox="0 0 16 16"><path d="M4.5 12.5a3.5 3.5 0 0 1 .607-6.953A4.002 4.002 0 0 1 12.5 6.5a3.5 3.5 0 0 1 .5 6.999H4.5Z"/></svg>'

const SVG_CLOUDY = '<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" viewBox="0 0 16 16"><path d="M2.5 12a3.5 3.5 0 0 1 1.2-6.6A4.5 4.5 0 0 1 13.5 5.5a3 3 0 0 1 .5 6H2.5Z"/><path d="M5 13.5h7a2.5 2.5 0 0 0 0-5H5a2.5 2.5 0 0 0 0 5Z" opacity=".55"/></svg>'

const SVG_RAIN = '<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" viewBox="0 0 16 16"><path d="M4.5 9.5a3 3 0 0 1 .52-5.96A3.5 3.5 0 0 1 11.5 4a3 3 0 0 1 .5 5.5H4.5Z"/><path d="M5.5 11.5v2.5a.5.5 0 0 1-1 0v-2.5a.5.5 0 0 1 1 0Zm3-1v3.5a.5.5 0 0 1-1 0v-3.5a.5.5 0 0 1 1 0Zm3 1v2.5a.5.5 0 0 1-1 0v-2.5a.5.5 0 0 1 1 0Z"/></svg>'

const SVG_SNOW = '<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" viewBox="0 0 16 16"><path d="M4.5 9.5a3 3 0 0 1 .52-5.96A3.5 3.5 0 0 1 11.5 4a3 3 0 0 1 .5 5.5H4.5Z"/><path d="M5 11.5h1v1H5v-1Zm3 0h1v1H8v-1Zm3 0h1v1h-1v-1Zm-4.5 2h1v1h-1v-1Zm3 0h1v1h-1v-1Z"/></svg>'

const SVG_FOG = '<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" viewBox="0 0 16 16"><path d="M2 8.5h12v1H2v-1Zm0 2.5h10v1H2v-1Zm0 2.5h8v1H2v-1Z"/></svg>'

const SVG_THUNDER = '<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" viewBox="0 0 16 16"><path d="M4.5 9.5a3 3 0 0 1 .52-5.96A3.5 3.5 0 0 1 11.5 4a3 3 0 0 1 .5 5.5H4.5Z"/><path d="M8.2 9.5 6.8 12h1.4L7.2 14.5 10 11H8.4l.8-1.5H8.2Z"/></svg>'

const SVG_HOT = '<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" viewBox="0 0 16 16"><path d="M8 1.5c.5 2.2 2.2 3.4 2.2 5.8a2.2 2.2 0 1 1-4.4 0C5.8 4.9 7.5 3.7 8 1.5Z"/><path d="M4.5 12.5a3.5 3.5 0 1 0 7 0 3.5 3.5 0 0 0-7 0Z"/></svg>'

const SVG_COLD = '<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" viewBox="0 0 16 16"><path d="M8 1v14M8 1l-1.5 2M8 1l1.5 2M8 15l-1.5-2M8 15l1.5-2M3 8h10M1 8l2-1.5M1 8l2 1.5M15 8l-2-1.5M15 8l-2 1.5M4.2 4.2l1.1 1.1M10.7 10.7l1.1 1.1M4.2 11.8l1.1-1.1M10.7 5.3l1.1-1.1" stroke="currentColor" stroke-width="1.2" stroke-linecap="round" fill="none"/></svg>'

const FALLBACK_DATA_URI = svgToDataUri(applyColorToSvg(SVG_SUN, '#FF9F1A'))

_coloredCache['100@#FF9F1A'] = FALLBACK_DATA_URI
_coloredCache['1001@#94A3B8'] = svgToDataUri(applyColorToSvg(SVG_NIGHT_CLEAR, '#94A3B8'))
_coloredCache['1002@#94A3B8'] = svgToDataUri(applyColorToSvg(SVG_NIGHT_CLOUD, '#94A3B8'))

function normalizeIconCode(code) {
  if (code == null || code === '') return DEFAULT_ICON_CODE
  const raw = String(code).trim()
  if (!raw) return DEFAULT_ICON_CODE
  const num = parseInt(raw, 10)
  if (!Number.isNaN(num) && num > 0) return String(num)
  return DEFAULT_ICON_CODE
}

function getColorForIconCode(iconCode) {
  const n = parseInt(normalizeIconCode(iconCode), 10) || 100
  if (n >= 1001 && n <= 1030) return '#94A3B8'
  if (n === 100 || n === 150) return '#FF9F1A'
  if (n === 101 || n === 102 || n === 103 || n === 151 || n === 152 || n === 153) return '#5B9BD5'
  if (n === 104) return '#7B8A9A'
  if (n === 302 || n === 303 || n === 304 || n === 311 || n === 312) return '#7E57C2'
  if (n >= 300 && n <= 399) return '#4A90E2'
  if (n >= 400 && n <= 499) return '#7EC8E3'
  if (n >= 500 && n <= 515) return '#A89F94'
  if (n === 900) return '#E53935'
  if (n === 901) return '#29B6F6'
  return '#FF9F1A'
}

function cacheKey(code, color) {
  return normalizeIconCode(code) + '@' + color
}

function getCachedDataUri(code, color) {
  return _coloredCache[cacheKey(code, color)] || null
}

function putCachedDataUri(code, color, uri) {
  _coloredCache[cacheKey(code, color)] = uri
  return uri
}

function getSvgTemplateForCode(iconCode) {
  const n = parseInt(normalizeIconCode(iconCode), 10) || 100
  if (n >= 1001 && n <= 1030) {
    if (n === 1001) return SVG_NIGHT_CLEAR
    return SVG_NIGHT_CLOUD
  }
  if (n === 100 || n === 150) return SVG_SUN
  if (n === 101 || n === 102 || n === 103 || n === 151 || n === 152 || n === 153) return SVG_CLOUD
  if (n === 104) return SVG_CLOUDY
  if (n === 302 || n === 303 || n === 304 || n === 311 || n === 312) return SVG_THUNDER
  if (n >= 300 && n <= 399) return SVG_RAIN
  if (n >= 400 && n <= 499) return SVG_SNOW
  if (n >= 500 && n <= 515) return SVG_FOG
  if (n === 900) return SVG_HOT
  if (n === 901) return SVG_COLD
  return SVG_SUN
}

function buildColoredDataUri(iconCode) {
  const code = normalizeIconCode(iconCode)
  const color = getColorForIconCode(code)
  const cached = getCachedDataUri(code, color)
  if (cached) return cached
  const svg = getSvgTemplateForCode(code)
  return putCachedDataUri(code, color, svgToDataUri(applyColorToSvg(svg, color)))
}

function getInstantIconUrl(iconCode) {
  return buildColoredDataUri(iconCode)
}

function isSafeWeatherIconUrl(url) {
  if (!url || typeof url !== 'string') return false
  if (url.charAt(0) === '/' || url.indexOf('weather-icons/') >= 0) return false
  return url.indexOf('data:image') === 0
}

function sanitizeWeatherIconUrl(url) {
  if (isSafeWeatherIconUrl(url)) return url
  return getInstantIconUrl(DEFAULT_ICON_CODE)
}

function getQWeatherIconFallbackUrl() {
  return FALLBACK_DATA_URI
}

function getQWeatherIconUrl(iconCode) {
  return getInstantIconUrl(iconCode)
}

function getIconCodeFromEffect(effect) {
  return EFFECT_TO_ICON[effect] || DEFAULT_ICON_CODE
}

function getIconCodeFromWeatherText(text) {
  return TEXT_TO_ICON[String(text || '').trim()] || DEFAULT_ICON_CODE
}

function loadColoredIconUrl(iconCode) {
  return Promise.resolve(buildColoredDataUri(iconCode))
}

module.exports = {
  DEFAULT_ICON_CODE,
  normalizeIconCode,
  getColorForIconCode,
  getQWeatherIconUrl,
  getQWeatherIconFallbackUrl,
  getInstantIconUrl,
  isSafeWeatherIconUrl,
  sanitizeWeatherIconUrl,
  loadColoredIconUrl,
  getIconCodeFromEffect,
  getIconCodeFromWeatherText
}
