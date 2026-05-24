/**
 * 天气云函数 - 和风天气 API
 * 1. 生成 JWT Token（15 分钟有效）
 * 2. 调用和风天气 API 获取实时天气
 * 3. 返回格式化数据给前端
 */
const cloud = require('wx-server-sdk')
const { SignJWT, importPKCS8 } = require('jose')
const { API_HOST, PROJECT_ID, KEY_ID, PRIVATE_KEY } = require('./config.js')

cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV })

// 和风天气 icon -> 小程序天气图标
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

/** 生成 JWT Token，有效期 15 分钟 */
async function generateJwt() {
  const privateKey = await importPKCS8(PRIVATE_KEY, 'EdDSA')
  const iat = Math.floor(Date.now() / 1000) - 30
  const exp = iat + 900 // 15 分钟
  const token = await new SignJWT({ sub: PROJECT_ID, iat, exp })
    .setProtectedHeader({ alg: 'EdDSA', kid: KEY_ID })
    .sign(privateKey)
  return token
}

/** 调用和风天气 API */
function callQWeather(path, params, token) {
  const qs = new URLSearchParams(params).toString()
  const url = `${API_HOST}${path}?${qs}`
  return new Promise((resolve, reject) => {
    const https = require('https')
    const req = https.get(url, {
      headers: { Authorization: `Bearer ${token}` }
    }, res => {
      let body = ''
      res.setEncoding('utf8')
      res.on('data', chunk => { body += chunk })
      res.on('end', () => {
        try {
          const data = JSON.parse(body)
          if (data.code !== '200') {
            reject(new Error(data.code || 'api_error'))
          } else {
            resolve(data)
          }
        } catch (e) {
          reject(e)
        }
      })
    })
    req.on('error', reject)
  })
}

exports.main = async (event, context) => {
  if (!PRIVATE_KEY || !PRIVATE_KEY.includes('BEGIN')) {
    return { errMsg: '请在云开发控制台配置环境变量 WEATHER_PRIVATE_KEY（Ed25519 私钥完整内容）' }
  }
  const { type, location } = event
  // type: 'coords' | 'city'  location: "116.41,39.92" 或 "北京"
  if (!location || typeof location !== 'string') {
    return { errMsg: '缺少 location 参数' }
  }
  const loc = location.trim()
  if (!loc) {
    return { errMsg: 'location 不能为空' }
  }

  try {
    const token = await generateJwt()
    const isCoords = /^-?\d+(\.\d+)?,-?\d+(\.\d+)?$/.test(loc)

    let city = ''
    let locationId = loc

    if (isCoords || type === 'coords') {
      // 经纬度：先查城市，再查天气
      const geo = await callQWeather('/v2/city/lookup', { location: loc }, token)
      if (!geo.location || geo.location.length === 0) {
        return { errMsg: '未找到该位置对应的城市' }
      }
      city = geo.location[0].adm2 || geo.location[0].name || '未知'
      locationId = loc
    } else {
      // 城市名：先查 locationId
      const geo = await callQWeather('/v2/city/lookup', { location: loc }, token)
      if (!geo.location || geo.location.length === 0) {
        return { errMsg: '未找到该城市' }
      }
      city = geo.location[0].name || loc
      locationId = geo.location[0].id
    }

    const weather = await callQWeather('/v7/weather/now', { location: locationId }, token)
    const now = weather.now
    if (!now) {
      return { errMsg: '天气数据异常' }
    }

    const result = {
      city,
      temp: String(now.temp || ''),
      weather: now.text || '晴',
      weatherIcon: iconToWeatherIcon(now.icon),
      humidity: now.humidity || '',
      windSpeed: now.windSpeed || '',
      windDir: now.windDir || '',
      feelsLike: now.feelsLike || ''
    }

    if (event.includeForecast) {
      try {
        const forecastRes = await callQWeather('/v7/weather/3d', { location: locationId }, token)
        if (forecastRes.daily && Array.isArray(forecastRes.daily)) {
          result.forecast = forecastRes.daily.slice(0, 3).map(d => ({
            date: d.fxDate,
            textDay: d.textDay || '晴',
            tempMax: d.tempMax,
            tempMin: d.tempMin,
            uvIndex: d.uvIndex || ''
          }))
        }
      } catch (e) {
        console.warn('forecast fetch failed', e)
      }
    }

    return { errMsg: '', data: result }
  } catch (e) {
    console.error('weather cloud function error:', e)
    return {
      errMsg: e.message || '获取天气失败',
      data: null
    }
  }
}
