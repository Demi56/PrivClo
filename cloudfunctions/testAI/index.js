// cloudfunctions/testAI/index.js
const cloud = require('wx-server-sdk')
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV })

exports.main = async (event, context) => {
  try {
    // 检查 AI 扩展是否存在
    const ai = cloud.extend?.AI
    
    if (!ai) {
      return {
        success: false,
        error: "cloud.extend.AI 不存在",
        solution: "请检查：1.云开发基础库版本 2.是否开通AI能力"
      }
    }
    
    // 尝试创建视觉模型
    const model = ai.createModel("hunyuan-vision")
    
    if (!model) {
      return {
        success: false,
        error: "无法创建 hunyuan-vision 模型"
      }
    }
    
    // 最简单的调用测试
    const res = await model.generateText({
      messages: [
        { 
          role: "user", 
          content: "你好，请简单介绍一下自己",
          images: ["https://picsum.photos/200/300"]
        }
      ]
    })
    
    return {
      success: true,
      result: res.choices[0].message.content
    }
    
  } catch (err) {
    return {
      success: false,
      error: err.message,
      code: err.code
    }
  }
}