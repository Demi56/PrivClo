/**
 * 衣物 AI 识别 - 混元视觉模型识别类型/品类，并返回抠图优化参数
 */
const cloud = require('wx-server-sdk')
const { resolveClassification, getMattingOptions, buildTaxonomyPromptText } = require('./taxonomy.js')
const { callVisionAI } = require('./visionAi.js')

cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV })

function buildClassifyPrompt() {
  const taxonomy = buildTaxonomyPromptText()
  return `你是专业服装识别助手。请观察图片中的主要衣物单品（若有多件，选最清晰、占比最大的一件）。

${taxonomy}

同时判断拍摄场景与背景复杂度：
- photoScene: flat_lay|hanging|worn|mixed
- backgroundLevel: clean|moderate|complex
- mattingEngine: goods|general

重要：typeId 和 categoryId 必须使用上面列表中的英文 id，不要用中文。
只返回 JSON，不要 markdown，不要解释：
{"typeId":"","typeName":"","categoryId":"","categoryName":"","confidence":0.9,"summary":"","photoScene":"","backgroundLevel":"","mattingEngine":""}`
}

async function getImageUrl(fileID, imageUrl) {
  if (imageUrl) return imageUrl
  if (!fileID || !fileID.startsWith('cloud://')) return ''
  const tempRes = await cloud.getTempFileURL({ fileList: [fileID] })
  const item = tempRes.fileList && tempRes.fileList[0]
  if (!item || item.status !== 0 || !item.tempFileURL) {
    throw new Error((item && item.errMsg) || '无法获取图片临时链接')
  }
  return item.tempFileURL
}

exports.main = async (event) => {
  const fileID = event && event.fileID
  if (!fileID || typeof fileID !== 'string') {
    return { success: false, errMsg: '缺少 fileID' }
  }

  try {
    const imageUrl = await getImageUrl(fileID, event.imageUrl)
    if (!imageUrl) {
      return { success: false, errMsg: '无法获取图片地址' }
    }

    const prompt = buildClassifyPrompt()
    const vision = await callVisionAI(imageUrl, prompt)
    const raw = vision.parsed
    if (!raw) {
      return { success: false, errMsg: 'AI 未能解析识别结果', rawText: vision.rawText || '' }
    }

    const resolved = resolveClassification(raw)
    if (!resolved) {
      return {
        success: false,
        errMsg: '识别结果与分类库不匹配',
        raw,
        rawText: vision.rawText || ''
      }
    }

    const sceneInfo = {
      photoScene: raw.photoScene,
      backgroundLevel: raw.backgroundLevel,
      mattingEngine: raw.mattingEngine
    }
    const mattingOptions = getMattingOptions(resolved.typeId, sceneInfo)

    return {
      success: true,
      classification: {
        ...resolved,
        photoScene: mattingOptions.photoScene,
        backgroundLevel: mattingOptions.backgroundLevel
      },
      mattingOptions,
      raw,
      modelUsed: vision.model
    }
  } catch (err) {
    console.error('classifyClothing error:', err)
    return {
      success: false,
      errMsg: err.message || 'AI 识别失败'
    }
  }
}
