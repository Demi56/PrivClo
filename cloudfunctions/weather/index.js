/**
 * 天气云函数 - 和风天气 API
 * 1. 生成 JWT Token（15 分钟有效）
 * 2. 调用和风天气 API 获取实时天气
 * 3. 返回格式化数据给前端
 */
const cloud = require('wx-server-sdk')
const zlib = require('zlib')
const { SignJWT, importPKCS8 } = require('jose')
const { API_HOST, PROJECT_ID, KEY_ID, PRIVATE_KEY } = require('./config.js')

cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV })

function iconToWeatherIcon(icon) {
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

/** 解析和风天气响应体（可能为 gzip，且部分环境下 Content-Encoding 不可靠） */
function parseQWeatherJson(buffer, encoding) {
  if (!buffer || !buffer.length) {
    throw new Error('和风天气返回空响应')
  }

  const enc = String(encoding || '').toLowerCase()
  const tryParse = (text) => {
    const trimmed = String(text || '').trim()
    if (!trimmed) throw new Error('和风天气返回空内容')
    return JSON.parse(trimmed)
  }

  const tryGunzip = () => {
    const text = zlib.gunzipSync(buffer).toString('utf8')
    return tryParse(text)
  }

  // 已是 JSON 文本（部分运行时会自动解压但仍保留 gzip 头字段）
  const asText = buffer.toString('utf8')
  if (asText.trim().startsWith('{') || asText.trim().startsWith('[')) {
    return tryParse(asText)
  }

  // gzip 魔数 0x1f 0x8b
  if (buffer.length >= 2 && buffer[0] === 0x1f && buffer[1] === 0x8b) {
    return tryGunzip()
  }

  if (enc.includes('gzip')) {
    return tryGunzip()
  }
  if (enc.includes('deflate')) {
    return tryParse(zlib.inflateSync(buffer).toString('utf8'))
  }
  if (enc.includes('br')) {
    return tryParse(zlib.brotliDecompressSync(buffer).toString('utf8'))
  }

  // 兜底：先按 utf8 解析，失败再尝试 gunzip
  try {
    return tryParse(asText)
  } catch (e) {
    return tryGunzip()
  }
}

/** 调用和风天气 API（JWT 专用 API Host） */
function callQWeather(path, params, token) {
  const base = String(API_HOST || '').replace(/\/+$/, '')
  const pathname = path.startsWith('/') ? path : `/${path}`
  const qs = new URLSearchParams(params).toString()
  const url = `${base}${pathname}${qs ? `?${qs}` : ''}`
  let parsed
  try {
    parsed = new URL(url)
  } catch (e) {
    return Promise.reject(new Error(`Invalid URL: ${url}`))
  }
  return new Promise((resolve, reject) => {
    const https = require('https')
    const req = https.request({
      protocol: parsed.protocol,
      hostname: parsed.hostname,
      port: parsed.port || 443,
      path: parsed.pathname + parsed.search,
      method: 'GET',
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: 'application/json'
      }
    }, res => {
      const chunks = []
      res.on('data', chunk => { chunks.push(chunk) })
      res.on('end', () => {
        const buffer = Buffer.concat(chunks)
        try {
          const data = parseQWeatherJson(buffer, res.headers['content-encoding'])
          if (data.code !== '200') {
            const detail = [data.code, data.message || data.refer || ''].filter(Boolean).join(':')
            reject(new Error(detail || 'api_error'))
          } else {
            resolve(data)
          }
        } catch (e) {
          const head = bufferHeadHex(buffer)
          console.error('[weather] parse failed:', e.message, 'encoding:', res.headers['content-encoding'], 'head:', head)
          reject(new Error('解析天气响应失败，请重新部署 weather 云函数（gzip-v3）'))
        }
      })
    })
    req.on('error', reject)
    req.end()
  })
}

function bufferHeadHex(buffer) {
  if (!buffer || !buffer.length) return ''
  return Array.from(buffer.slice(0, 4)).map(b => b.toString(16).padStart(2, '0')).join(' ')
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
      // 经纬度：先查城市，再用 LocationID 查天气（比直接传坐标更稳定）
      const geo = await callQWeather('/geo/v2/city/lookup', { location: loc }, token)
      if (!geo.location || geo.location.length === 0) {
        return { errMsg: '未找到该位置对应的城市' }
      }
      const geoItem = geo.location[0]
      city = geoItem.adm2 || geoItem.name || '未知'
      locationId = geoItem.id || loc
    } else {
      // 城市名：先查 locationId
      const geo = await callQWeather('/geo/v2/city/lookup', { location: loc }, token)
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
      iconCode: String(now.icon || '100'),
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

    return { errMsg: '', data: result, _deploy: 'gzip-v3' }
  } catch (e) {
    console.error('weather cloud function error:', e)
    return {
      errMsg: e.message || '获取天气失败',
      data: null
    }
  }
}
