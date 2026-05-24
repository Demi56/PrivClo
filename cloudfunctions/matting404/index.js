/**
 * 智能抠图云函数 - 调用腾讯云数据万象 GoodsMatting 商品抠图 API
 * 接收图片 fileID，返回抠图后的图片 fileID
 *
 * 环境变量（云开发控制台配置）：
 * - COS_SECRET_ID
 * - COS_SECRET_KEY
 * - COS_BUCKET  格式：bucketname-appid，如 example-1250000000
 * - COS_REGION  如 ap-guangzhou
 */
const cloud = require('wx-server-sdk')
const COS = require('cos-nodejs-sdk-v5')

cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV })

/**
 * 从微信云存储 fileID 解析出 objectKey
 * fileID 格式: cloud://envId.bucketId/objectKey
 */
function parseFileID(fileID) {
  if (!fileID || typeof fileID !== 'string') return null
  const prefix = 'cloud://'
  if (!fileID.startsWith(prefix)) return null
  const rest = fileID.slice(prefix.length)
  const firstSlash = rest.indexOf('/')
  if (firstSlash < 0) return null
  const objectKey = rest.slice(firstSlash + 1)
  const envBucket = rest.slice(0, firstSlash) // envId.bucketId
  const dotIdx = envBucket.indexOf('.')
  const envId = dotIdx > 0 ? envBucket.slice(0, dotIdx) : ''
  const bucketId = dotIdx > 0 ? envBucket.slice(dotIdx + 1) : envBucket
  return { objectKey, envId, bucketId }
}

/**
 * 构造微信云存储 fileID
 */
function buildFileID(envId, bucketId, objectKey) {
  return `cloud://${envId}.${bucketId}/${objectKey}`
}

exports.main = async (event, context) => {
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

  if (!secretId || !secretKey) {
    return { errMsg: '未配置 COS_SECRET_ID 或 COS_SECRET_KEY', fileID: null }
  }
  if (!bucket || !region) {
    return { errMsg: '未配置 COS_BUCKET 或 COS_REGION', fileID: null }
  }

  // 输出路径：matting/ 目录下，原文件名 + _matting.png
  const baseName = objectKey.replace(/\.[^.]+$/, '') || 'image'
  const outputKey = `matting/${baseName}_${Date.now()}.png`

  const cos = new COS({
    SecretId: secretId,
    SecretKey: secretKey
  })

  const picOperations = JSON.stringify({
    is_pic_info: 0,
    rules: [{
      fileid: outputKey,
      rule: 'ci-process=GoodsMatting&center-layout=1&padding-layout=20x20'
    }]
  })

  return new Promise((resolve) => {
    cos.request(
      {
        Bucket: bucket,
        Region: region,
        Key: objectKey,
        Method: 'POST',
        Action: 'image_process',
        Headers: {
          'Pic-Operations': picOperations
        }
      },
      (err) => {
        if (err) {
          console.error('matting error:', err)
          resolve({
            errMsg: err.message || '抠图失败',
            fileID: null
          })
          return
        }
        // 成功时，结果已保存到我们指定的 outputKey
        const resultFileID = buildFileID(envId, bucketId, outputKey)
        resolve({ errMsg: '', fileID: resultFileID })
      }
    )
  })
}
