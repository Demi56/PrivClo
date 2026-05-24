/**
 * 穿搭卡片生成 - 混元图像模型（可选）
 * 根据穿搭分析生成可分享的 OOTD 解析卡片
 * 若图像模型不可用，返回原图 + 文本信息供前端拼卡
 */
const cloud = require('wx-server-sdk')
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV })

async function tryGenerateImage(prompt) {
  if (!cloud.extend || !cloud.extend.AI) return null
  try {
    const ai = cloud.extend.AI
    let model
    try {
      model = ai.createModel('hunyuan-image')
    } catch (_) {
      try {
        model = ai.createModel({ provider: 'hunyuan', model: 'hunyuan-image-3.0', network: 'public' })
      } catch (_2) {
        return null
      }
    }
    const result = await model.generateImage({ prompt, width: 720, height: 1280 })
    return result?.imageUrl || result?.data?.[0]?.url || null
  } catch (e) {
    console.warn('generateImage not available:', e.message)
    return null
  }
}

exports.main = async (event, context) => {
  const { outfitAnalysis, clothingItems, originalImageUrl } = event
  if (!outfitAnalysis || !clothingItems) {
    return { success: false, errMsg: '缺少 outfitAnalysis 或 clothingItems' }
  }

  const style = outfitAnalysis.style || '休闲穿搭'
  const descList = (clothingItems || []).map(i => i.description || i.name).filter(Boolean)
  const prompt = `小红书穿搭博主风格封面图：左侧模特全身OOTD，右侧展示拆解单品：${descList.slice(0, 5).join('、')}。整体风格${style}，真实摄影，有氛围感。`

  try {
    const cardImageUrl = await tryGenerateImage(prompt)
    if (cardImageUrl && typeof cardImageUrl === 'string') {
      return { success: true, cardImageUrl }
    }

    return {
      success: true,
      cardImageUrl: null,
      fallback: true,
      originalImageUrl: originalImageUrl || '',
      analysis: outfitAnalysis,
      clothingItems,
      tip: '图像生成暂不可用，请使用原图与下方单品列表分享'
    }
  } catch (err) {
    console.error('generateOutfitCard error:', err)
    return {
      success: true,
      cardImageUrl: null,
      fallback: true,
      originalImageUrl: originalImageUrl || '',
      analysis: outfitAnalysis,
      clothingItems,
      tip: '卡片生成暂不可用，请使用原图与单品列表分享'
    }
  }
}
