/**
 * 天气服务 - 和风天气 API
 * 优先调用云函数，云函数内生成 JWT 并请求和风天气
 */
const {
  USE_CLOUD_WEATHER,
  WEATHER_API_KEY,
  WEATHER_JWT_TOKEN,
  WEATHER_JWT_FETCH_URL,
  GEO_API_BASE,
  WEATHER_API_BASE,
  USE_JWT,
  HAS_CREDENTIALS
} = require('../config/weather.js')

function request(options) {
  return new Promise((resolve, reject) => {
    wx.request({
      ...options,
      success: res => resolve(res),
      fail: err => reject(err)
    })
  })
}

/** 云函数：根据经纬度或城市名获取天气 */
function callWeatherCloudFunction(location, type, options = {}) {
  return new Promise((resolve, reject) => {
    if (!wx.cloud || !wx.cloud.callFunction) {
      reject(new Error('请开通云开发'))
      return
    }
    const data = {
      location,
      type: type || (location.includes(',') ? 'coords' : 'city'),
      includeForecast: !!options.includeForecast
    }
    wx.cloud.callFunction({
      name: 'weather',
      data
    }).then(res => {
      const result = res.result || {}
      if (result.errMsg) {
        reject(new Error(result.errMsg))
      } else if (result.data) {
        resolve(result.data)
      } else {
        reject(new Error('天气数据异常'))
      }
    }).catch(reject)
  })
}

/** 获取 JWT Token（直连模式） */
function getJwtToken() {
  if (WEATHER_JWT_FETCH_URL) {
    return request({ url: WEATHER_JWT_FETCH_URL, method: 'GET' }).then(res => {
      const token = res.data && (res.data.token || res.data.jwt || res.data.access_token)
      if (!token) throw new Error('jwt_fetch_fail')
      return token
    })
  }
  if (WEATHER_JWT_TOKEN) return Promise.resolve(WEATHER_JWT_TOKEN)
  return Promise.reject(new Error('no_jwt'))
}

function buildAuthRequest(url, data) {
  if (USE_JWT) {
    return getJwtToken().then(token => ({
      url,
      data,
      header: { Authorization: 'Bearer ' + token }
    }))
  }
  return Promise.resolve({ url, data: { ...data, key: WEATHER_API_KEY } })
}

function iconToWeatherIcon(icon) {
  const code = parseInt(icon, 10) || 100
  if (code >= 100 && code <= 104) return 'sun'
  if (code >= 150 && code <= 153) return 'sun'
  if (code === 101 || code === 151) return 'cloud'
  if (code === 104) return 'cloudy'
  if (code >= 300 && code <= 399) return 'rain'
  if (code >= 350 && code <= 399) return 'rain'
  if (code >= 400 && code <= 499) return 'rain'
  if (code >= 500 && code <= 515) return 'cloudy'
  return 'sun'
}

/**
 * 根据经纬度获取天气
 * @param {Object} options - { includeForecast: true } 可请求 3 日预报
 */
function getWeatherByCoords(lat, lng, options = {}) {
  if (!HAS_CREDENTIALS) {
    return Promise.reject(new Error('未配置天气凭据'))
  }
  const location = `${lng.toFixed(2)},${lat.toFixed(2)}`
  if (USE_CLOUD_WEATHER) {
    return callWeatherCloudFunction(location, 'coords', options)
  }
  let geoData
  const geoUrl = `${GEO_API_BASE}/v2/city/lookup`
  const weatherUrl = `${WEATHER_API_BASE}/v7/weather/now`
  return buildAuthRequest(geoUrl, { location })
    .then(opts => request(opts))
    .then(geoRes => {
      geoData = geoRes.data
      if (geoData.code !== '200' || !geoData.location || geoData.location.length === 0) {
        throw new Error(geoData.code || 'geo_fail')
      }
      return buildAuthRequest(weatherUrl, { location })
    })
    .then(opts => request(opts))
    .then(weatherRes => {
      const weather = weatherRes.data
      if (weather.code !== '200' || !weather.now) {
        throw new Error(weather.code || 'weather_fail')
      }
      const loc = geoData.location[0]
      const city = loc.adm2 || loc.name || '未知'
      const now = weather.now
      return {
        city,
        temp: String(now.temp || ''),
        weather: now.text || '晴',
        weatherIcon: iconToWeatherIcon(now.icon)
      }
    })
}

/**
 * 根据城市名获取天气
 * @param {Object} options - { includeForecast: true } 可请求 3 日预报
 */
function getWeatherByCity(cityName, options = {}) {
  if (!HAS_CREDENTIALS) {
    return Promise.reject(new Error('未配置天气凭据'))
  }
  if (USE_CLOUD_WEATHER) {
    return callWeatherCloudFunction(cityName, 'city', options)
  }
  const geoUrl = `${GEO_API_BASE}/v2/city/lookup`
  const weatherUrl = `${WEATHER_API_BASE}/v7/weather/now`
  return buildAuthRequest(geoUrl, { location: cityName })
    .then(opts => request(opts))
    .then(res => {
      const data = res.data
      if (data.code !== '200' || !data.location || data.location.length === 0) {
        throw new Error('city_not_found')
      }
      const locationId = data.location[0].id
      return buildAuthRequest(weatherUrl, { location: locationId })
    })
    .then(opts => request(opts))
    .then(res => {
      const data = res.data
      if (data.code !== '200' || !data.now) {
        throw new Error(data.code || 'weather_fail')
      }
      const now = data.now
      return {
        city: cityName,
        temp: String(now.temp || ''),
        weather: now.text || '晴',
        weatherIcon: iconToWeatherIcon(now.icon)
      }
    })
}

module.exports = {
  getWeatherByCoords,
  getWeatherByCity,
  hasApiKey: HAS_CREDENTIALS
}
