// cloudfunctions/testVision/index.js
const cloud = require('wx-server-sdk')
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV })

exports.main = async (event, context) => {
  try {
    const ai = cloud.extend.AI
    
    // 尝试创建视觉模型
    const visionModel = ai.createModel("hunyuan-vision")
    
    // 用一张公开测试图片进行验证
    const testImageUrl = "https://picsum.photos/300/400"
    
    const res = await visionModel.generateText({
      messages: [
        { 
          role: "user", 
          content: "请用一句话描述这张图片中的主要内容",
          images: [testImageUrl]
        }
      ]
    })
    
    return {
      success: true,
      message: "混元视觉模型调用成功！",
      result: res.choices[0].message.content
    }
    
  } catch (err) {
    console.error('测试失败', err)
    return {
      success: false,
      error: err.message,
      suggestion: "请检查：1.混元视觉是否已开通 2.云函数权限配置"
    }
  }
}