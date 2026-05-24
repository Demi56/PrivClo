// cloudfunctions/smartRecommend/index.js
const cloud = require('wx-server-sdk')
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV })

const tencentcloud = require("tencentcloud-sdk-nodejs")
const HunyuanClient = tencentcloud.hunyuan.v20230901.Client

exports.main = async (event, context) => {
  const { weatherData, occasion, stylePreferences } = event

  try {
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

    // 构建推荐提示词
    const prompt = `你是一个专业的穿搭顾问。根据以下信息生成今日穿搭推荐：
天气：${weatherData?.temperature || 22}℃，${weatherData?.condition || '晴'}
场合：${occasion || '日常'}
用户风格偏好：${stylePreferences?.join('、') || '日常休闲'}

请返回JSON格式：
{
  "style": "推荐的整体风格",
  "reason": "推荐理由",
  "top": {"name": "上衣名称", "description": "上衣描述", "reason": "选择理由"},
  "bottom": {"name": "下装名称", "description": "下装描述", "reason": "选择理由"},
  "shoes": {"name": "鞋子名称", "description": "鞋子描述", "reason": "选择理由"},
  "accessory": {"name": "配饰名称", "description": "配饰描述", "reason": "选择理由"},
  "tips": "穿搭小贴士"
}`

    // 调用混元生文模型
    const response = await client.ChatCompletions({
      Model: "hunyuan-pro",
      Messages: [
        { Role: "system", Content: "你是一个专业的穿搭顾问" },
        { Role: "user", Content: prompt }
      ],
      Temperature: 0.7
    })

    const content = response.Choices[0].Message.Content

    // 提取 JSON
    let recommendations
    try {
      const jsonMatch = content.match(/\{[\s\S]*\}/)
      if (jsonMatch) {
        recommendations = JSON.parse(jsonMatch[0])
      } else {
        recommendations = { raw: content }
      }
    } catch (e) {
      recommendations = { raw: content }
    }

    return {
      success: true,
      recommendations: recommendations,
      raw: content
    }

  } catch (err) {
    console.error('推荐失败:', err)
    return { success: false, error: err.message }
  }
}