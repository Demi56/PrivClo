/**
 * 智能抠图云函数 - 腾讯云数据万象
 * 支持 AIPicMatting / GoodsMatting，复杂场景双引擎并行 + AI 择优
 */
const cloud = require('wx-server-sdk')
const COS = require('cos-nodejs-sdk-v5')
const { pickBestMattingResult } = require('./pickMatting.js')

cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV })

function parseFileID(fileID) {
  if (!fileID || typeof fileID !== 'string') return null
  const prefix = 'cloud://'
  if (!fileID.startsWith(prefix)) return null
  const rest = fileID.slice(prefix.length)
  const firstSlash = rest.indexOf('/')
  if (firstSlash < 0) return null
  const objectKey = rest.slice(firstSlash + 1)
  const envBucket = rest.slice(0, firstSlash)
  const dotIdx = envBucket.indexOf('.')
  const envId = dotIdx > 0 ? envBucket.slice(0, dotIdx) : ''
  const bucketId = dotIdx > 0 ? envBucket.slice(dotIdx + 1) : envBucket
  return { objectKey, envId, bucketId }
}

function buildFileID(envId, bucketId, objectKey) {
  return `cloud://${envId}.${bucketId}/${objectKey}`
}

function buildMattingRule(engine, paddingLayout, centerLayout) {
  const processName = engine === 'goods' ? 'GoodsMatting' : 'AIPicMatting'
  return `ci-process=${processName}&center-layout=${centerLayout}&padding-layout=${paddingLayout}`
}

function runImageProcess(cos, bucket, region, objectKey, outputKey, rule) {
  return new Promise((resolve) => {
    const picOperations = JSON.stringify({
      is_pic_info: 0,
      rules: [{ fileid: `/${outputKey}`, rule }]
    })
    cos.request(
      {
        Bucket: bucket,
        Region: region,
        Key: objectKey,
        Method: 'POST',
        Action: 'image_process',
        Headers: { 'Pic-Operations': picOperations }
      },
      (err) => {
        if (err) resolve({ err })
        else resolve({ outputKey })
      }
    )
  })
}

function getSignedUrl(cos, bucket, region, outputKey) {
  return new Promise((resolve) => {
    cos.getObjectUrl(
      {
        Bucket: bucket,
        Region: region,
        Key: outputKey,
        Sign: true,
        Expires: 3600,
        Protocol: 'https:'
      },
      (urlErr, urlData) => {
        resolve(urlErr || !urlData ? '' : (urlData.Url || ''))
      }
    )
  })
}

function resolveEngine(event, mattingOptions) {
  const explicit = event.engine || mattingOptions.engine
  if (explicit === 'goods' || explicit === 'general') return explicit
  const recommended = mattingOptions.recommendedEngine
  if (recommended === 'goods' || recommended === 'general') return recommended
  return 'general'
}

function resolvePreEnhance(event, mattingOptions) {
  if (event.preEnhance === true) return true
  if (event.preEnhance === false) return false
  return !!mattingOptions.preEnhance
}

/** 仅复杂场景 / 用户精修时启用双引擎 */
function shouldDualEngine(event, mattingOptions) {
  if (event.dualEngine === false) return false
  if (event.dualEngine === true) return true
  if (mattingOptions.dualEngine === true) return true
  const bg = mattingOptions.backgroundLevel
  const scene = mattingOptions.photoScene
  return bg === 'complex' || scene === 'mixed'
}

async function maybePreEnhance(cos, bucket, region, objectKey, preEnhance, ts) {
  if (!preEnhance) return { sourceKey: objectKey, preEnhanceUsed: false }
  const enhancedKey = `matting/enhanced_${ts}.jpg`
  const enhanceRule = 'ci-process=AIEnhanceImage&denoise=3&sharpen=4&ignore-error=1'
  const enhanceRes = await runImageProcess(cos, bucket, region, objectKey, enhancedKey, enhanceRule)
  if (!enhanceRes.err) {
    return { sourceKey: enhancedKey, preEnhanceUsed: true }
  }
  console.warn('preEnhance failed, fallback to original:', enhanceRes.err.message)
  return { sourceKey: objectKey, preEnhanceUsed: false }
}

async function runSingleMatting(cos, bucket, region, sourceKey, engine, paddingLayout, centerLayout, ts) {
  const outputKey = `matting/clothing_${ts}.png`
  const mattingRule = buildMattingRule(engine, paddingLayout, centerLayout)
  const mattingRes = await runImageProcess(cos, bucket, region, sourceKey, outputKey, mattingRule)
  if (mattingRes.err) {
    throw mattingRes.err
  }
  return { outputKey, engineUsed: engine }
}

async function runDualMatting(cos, bucket, region, sourceKey, paddingLayout, centerLayout, ts) {
  const goodsKey = `matting/clothing_${ts}_goods.png`
  const generalKey = `matting/clothing_${ts}_general.png`
  const goodsRule = buildMattingRule('goods', paddingLayout, centerLayout)
  const generalRule = buildMattingRule('general', paddingLayout, centerLayout)

  const [goodsRes, generalRes] = await Promise.all([
    runImageProcess(cos, bucket, region, sourceKey, goodsKey, goodsRule),
    runImageProcess(cos, bucket, region, sourceKey, generalKey, generalRule)
  ])

  const goodsOk = !goodsRes.err
  const generalOk = !generalRes.err

  if (!goodsOk && !generalOk) {
    const err = goodsRes.err || generalRes.err
    throw err || new Error('双引擎抠图均失败')
  }
  if (goodsOk && !generalOk) {
    return { outputKey: goodsKey, engineUsed: 'goods', dualEngineUsed: true, pickReason: '通用抠图失败' }
  }
  if (!goodsOk && generalOk) {
    return { outputKey: generalKey, engineUsed: 'general', dualEngineUsed: true, pickReason: '商品抠图失败' }
  }

  const [goodsUrl, generalUrl] = await Promise.all([
    getSignedUrl(cos, bucket, region, goodsKey),
    getSignedUrl(cos, bucket, region, generalKey)
  ])

  const pick = await pickBestMattingResult(goodsUrl, generalUrl)
  const engineUsed = pick.choice === 'goods' ? 'goods' : 'general'
  const outputKey = engineUsed === 'goods' ? goodsKey : generalKey

  return {
    outputKey,
    engineUsed,
    dualEngineUsed: true,
    pickReason: pick.reason || ''
  }
}

exports.main = async (event) => {
  const fileID = event.fileID
  if (!fileID || typeof fileID !== 'string') {
    return { errMsg: '缺少 fileID 参数', fileID: null }
  }

  const parsed = parseFileID(fileID)
  if (!parsed) {
    return { errMsg: 'fileID 格式无效', fileID: null }
  }

  const { objectKey, envId, bucketId } = parsed
  const secretId = process.env.COS_SECRET_ID
  const secretKey = process.env.COS_SECRET_KEY
  const bucket = process.env.COS_BUCKET || bucketId
  const region = process.env.COS_REGION

  const mattingOptions = event.mattingOptions && typeof event.mattingOptions === 'object'
    ? event.mattingOptions
    : {}
  const paddingLayout = mattingOptions.paddingLayout || '20x20'
  const centerLayout = mattingOptions.centerLayout != null ? mattingOptions.centerLayout : 1
  const preEnhance = resolvePreEnhance(event, mattingOptions)
  const dualEngine = shouldDualEngine(event, mattingOptions)

  if (!secretId || !secretKey) {
    return { errMsg: '未配置 COS_SECRET_ID 或 COS_SECRET_KEY', fileID: null }
  }
  if (!bucket || !region) {
    return { errMsg: '未配置 COS_BUCKET 或 COS_REGION', fileID: null }
  }

  const cos = new COS({ SecretId: secretId, SecretKey: secretKey })
  const ts = Date.now()

  try {
    const { sourceKey, preEnhanceUsed } = await maybePreEnhance(
      cos, bucket, region, objectKey, preEnhance, ts
    )

    let result
    if (dualEngine) {
      result = await runDualMatting(cos, bucket, region, sourceKey, paddingLayout, centerLayout, ts)
    } else {
      const engine = resolveEngine(event, mattingOptions)
      const single = await runSingleMatting(
        cos, bucket, region, sourceKey, engine, paddingLayout, centerLayout, ts
      )
      result = { ...single, dualEngineUsed: false, pickReason: '' }
    }

    const resultFileID = buildFileID(envId, bucketId, result.outputKey)
    const tempFileURL = await getSignedUrl(cos, bucket, region, result.outputKey)

    return {
      errMsg: '',
      fileID: resultFileID,
      tempFileURL,
      engineUsed: result.engineUsed,
      preEnhanceUsed,
      dualEngineUsed: !!result.dualEngineUsed,
      pickReason: result.pickReason || '',
      processName: result.engineUsed === 'goods' ? 'GoodsMatting' : 'AIPicMatting'
    }
  } catch (err) {
    console.error('matting error:', err)
    return {
      errMsg: err.message || '抠图失败',
      fileID: null,
      tempFileURL: null
    }
  }
}
