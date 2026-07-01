/**
 * 和风天气官方图标（qweather-icons，与 API icon 字段一致）
 * 仅输出 data URI 供 image 使用，绝不使用本地 /images/weather-icons/ 路径
 * 需在公众平台 request / downloadFile 合法域名中添加：cdn.jsdelivr.net
 */

const QWEATHER_ICON_VERSION = '1.8.0'
const QWEATHER_ICON_CDN = 'https://cdn.jsdelivr.net/npm/qweather-icons@' + QWEATHER_ICON_VERSION + '/icons/'
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
}

/** 内嵌兜底图标（晴天橙色） */
const FALLBACK_SVG = '<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="#FF9F1A" viewBox="0 0 16 16"><path d="M8.005 3.5a4.5 4.5 0 1 0 0 9 4.5 4.5 0 0 0 0-9Zm.004-.997a.5.5 0 0 1-.5-.5v-1.5a.5.5 0 0 1 1 0v1.5a.5.5 0 0 1-.5.5ZM3.766 4.255a.498.498 0 0 1-.353-.147l-1.062-1.06a.5.5 0 0 1 .707-.707L4.122 3.4a.5.5 0 0 1-.355.854v.001ZM2.004 8.493h-1.5a.5.5 0 1 1 0-1h1.5a.5.5 0 1 1 0 1Zm.691 5.303a.5.5 0 0 1-.354-.854l1.062-1.06a.5.5 0 0 1 .708.707l-1.063 1.06a.497.497 0 0 1-.353.147Zm5.301 2.201a.5.5 0 0 1-.5-.5v-1.5a.5.5 0 0 1 1 0v1.5a.5.5 0 0 1-.5.5Zm5.304-2.191a.496.496 0 0 1-.353-.147l-1.06-1.06a.5.5 0 1 1 .706-.707l1.06 1.06a.5.5 0 0 1-.353.854Zm2.203-5.299h-1.5a.5.5 0 0 1 0-1h1.5a.5.5 0 1 1 0 1ZM12.25 4.265a.5.5 0 0 1-.354-.854l1.06-1.06a.5.5 0 1 1 .708.707l-1.06 1.06a.498.498 0 0 1-.354.147Z"/></svg>'
const FALLBACK_DATA_URI = svgToDataUri(FALLBACK_SVG)

/** 夜间晴（1001）— 即时展示用 */
const NIGHT_CLEAR_SVG = '<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" viewBox="0 0 16 16"><path d="M9.21 1.491c-3.757-.066-6.613 2.537-6.88 5.705-.292 3.494 2.107 4.947 2.428 5.232C2.853 12.4.585 10.28.204 8.296a.104.104 0 0 0-.1-.085.103.103 0 0 0-.103.114c.403 3.526 3.405 6.2 6.79 6.186 3.604-.016 6.518-2.147 6.89-5.646.35-3.295-2.108-5.008-2.424-5.292 2.023.02 4.162 2.15 4.54 4.133.008.048.05.084.098.085a.102.102 0 0 0 .1-.071.103.103 0 0 0 .004-.043c-.406-3.521-3.405-6.126-6.788-6.185ZM8 9.503A1.502 1.502 0 1 1 8 6.5a1.502 1.502 0 0 1 0 3.004Z"/></svg>'

/** 夜间多云（1002）— 即时展示用 */
const NIGHT_CLOUD_SVG = '<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" viewBox="0 0 16 16"><path d="M8.67 2.004a5.002 5.002 0 0 0-4.92 5.902A4.502 4.502 0 0 0 3.5 16h8.257A3.752 3.752 0 0 0 15.5 12.25a3.75 3.75 0 0 0-3.75-3.75c-.213 0-.422.018-.626.053A5.002 5.002 0 0 0 8.67 2.004Z"/></svg>'

_coloredCache['100@#FF9F1A'] = FALLBACK_DATA_URI
_coloredCache['1001@#94A3B8'] = svgToDataUri(applyColorToSvg(NIGHT_CLEAR_SVG, '#94A3B8'))
_coloredCache['1002@#94A3B8'] = svgToDataUri(applyColorToSvg(NIGHT_CLOUD_SVG, '#94A3B8'))

function normalizeIconCode(code) {
  if (code == null || code === '') return DEFAULT_ICON_CODE
  const raw = String(code).trim()
  if (!raw) return DEFAULT_ICON_CODE
  const num = parseInt(raw, 10)
  if (!Number.isNaN(num) && num > 0) return String(num)
  return DEFAULT_ICON_CODE
}

/** 1001–1030 夜间图标在 CDN 无 -fill，优先 plain svg */
function preferPlainSvgFirst(iconCode) {
  const n = parseInt(normalizeIconCode(iconCode), 10) || 100
  return n >= 1000
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

function fetchSvgByRequest(url) {
  return new Promise(function (resolve, reject) {
    wx.request({
      url: url,
      method: 'GET',
      success: function (res) {
        if (res.statusCode !== 200 || res.data == null || res.data === '') {
          reject(new Error('request_fail'))
          return
        }
        resolve(String(res.data))
      },
      fail: reject
    })
  })
}

function fetchSvgByDownload(url) {
  return new Promise(function (resolve, reject) {
    wx.downloadFile({
      url: url,
      success: function (res) {
        if (res.statusCode !== 200 || !res.tempFilePath) {
          reject(new Error('download_fail'))
          return
        }
        wx.getFileSystemManager().readFile({
          filePath: res.tempFilePath,
          encoding: 'utf-8',
          success: function (r) { resolve(String(r.data || '')) },
          fail: reject
        })
      },
      fail: reject
    })
  })
}

function fetchSvgText(url) {
  return fetchSvgByRequest(url).catch(function () {
    return fetchSvgByDownload(url)
  })
}

function buildIconFetchUrls(iconCode) {
  const code = normalizeIconCode(iconCode)
  const plainUrl = QWEATHER_ICON_CDN + code + '.svg'
  const fillUrl = QWEATHER_ICON_CDN + code + '-fill.svg'
  if (preferPlainSvgFirst(code)) return [plainUrl, fillUrl]
  return [fillUrl, plainUrl]
}

/** 夜间 1003+ 暂无内嵌图时，用 1001/1002 或晴天兜底 */
function getInstantIconUrl(iconCode) {
  const code = normalizeIconCode(iconCode)
  const color = getColorForIconCode(code)
  const cached = getCachedDataUri(code, color)
  if (cached) return cached
  const n = parseInt(code, 10) || 100
  if (n >= 1001 && n <= 1030) {
    return getCachedDataUri('1001', color) || getCachedDataUri('1002', color) || FALLBACK_DATA_URI
  }
  return FALLBACK_DATA_URI
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

/** 兼容旧调用：始终返回 data URI，绝不返回本地路径或裸 CDN URL */
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
  const code = normalizeIconCode(iconCode)
  const color = getColorForIconCode(code)
  const cached = getCachedDataUri(code, color)
  if (cached) return Promise.resolve(cached)

  const instant = getInstantIconUrl(code)
  const urls = buildIconFetchUrls(code)

  return fetchSvgText(urls[0])
    .catch(function () { return fetchSvgText(urls[1]) })
    .then(function (svg) {
      return putCachedDataUri(code, color, svgToDataUri(applyColorToSvg(svg, color)))
    })
    .catch(function () {
      return putCachedDataUri(code, color, instant)
    })
}

module.exports = {
  QWEATHER_ICON_CDN,
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
