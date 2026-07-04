const { getImageUrl } = require('../../../utils/image.js')
const { openPrivacyPolicy, openUserAgreement } = require('../../../utils/legalPages.js')

const AI_SECTIONS = [
  {
    num: 1,
    title: '什么是 AI 服务？',
    content: '衣橱管家提供以下由生成式人工智能或相关 AI 技术支持的功能：\n\n天气穿搭推荐：结合实时天气、您的衣橱单品与风格偏好，生成搭配方案（smartRecommend）。\n精灵小管家对话：以对话方式回答穿搭咨询，可读取天气、衣橱与偏好上下文（chatWithAssistant）。\n街拍转穿搭：上传街拍图片，AI 识别穿搭风格与单品信息（analyzeOutfit）。\n穿搭卡片生成：在支持时，基于分析结果生成可分享的 OOTD 卡片（generateOutfitCard）。\n\n说明：衣物智能抠图属于图像处理服务（腾讯云数据万象），不属于生成式 AI，但会处理您上传的衣物图片。'
  },
  {
    num: 2,
    title: 'AI 服务特性',
    content: '生成原理：AI 模型通过学习大量穿搭规律与时尚知识，结合您提供的上下文实时生成结果，非固定模板。\n内容性质：所有 AI 输出仅供参考，不构成专业建议；可能存在不准确、不完整或与您的预期不符的情况，请您自行核实，尤其在重要场合、极端天气或特殊需求场景下。\n人工审核：我们会对产品规则与用户反馈进行持续优化，但无法保证每一条 AI 输出均经过人工审核。'
  },
  {
    num: 3,
    title: '数据处理与模型训练',
    content: '为向您提供 AI 服务，我们可能向腾讯混元等模型服务传输：天气摘要、衣橱标签/描述、风格与偏好、对话消息、图片 URL 等必要信息。\n\n聊天记录默认保存在您的设备本地，用于连续对话体验；您可通过清除对话历史删除本地记录。\n\n在符合法律法规及《隐私政策》的前提下，经去标识化或匿名化处理后的偏好、标签、对话反馈等数据，可能用于衣橱管家相关算法的优化与模型训练，以提升推荐准确性。您注销账号后，我们将停止对该账号新增数据的训练使用。\n\n详细个人信息处理规则见《隐私政策》。'
  },
  {
    num: 4,
    title: 'AI 生成内容的局限性',
    content: 'AI 输出可能出现：\n事实性错误：如品牌、价格、尺码、面料等信息不准确；\n风格偏差：未能准确理解您的偏好或场合需求；\n天气误判：极端或突变天气下推荐可能不够合适；\n文化/礼仪差异：对特定场合着装要求的理解存在局限；\n不适用场景：专业造型、医疗、法律、劳动安全等对准确性要求极高的场景。\n\n请勿将 AI 建议作为唯一决策依据。'
  },
  {
    num: 5,
    title: 'AI 标识说明',
    content: '为便于您识别 AI 内容，产品在以下位置进行标识：\n\n穿搭推荐卡片底部：「✨ AI推荐 · 仅供参考」\n精灵小管家对话：助手消息旁标注 AI 生成提示\n街拍/试穿等保存或分享图片：添加「AI生成」水印\n由 AI 辅助写入日记的详情页：顶部标注「AI辅助生成」\n\n若您发现未正确标识的 AI 内容，请通过意见反馈告知我们。'
  },
  {
    num: 6,
    title: '算法备案信息',
    content: '算法名称：衣橱管家穿搭推荐算法\n备案状态：办理中\n备案编号：待公示\n\n备案完成后，我们将在此页面更新真实备案编号。您也可前往「互联网信息服务算法备案系统」官网查询公开信息。'
  },
  {
    num: 7,
    title: '用户责任与义务',
    content: '您应合法、正当使用 AI 服务，不得：\n利用 AI 生成、传播违法违规内容；\n将 AI 生成内容冒充为完全人工创作以误导他人；\n上传侵害他人肖像权、隐私权、知识产权的图片或信息；\n绕过产品限制进行恶意调用或滥用。\n\n您应对基于 AI 输出所做出的决定自行负责，并建议在分享前进行必要审核。'
  },
  {
    num: 8,
    title: '反馈与投诉渠道',
    content: '如您对 AI 服务有疑问、发现不当内容或认为权益受到侵害，可通过以下方式联系我们：\n\n意见反馈：小程序内「设置 → 意见反馈」\n精灵对话反馈：对助手回复使用 👍 / 👎\n客服邮箱：service@privclo.com\n工作时间：工作日 9:00-18:00\n\n我们将在合理期限内处理您的反馈。'
  },
  {
    num: 9,
    title: '常见问题',
    content: 'Q1：AI 推荐会消耗流量吗？\nA：会。获取天气、调用云函数与加载 AI 结果均需要网络流量，建议在 WiFi 环境下使用。\n\nQ2：可以不使用 AI 功能吗？\nA：可以。您可仅使用衣橱管理、日记记录等非 AI 功能，不主动触发推荐、对话或街拍分析即可。\n\nQ3：AI 会保存我的数据吗？\nA：会按《隐私政策》保存提供服务所必需的数据；聊天历史默认存于本地，衣橱与偏好等按隐私政策处理，并可能用于模型优化与训练。\n\nQ4：推荐不准怎么办？\nA：请完善「穿搭偏好」与衣橱单品，并通过意见反馈或对话 👎 告诉我们，我们将持续优化。\n\nQ5：如何清除 AI 对话记录？\nA：在精灵小管家面板中清除本地聊天记录；注销账号可删除与该账号关联的数据。'
  },
  {
    num: 10,
    title: '相关文档',
    content: '《隐私政策》：说明个人信息收集、使用、存储与您的权利。\n《用户协议》：说明服务规则、账号管理、积分与免责条款。\n\n您可在本页通过下方入口跳转阅读；登录页亦提供相同文档链接。'
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
    const fallback = getImageUrl('/images/sprite.webp')
    this.setData({
      spriteUrl: privacySprite,
      spriteFallbackUrl: fallback
    })
  },

  goBack() {
    wx.navigateBack()
  },

  onOpenPrivacy() {
    openPrivacyPolicy()
  },

  onOpenTerms() {
    openUserAgreement()
  },

  onSpriteError() {
    if (this.data.spriteUrl !== this.data.spriteFallbackUrl) {
      this.setData({ spriteUrl: this.data.spriteFallbackUrl })
    }
  }
})
