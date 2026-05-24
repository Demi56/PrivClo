const { getImageUrl } = require('../../../utils/image.js')

// AI服务说明 - 沿用隐私协议章节格式
const AI_SECTIONS = [
  {
    num: 1,
    title: '什么是AI穿搭推荐？',
    content: '本小程序的AI穿搭推荐功能，基于生成式人工智能技术，根据以下信息实时生成个性化穿搭方案：\n实时天气：推荐适合当前气候的衣物\n您的衣橱数据：从您已有的衣物中搭配组合\n您的风格偏好：匹配您喜欢的穿搭风格\n历史穿搭记录：学习您的穿着习惯'
  },
  {
    num: 2,
    title: 'AI服务特性说明',
    content: '生成原理：AI模型通过海量穿搭数据训练而成，学习衣物搭配规律和时尚原则。每次生成都是实时计算的结果，非预设模板。\n内容性质：仅供参考，不构成专业建议；可能存在不准确、不完整的情况；需自行核实，特别是涉及特殊场合时。'
  },
  {
    num: 3,
    title: 'AI生成内容的局限性',
    content: '事实性错误：涉及品牌、价格、时效性信息时可能出错\n风格偏差：对您偏好的理解可能存在误差\n天气误判：极端天气下的推荐可能不够精准\n文化差异：对特定场合的着装理解可能不足\n不适用场景：专业领域、重大场合、健康相关、法律法规要求等'
  },
  {
    num: 4,
    title: 'AI标识说明',
    content: '穿搭推荐卡片底部：显示「✨ AI推荐 · 仅供参考」\n分享图片：添加「AI生成」水印\n日记详情页：顶部标注「AI辅助生成」'
  },
  {
    num: 5,
    title: '算法备案信息',
    content: '算法名称：衣橱小助手穿搭推荐算法\n备案编号：网信算备XXXXXXXXXXXX号\n备案状态：办理中\n可前往「互联网信息服务算法备案系统」官网查询备案信息'
  },
  {
    num: 6,
    title: '用户责任与义务',
    content: '不得利用AI服务生成、传播违法违规内容\n不得将AI生成内容冒充为自然内容\n您应对使用AI生成的内容进行审核\n发现不当内容请及时反馈'
  },
  {
    num: 7,
    title: '反馈与投诉渠道',
    content: '意见反馈：小程序内「设置-意见反馈」，24h响应\n客服邮箱：service@example.com\n如您对本服务有任何疑问，可通过以上方式联系我们'
  },
  {
    num: 8,
    title: '常见问题',
    content: 'Q1：AI推荐会消耗我的流量吗？\nA：会使用少量流量获取天气数据和加载推荐结果，建议在WiFi环境下使用。\n\nQ2：可以关闭AI推荐功能吗？\nA：可以。您可选择不使用穿搭推荐功能，或仅使用衣橱管理、穿搭日记等非AI功能。\n\nQ3：AI会保存我的穿搭数据吗？\nA：我们会根据隐私政策存储必要的衣橱和穿搭数据以提供服务，您可随时在设置中申请删除。\n\nQ4：推荐不准怎么办？\nA：可通过意见反馈告诉我们，我们会持续优化算法。您也可以多完善衣橱数据和风格偏好以提升推荐准确性。'
  }
]

Page({
  data: {
    statusBarHeight: 20,
    spriteUrl: '',
    spriteFallbackUrl: '',
    sections: AI_SECTIONS
  },

  onLoad() {
    try {
      const sys = wx.getSystemInfoSync()
      this.setData({ statusBarHeight: sys.statusBarHeight || 20 })
    } catch (e) {
      this.setData({ statusBarHeight: 20 })
    }
    const privacySprite = getImageUrl('/images/privacy-sprite.png')
    const fallback = getImageUrl('/images/sprite.png')
    this.setData({
      spriteUrl: privacySprite,
      spriteFallbackUrl: fallback
    })
  },

  goBack() {
    wx.navigateBack()
  },

  onSpriteError() {
    if (this.data.spriteUrl !== this.data.spriteFallbackUrl) {
      this.setData({ spriteUrl: this.data.spriteFallbackUrl })
    }
  }
})
