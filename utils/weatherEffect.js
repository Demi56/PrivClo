/**
 * 和风天气 icon 代码 -> 首页天气动效类型
 * sun | cloud | cloudy | rain | snow | fog | thunder
 */

const WEATHER_EFFECTS = ['sun', 'cloud', 'cloudy', 'rain', 'snow', 'fog', 'thunder']

function iconToWeatherEffect(icon) {
  const code = parseInt(icon, 10) || 100
  if (code === 302 || code === 303 || code === 304 || code === 311 || code === 312) return 'thunder'
  if (code >= 300 && code <= 399) return 'rain'
  if (code >= 400 && code <= 499) return 'snow'
  if (code >= 500 && code <= 515) return 'fog'
  if (code === 104) return 'cloudy'
  if (code === 101 || code === 102 || code === 103 || code === 151 || code === 152 || code === 153) return 'cloud'
  if (code === 100 || code === 150) return 'sun'
  return 'sun'
}

function textToWeatherEffect(text) {
  const t = String(text || '').trim()
  if (/雷/.test(t)) return 'thunder'
  if (/雪/.test(t)) return 'snow'
  if (/霾|雾|沙/.test(t)) return 'fog'
  if (/雨/.test(t)) return 'rain'
  if (/阴/.test(t)) return 'cloudy'
  if (/多云/.test(t)) return 'cloud'
  if (/晴/.test(t)) return 'sun'
  return 'sun'
}

module.exports = {
  WEATHER_EFFECTS,
  iconToWeatherEffect,
  textToWeatherEffect
}
