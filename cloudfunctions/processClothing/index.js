const cloud = require('wx-server-sdk')
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV })
const axios = require('axios')

exports.main = async (event, context) => {
  console.log('processClothing 已启动')
  const { fileID, imageUrl, category, adjust = { dx: 0, dy: 0, scale: 1.0 } } = event

  try {
    // 获取原始图片 URL
    let originalUrl = imageUrl
    if (fileID && fileID.startsWith('cloud://')) {
      const tempFileRes = await cloud.getTempFileURL({ fileList: [fileID] })
      originalUrl = tempFileRes.fileList[0].tempFileURL
    }
    if (!originalUrl) {
      return { success: false, error: '请提供 fileID 或 imageUrl' }
    }

    // 下载图片并上传临时文件
    const imageResponse = await axios.get(originalUrl, { responseType: 'arraybuffer', timeout: 30000 })
    const imageBuffer = imageResponse.data
    const tempUploadRes = await cloud.uploadFile({
      cloudPath: `temp/${Date.now()}_${Math.random().toString(36).substr(2, 6)}.jpg`,
      fileContent: imageBuffer
    })

    // 调用 matting 云函数抠图
    const mattingRes = await cloud.callFunction({
      name: 'matting',
      data: { fileID: tempUploadRes.fileID }
    })
    console.log('matting 返回:', mattingRes)

    // 兼容不同返回格式
    const mattingFileID = mattingRes.result?.fileID || mattingRes.result?.data?.fileID
    if (!mattingFileID) {
      throw new Error(`抠图失败: ${mattingRes.result?.error || '无返回 fileID'}`)
    }

    // 直接使用抠图结果（不进行标准化）
    const finalFileID = mattingFileID

    // 获取临时 URL
    const tempFileRes = await cloud.getTempFileURL({ fileList: [finalFileID] })
    const processedUrl = tempFileRes.fileList[0].tempFileURL

    // 保存到数据库
    const db = cloud.database()
    const now = db.serverDate()
    const item = {
      category,
      imageUrl: finalFileID,
      adjust,
      createTime: now,
      originalImageUrl: originalUrl
    }
    const result = await db.collection('wardrobe').add({ data: item })

    return {
      success: true,
      fileID: finalFileID,
      tempFileURL: processedUrl,
      itemId: result._id
    }

  } catch (err) {
    console.error('processClothing 错误:', err)
    return { success: false, error: err.message, detail: err.stack }
  }
}