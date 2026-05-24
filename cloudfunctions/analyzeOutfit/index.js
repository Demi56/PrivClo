// cloudfunctions/analyzeOutfit/index.js
const cloud = require('wx-server-sdk')
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV })

const tencentcloud = require("tencentcloud-sdk-nodejs")
const HunyuanClient = tencentcloud.hunyuan.v20230901.Client

exports.main = async (event, context) => {
  const { fileID, imageUrl } = event

  try {
    // 获取图片临时 URL（如果是云存储 fileID）
    let finalImageUrl = imageUrl
    if (fileID && fileID.startsWith('cloud://')) {
      const tempFileRes = await cloud.getTempFileURL({ fileList: [fileID] })
      finalImageUrl = tempFileRes.fileList[0].tempFileURL
    }

    if (!finalImageUrl) {
      return { success: false, error: '请提供 imageUrl 或 fileID' }
    }

    // 初始化混元客户端
    const client = new HunyuanClient({
      credential: {
        secretId: process.env.TENCENT_SECRET_ID,
        secretKey: process.env.TENCENT_SECRET_KEY,
      },
      region: "ap-guangzhou",
      profile: {
        httpProfile: {
          endpoint: "hunyuan.tencentcloudapi.com",
        },
      },
    })

    // 将图片 URL 直接嵌入提示词（不使用 Images 参数）
    const prompt = `请分析这张图片中的穿搭：${finalImageUrl}\n\n要求返回JSON格式（只返回JSON）：
{
  "style": "整体风格",
  "description": "穿搭描述",
  "items": [
    { "category": "top", "description": "上衣", "color": "颜色" },
    { "category": "bottom", "description": "下装", "color": "颜色" },
    { "category": "shoes", "description": "鞋子", "color": "颜色" }
  ],
  "highlights": ["亮点1", "亮点2"],
  "suitableWeather": ["适合天气"],
  "suitableOccasion": ["适合场合"]
}`

    // 调用混元文本模型（它会尝试访问图片 URL）
    const response = await client.ChatCompletions({
      Model: "hunyuan-pro",
      Messages: [
        { Role: "user", Content: prompt }
      ],
      Temperature: 0.3
    })

    const content = response.Choices[0].Message.Content

    // 提取 JSON
    let analysis
    try {
      const jsonMatch = content.match(/\{[\s\S]*\}/)
      if (jsonMatch) {
        analysis = JSON.parse(jsonMatch[0])
      } else {
        analysis = { raw: content }
      }
    } catch (e) {
      analysis = { raw: content }
    }

    return {
      success: true,
      analysis: analysis,
      raw: content
    }

  } catch (err) {
    console.error('调用失败:', err)
    return { success: false, error: err.message }
  }
}