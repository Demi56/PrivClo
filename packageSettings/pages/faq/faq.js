const { getImageUrl } = require('../../../utils/image.js')
const { openPrivacyPolicy, openUserAgreement } = require('../../../utils/legalPages.js')

const FAQ_CATEGORIES = [
  { id: 'all', name: '全部' },
  { id: 'wardrobe', name: '衣橱' },
  { id: 'outfit', name: '穿搭' },
  { id: 'account', name: '账号' }
]

const FAQ_LIST = [
  {
    id: 'w1',
    category: 'wardrobe',
    question: '如何添加衣物到衣橱？',
    answer: '进入「衣橱」页，选择扫描录入按钮后，可以通过拍照或者相册选图进行添加。衣橱单品框支持自定义编辑分类标签以及拖拽排序。'
  },
  {
    id: 'w2',
    category: 'wardrobe',
    question: '闲置区和收藏区有什么区别？',
    answer: '「闲置区」展示的是用户长期未穿搭的闲置衣物，支持统计管理与闲置转手；「收藏区」存放你收藏的心仪穿搭，可一键进入试穿页面复现搭配。'
  },
  {
    id: 'w3',
    category: 'wardrobe',
    question: '衣物图片上传失败怎么办？',
    answer: '请检查网络是否稳定，并确认已授权相册/相机权限。若图片过大，建议先裁剪压缩后再上传；仍失败可尝试切换网络后重试。'
  },
  {
    id: 'o1',
    category: 'outfit',
    question: 'AI 穿搭推荐是如何工作的？',
    answer: '衣橱管家会结合实时天气、你的衣橱单品、风格偏好与历史记录，由腾讯混元等 AI 模型生成穿搭建议。推荐结果会标注「✨ AI推荐 · 仅供参考」，不构成专业建议。'
  },
  {
    id: 'o2',
    category: 'outfit',
    question: '推荐结果不准确怎么办？',
    answer: '可在「角色管理 → 穿搭偏好」完善不喜欢/喜欢的单品与风格标签；多录入衣橱单品、保持信息录入中的身高体重等数据更新，有助于提升推荐准确度。'
  },
  {
    id: 'o3',
    category: 'outfit',
    question: '如何收藏并试穿喜欢的穿搭？',
    answer: '在推荐或试穿页面将心仪搭配加入收藏区，随后进入衣橱「收藏区」即可查看，并支持再次试穿与调整单品组合。'
  },
  {
    id: 'o4',
    category: 'outfit',
    question: '穿搭日记怎么记录？',
    answer: '进入「日记」页打开日记本，选择日期即可撰写文字、添加照片与贴纸。日记内容保存在本地，可随时翻页查看与编辑。'
  },
  {
    id: 'o5',
    category: 'outfit',
    question: '需要开启定位才能获取天气吗？',
    answer: '首页与推荐功能需要位置信息以获取当地天气。你可在手机系统设置中管理定位授权；未授权时部分天气相关推荐可能无法使用。'
  },
  {
    id: 'a1',
    category: 'account',
    question: '游客模式和登录有什么区别？',
    answer: '游客模式下可浏览与体验大部分功能，但保存日记、收藏穿搭等操作需先完成微信授权登录。登录后数据会与账号关联，换机后更易恢复。'
  },
  {
    id: 'a2',
    category: 'account',
    question: '如何修改昵称、头像与手机号？',
    answer: '前往「我的 → 更多设置 → 账号与安全」，可修改头像与昵称，并完成手机号绑定、更换或解绑。'
  },
  {
    id: 'a3',
    category: 'account',
    question: '积分有什么用？如何获取？',
    answer: '积分可在积分商城兑换主题、道具等福利。通过完成任务、邀请好友、每日签到等方式获取，具体规则以积分中心页面说明为准。'
  },
  {
    id: 'a4',
    category: 'account',
    question: '如何关闭消息通知？',
    answer: '进入「更多设置 → 通知设置」，可关闭总开关或单独管理穿搭推荐、天气提醒、日记打卡等通知类型。'
  },
  {
    id: 'a5',
    category: 'account',
    question: '如何注销账号？',
    answer: '在「设置 → 账号与安全」页面底部选择「注销账号」，按提示确认后我们将删除与你账号相关的数据。注销后无法恢复，请谨慎操作。'
  },
  {
    id: 'a6',
    category: 'account',
    question: '我的数据会用于 AI 训练吗？',
    answer: '在符合法律法规及《隐私政策》的前提下，经去标识化或匿名化处理后的偏好、标签、对话反馈等数据，可能用于衣橱管家相关算法的优化与模型训练。您可通过注销账号终止后续新增数据的训练使用。详见「设置 → AI 服务说明」。'
  },
  {
    id: 'a7',
    category: 'account',
    question: '如何提交意见反馈？',
    answer: '进入「设置 → 意见反馈」填写内容并提交；也可发送邮件至 service@privclo.com。对精灵回复可使用 👍 / 👎 进行反馈。'
  }
]

Page({
  data: {
    statusBarHeight: 20,
    spriteUrl: '',
    spriteFallbackUrl: '',
    categories: FAQ_CATEGORIES,
    activeCategory: 'all',
    displayFaq: [],
    expandedIds: ['w1']
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
    this._refreshDisplay('all')
  },

  _refreshDisplay(category) {
    const activeCategory = category || this.data.activeCategory || 'all'
    const expandedIds = this.data.expandedIds || []
    const list = (activeCategory === 'all'
      ? FAQ_LIST
      : FAQ_LIST.filter((item) => item.category === activeCategory)
    ).map((item) => ({
      ...item,
      expanded: expandedIds.indexOf(item.id) >= 0
    }))
    this.setData({ activeCategory, displayFaq: list })
  },

  onBack() {
    wx.navigateBack()
  },

  onCategoryTap(e) {
    const id = e.currentTarget.dataset.id
    if (!id || id === this.data.activeCategory) return
    this._refreshDisplay(id)
  },

  onToggleFaq(e) {
    const id = e.currentTarget.dataset.id
    if (!id) return
    const expandedIds = this.data.expandedIds.slice()
    const idx = expandedIds.indexOf(id)
    if (idx >= 0) {
      expandedIds.splice(idx, 1)
    } else {
      expandedIds.push(id)
    }
    this.setData({ expandedIds }, () => this._refreshDisplay())
  },

  onSpriteError() {
    if (this.data.spriteUrl !== this.data.spriteFallbackUrl) {
      this.setData({ spriteUrl: this.data.spriteFallbackUrl })
    }
  },

  onOpenAiService() {
    wx.navigateTo({ url: '/packageSettings/pages/ai-service/ai-service' })
  },

  onOpenPrivacy() {
    openPrivacyPolicy()
  },

  onOpenTerms() {
    openUserAgreement()
  },

  onOpenFeedback() {
    wx.navigateTo({ url: '/packageSettings/pages/feedback/feedback' })
  }
})
