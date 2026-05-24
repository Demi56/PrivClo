const { getImageUrl } = require('../../../utils/image.js')

// 隐私协议与服务条款
const PRIVACY_SECTIONS = [
  { num: 1, title: '我们收集的信息', content: '为提供天气穿搭推荐服务，我们会收集以下信息：\n账号信息：头像、昵称、性别、年龄、风格偏好（用于个性化推荐）\n衣橱数据：您上传的衣物照片、衣物标签、分类信息（用于AI穿搭分析）\n地理位置：您的位置信息（用于获取实时天气数据）\n使用记录：穿搭日记、点赞记录、浏览历史（用于优化推荐算法）' },
  { num: 2, title: '我们如何使用信息', content: '您的信息将用于以下场景：\n核心功能实现：基于天气和衣橱数据生成AI穿搭推荐\n算法优化：您的衣物数据用于衣橱小助手的核心算法训练，以提升推荐准确性\n个性化服务：根据您的风格偏好和浏览记录，推荐更符合您喜好的穿搭方案\n用户体验改进：分析使用数据，优化产品功能和界面设计' },
  { num: 3, title: '信息共享与披露', content: '我们承诺：\n绝不售卖数据：不会将您的个人信息向第三方出售\n严格授权管理：仅在以下情况共享信息：获得您的明确授权；法律法规要求；保护用户或公众安全\n匿名化处理：用于算法训练的数据将进行脱敏处理' },
  { num: 4, title: '信息安全保护', content: '我们采用行业领先的加密技术保障您的信息安全：\n传输加密：SSL/TLS加密传输，防止数据被窃取\n存储加密：服务器数据加密存储，严格访问控制\n定期审计：定期进行安全漏洞检测和修复' },
  { num: 5, title: '您的权利', content: '您对自己的信息拥有完全控制权：\n查询/更正：可在"个人中心"查看和修改您的信息\n删除账号：通过"设置-账号管理"申请删除账号及相关数据\n撤回授权：在手机系统设置中关闭相应权限' },
  { num: 6, title: '未成年人保护', content: '若您未满14周岁，请在监护人指导下使用本服务\n我们不会在明知的情况下收集未成年人的个人信息' }
]

const TERMS_SECTIONS = [
  { num: 1, title: '服务说明', content: '衣橱小助手为您提供以下功能：\nAI天气穿搭推荐：基于天气数据和您的衣橱，生成个性化穿搭建议\n衣橱管理：上传、分类、管理您的衣物\n穿搭日记：记录每日穿搭，分享生活\n积分商城：完成任务获取积分，兑换精美礼品\n使用本服务即表示您同意遵守本协议条款。' },
  { num: 2, title: '账号管理', content: '注册义务：您应提供真实、准确、完整的注册信息\n账号安全：妥善保管账号和密码，因您保管不当造成的损失由您自行承担\n账号转让：未经允许，不得转让、出租、借用您的账号' },
  { num: 3, title: '用户责任', content: '您承诺：\n信息真实：确保所提供的信息真实、准确、有效\n合法使用：不得利用本服务从事违法违规活动\n内容合规：上传的衣物照片、穿搭日记不得包含违法违规内容\n尊重他人：不得侵犯他人知识产权、肖像权、隐私权等合法权益' },
  { num: 4, title: '知识产权', content: '应用知识产权：本小程序的代码、设计、算法等知识产权归我们所有\n用户内容：您上传的衣物照片、穿搭日记等内容的著作权归您所有\n授权使用：您授予我们在服务范围内使用您上传内容的权利（如用于算法训练）' },
  { num: 5, title: 'AI服务特别说明', content: '生成内容性质：AI穿搭推荐由人工智能模型生成，仅供您参考，不构成专业建议\n内容免责：生成内容可能存在不准确、不完整的情况，请您自行核实\nAI标识：AI生成内容已添加"✨ AI推荐"标识，请注意识别\n算法备案：本服务使用的AI模型已完成算法备案（备案编号：办理中）' },
  { num: 6, title: '积分规则', content: '积分获取：通过完成任务、邀请好友等方式获取积分\n积分使用：可在积分商城兑换商品、解锁角色等\n积分有效期：积分有效期为12个月，过期自动清零\n违规处理：如发现作弊行为，我们有权收回积分并封禁账号' },
  { num: 7, title: '服务变更与终止', content: '服务调整：我们保留根据业务发展需要调整服务内容的权利\n重大变更：涉及服务协议的重大变更，我们将通过弹窗或公告提前通知\n账号注销：您可随时申请注销账号，注销后相关数据将被删除\n违规处理：如您违反本协议，我们有权暂停或终止向您提供服务' },
  { num: 8, title: '免责条款', content: '不可抗力：因自然灾害、战争、政策变化等不可抗力导致服务中断，我们不承担责任\n第三方服务：因微信平台、运营商等第三方原因导致的服务异常，我们不承担责任\n用户行为：因您自身原因造成的损失，由您自行承担' },
  { num: 9, title: '争议解决', content: '适用法律：本协议的订立、执行和解释均适用中华人民共和国法律\n争议处理：因本协议产生的争议，双方应友好协商解决；协商不成的，可向被告所在地人民法院提起诉讼' },
  { num: 10, title: '联系我们', content: '如您对本协议有任何疑问，或发现违规内容，可通过以下方式联系我们：\n意见反馈：小程序内"设置-意见反馈"\n客服邮箱：service@privclo.com（示例邮箱）\n工作时间：工作日 9:00-18:00' }
]

Page({
  data: {
    statusBarHeight: 20,
    spriteUrl: '',
    spriteFallbackUrl: '', // 云端图 404 时回退用
    activeTab: 0,
    tabList: ['隐私政策', '用户协议'],
    privacySections: PRIVACY_SECTIONS,
    termsSections: TERMS_SECTIONS
  },

  onLoad(options) {
    try {
      const sys = wx.getSystemInfoSync()
      this.setData({ statusBarHeight: sys.statusBarHeight || 20 })
    } catch (e) {
      this.setData({ statusBarHeight: 20 })
    }
    const activeTab = options.tab === '1' ? 1 : 0
    const privacySprite = getImageUrl('/images/privacy-sprite.png')
    const fallback = getImageUrl('/images/sprite.png')
    this.setData({
      spriteUrl: privacySprite,
      spriteFallbackUrl: fallback,
      activeTab
    })
  },

  onBack() {
    wx.navigateBack()
  },

  onTabTap(e) {
    const idx = e.currentTarget.dataset.index
    if (idx !== undefined && idx !== this.data.activeTab) {
      this.setData({ activeTab: idx })
    }
  },

  onSpriteError() {
    // privacy-sprite.png 加载失败时回退到默认精灵图
    if (this.data.spriteUrl !== this.data.spriteFallbackUrl) {
      this.setData({ spriteUrl: this.data.spriteFallbackUrl })
    }
  }
})
