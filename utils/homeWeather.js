/**
 * 首页定位城市与天气 —— 供 model 页写入、天气日历等页读取同步
 */
const STORAGE_KEY = 'privclo_home_weather'
const DEFAULT_CITY = '深圳'

const WEATHER_TYPES = ['sunny', 'cloudy', 'overcast', 'rainy', 'haze']

function cityHash(city) {
  const name = String(city || DEFAULT_CITY).trim() || DEFAULT_CITY
  return name.split('').reduce((acc, c) => acc + c.charCodeAt(0), 0)
}

function iconToCalendarType(icon) {
  const k = String(icon || 'sun')
  if (k === 'rain') return 'rainy'
  if (k === 'cloudy') return 'cloudy'
  if (k === 'cloud') return 'overcast'
  if (k === 'sun') return 'sunny'
  return 'sunny'
}

function textToCalendarType(text) {
  const t = String(text || '')
  if (/霾|雾/.test(t)) return 'haze'
  if (/雨/.test(t)) return 'rainy'
  if (/阴/.test(t)) return 'cloudy'
  if (/多云/.test(t)) return 'overcast'
  if (/晴/.test(t)) return 'sunny'
  return null
}

function resolveCalendarType(home) {
  if (!home) return null
  const fromText = textToCalendarType(home.weather)
  if (fromText) return fromText
  return iconToCalendarType(home.weatherIcon)
}

function getHomeWeather() {
  try {
    const raw = wx.getStorageSync(STORAGE_KEY)
    if (raw && typeof raw === 'object' && raw.city) {
      return raw
    }
  } catch (e) {}
  return null
}

function setHomeWeather(payload) {
  if (!payload || typeof payload !== 'object') return
  const city = String(payload.city || '').trim()
  if (!city) return
  const data = {
    city,
    temp: payload.temp != null ? String(payload.temp) : '',
    weather: payload.weather != null ? String(payload.weather) : '',
    weatherIcon: payload.weatherIcon || 'sun',
    updatedAt: Date.now()
  }
  try {
    wx.setStorageSync(STORAGE_KEY, data)
  } catch (e) {
    console.error('save home weather failed', e)
  }
  const app = typeof getApp === 'function' ? getApp() : null
  if (app && app.globalData) {
    app.globalData.homeWeather = data
  }
}

function getSyncedCity() {
  const app = typeof getApp === 'function' ? getApp() : null
  const cached = app && app.globalData && app.globalData.homeWeather
  if (cached && cached.city) return cached.city
  const stored = getHomeWeather()
  return (stored && stored.city) ? stored.city : DEFAULT_CITY
}

function getWeatherForDay(year, month, day, city, homeSnapshot) {
  const c = String(city || DEFAULT_CITY).trim() || DEFAULT_CITY
  const now = new Date()
  const isToday =
    year === now.getFullYear() &&
    month === now.getMonth() + 1 &&
    day === now.getDate()

  if (isToday && homeSnapshot && homeSnapshot.city === c) {
    const todayType = resolveCalendarType(homeSnapshot)
    if (todayType) return todayType
  }

  const seed = year * 10000 + month * 100 + day + cityHash(c) * 997
  const idx = Math.abs(seed) % WEATHER_TYPES.length
  return WEATHER_TYPES[idx]
}

function homeWeatherSnapshotKey(home) {
  if (!home || !home.city) return ''
  return [
    home.city,
    home.weather || '',
    home.weatherIcon || '',
    home.updatedAt || 0
  ].join('|')
}

module.exports = {
  STORAGE_KEY,
  DEFAULT_CITY,
  WEATHER_TYPES,
  getHomeWeather,
  setHomeWeather,
  getSyncedCity,
  getWeatherForDay,
  homeWeatherSnapshotKey,
  resolveCalendarType
}
