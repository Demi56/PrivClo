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
const { iconToWeatherEffect } = require('../utils/weatherEffect.js')
const geoResolve = require('../utils/geoResolve.js')

function request(options) {
  return new Promise((resolve, reject) => {
    wx.request({
      ...options,
      success: res => resolve(res),
      fail: err => reject(err)
    })
  })
}

var WEATHER_LOG_TAG = '[weather]'

function logWeatherFail(stage, err, extra) {
  var payload = { stage: stage, err: err }
  if (extra) payload.extra = extra
  console.error(WEATHER_LOG_TAG, 'fail:', payload)
  if (err && err.message) {
    console.error(WEATHER_LOG_TAG, 'message:', err.message)
  }
  if (err && err.errMsg) {
    console.error(WEATHER_LOG_TAG, 'errMsg:', err.errMsg)
  }
}

function formatErrorToast(err) {
  var msg = (err && err.message) ? String(err.message) : ''
  if (/WEATHER_PRIVATE_KEY|私钥/.test(msg)) {
    return '天气服务未配置私钥，请联系开发者'
  }
  if (/请开通云开发|cloud\.callFunction|FUNCTION_NOT_FOUND|-501000/.test(msg)) {
    return '云开发未就绪，请检查环境是否到期'
  }
  if (/401|403|未授权|unauthorized/i.test(msg)) {
    return '天气 API 授权失败，请检查密钥'
  }
  if (/402|超过|quota|limit/i.test(msg)) {
    return '天气 API 调用次数已用尽'
  }
  if (msg && msg.length <= 24) return msg
  return '天气获取失败，已使用估算天气'
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
    if (options.latitude != null && options.longitude != null) {
      data.latitude = Number(options.latitude)
      data.longitude = Number(options.longitude)
    }
    console.log(WEATHER_LOG_TAG, 'callFunction:', data)
    wx.cloud.callFunction({
      name: 'weather',
      data
    }).then(res => {
      const result = res.result || {}
      const errMsg = result.errMsg ? String(result.errMsg).trim() : ''
      if (errMsg) {
        const err = new Error(errMsg)
        logWeatherFail('cloud_result', err, { result: result })
        reject(err)
      } else if (result.data) {
        if (result._deploy) {
          console.log(WEATHER_LOG_TAG, 'cloud deploy:', result._deploy)
        }
        console.log(WEATHER_LOG_TAG, 'success:', result.data)
        resolve(result.data)
      } else {
        const err = new Error('天气数据异常')
        logWeatherFail('cloud_result_empty', err, { result: result })
        reject(err)
      }
    }).catch(err => {
      logWeatherFail('cloud_call', err, { location: data.location })
      reject(err)
    })
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
  return iconToWeatherEffect(icon)
}

/**
 * 根据经纬度获取天气
 * @param {Object} options - { includeForecast: true } 可请求 3 日预报
 */
function getWeatherByCoords(lat, lng, options = {}) {
  if (!HAS_CREDENTIALS) {
    return Promise.reject(new Error('未配置天气凭据'))
  }
  const location = geoResolve.formatCoordLocation(lat, lng)
  if (USE_CLOUD_WEATHER) {
    return callWeatherCloudFunction(location, 'coords', {
      ...options,
      latitude: lat,
      longitude: lng
    })
  }
  let geoData
  const geoUrl = `${GEO_API_BASE}/v2/city/lookup`
  const weatherUrl = `${WEATHER_API_BASE}/v7/weather/now`
  return buildAuthRequest(geoUrl, { location, number: 5 })
    .then(opts => request(opts))
    .then(geoRes => {
      geoData = geoRes.data
      if (geoData.code !== '200' || !geoData.location || geoData.location.length === 0) {
        throw new Error(geoData.code || 'geo_fail')
      }
      const loc = geoResolve.pickBestGeoLocation(geoData.location, lat, lng)
      return buildAuthRequest(weatherUrl, { location: loc.id || location })
    })
    .then(opts => request(opts))
    .then(weatherRes => {
      const weather = weatherRes.data
      if (weather.code !== '200' || !weather.now) {
        throw new Error(weather.code || 'weather_fail')
      }
      const loc = geoResolve.pickBestGeoLocation(geoData.location, lat, lng)
      const city = geoResolve.resolveCityDisplayName(loc)
      const now = weather.now
      return {
        city,
        temp: String(now.temp || ''),
        weather: now.text || '晴',
        iconCode: String(now.icon || '100'),
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
  return buildAuthRequest(geoUrl, { location: cityName, number: 5 })
    .then(opts => request(opts))
    .then(res => {
      const data = res.data
      if (data.code !== '200' || !data.location || data.location.length === 0) {
        throw new Error('city_not_found')
      }
      const geoLoc = data.location[0]
      const resolvedCity = geoResolve.resolveCityDisplayName(geoLoc) || cityName
      return buildAuthRequest(weatherUrl, { location: geoLoc.id })
        .then(opts => request(opts))
        .then(weatherRes => {
          const weather = weatherRes.data
          if (weather.code !== '200' || !weather.now) {
            throw new Error(weather.code || 'weather_fail')
          }
          const now = weather.now
          return {
            city: resolvedCity,
            temp: String(now.temp || ''),
            weather: now.text || '晴',
            iconCode: String(now.icon || '100'),
            weatherIcon: iconToWeatherIcon(now.icon)
          }
        })
    })
}

module.exports = {
  getWeatherByCoords,
  getWeatherByCity,
  hasApiKey: HAS_CREDENTIALS,
  formatErrorToast
}
