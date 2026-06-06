// 任务广场 - 卡片化、手游质感，含每日/新手/成就/限时四类任务
const DAILY_MAX = 220

const DAILY_TASKS = [
  { id: 'sign', name: '每日签到', desc: '点击签到按钮领取积分', reward: 10, limit: 1, unit: '次', remark: '连续签到7天额外+50' },
  { id: 'weather', name: '天气穿搭推荐', desc: '使用AI推荐并保存一套穿搭', reward: 20, limit: 2, unit: '次', remark: '每日最多40积分' },
  { id: 'diary', name: '保存穿搭日记', desc: '保存图文穿搭记录', reward: 30, limit: 3, unit: '次', remark: '每日最多90积分' },
  { id: 'clothes', name: '添加衣物', desc: '向衣橱添加衣物', reward: 10, limit: 5, unit: '件', remark: '每日最多50积分' },
  { id: 'share', name: '分享小程序', desc: '分享到微信群或好友', reward: 30, limit: 1, unit: '次', remark: '仅首次有效' }
]

const NOVICE_TASKS = [
  { id: 'profile', name: '完善资料', desc: '填写性别、年龄、风格偏好', reward: 100 },
  { id: 'first-clothes', name: '首次添加衣物', desc: '向衣橱添加第1件衣服', reward: 50 },
  { id: 'first-ai', name: '首次使用AI推荐', desc: '完成首次天气穿搭推荐并保存', reward: 80 },
  { id: 'first-diary', name: '首次保存日记', desc: '保存第1篇穿搭日记', reward: 100 },
  { id: 'bind-phone', name: '绑定手机号', desc: '完成手机号码绑定', reward: 50 }
]

const ACHIEVE_TASKS = [
  { id: 'wardrobe-20', name: '衣橱达人', desc: '衣橱衣物数量达到20件', reward: 200 },
  { id: 'diary-10', name: '日记达人', desc: '累计保存10篇穿搭日记', reward: 300 },
  { id: 'sign-7', name: '连续签到7天', desc: '连续签到满7天', reward: 50, extra: '额外' },
  { id: 'sign-30', name: '连续签到30天', desc: '连续签到满30天', reward: 200, extra: '限定徽章' },
  { id: 'invite-1', name: '邀请第1位好友', desc: '成功邀请1位好友注册', reward: 1000 },
  { id: 'invite-3', name: '邀请3位好友', desc: '累计邀请3位好友', reward: 500, extra: '限定头像框' }
]

const LIMITED_TASKS = [
  { id: 'festival', name: '节日限定', desc: '节日期间保存指定主题日记', reward: '200~500', validity: '7天左右' },
  { id: 'brand', name: '品牌合作', desc: '参与合作品牌话题', reward: '100~300', validity: '不定期' },
  { id: 'survey', name: '问卷调研', desc: '填写用户调研问卷', reward: '100', validity: '不定期' },
  { id: 'version', name: '版本更新', desc: '体验新功能并反馈', reward: '100~200', validity: '保存后7天' }
]

Page({
  data: {
    statusBarHeight: 20,
    roleName: '默认用户',
    totalPoints: 0,
    todayPoints: 0,
    dailyMax: DAILY_MAX,
    activeTab: 0,
    tabList: ['每日', '新手', '成就', '限时'],
    dailyTasks: DAILY_TASKS,
    noviceTasks: NOVICE_TASKS,
    achieveTasks: ACHIEVE_TASKS,
    limitedTasks: LIMITED_TASKS,
    dailyAllDone: false,
    showRulesModal: false
  },

  onBack() {
    wx.navigateBack()
  },

  _updatePoints() {
    const app = getApp()
    const totalPoints = app.globalData.isGuestMode ? 0 : (app.getPoints && app.getPoints()) || 0
    const todayPoints = this._getTodayPoints()
    const dailyAllDone = todayPoints >= DAILY_MAX
    this.setData({ totalPoints, todayPoints, dailyAllDone })
  },

  _getTodayPoints() {
    try {
      const raw = wx.getStorageSync('privclo_today_points')
      if (!raw || typeof raw !== 'object') return 0
      const today = new Date().toDateString()
      if (raw.date !== today) return 0
      return typeof raw.points === 'number' ? raw.points : 0
    } catch (e) {
      return 0
    }
  },

  onLoad(options) {
    try {
      const sys = wx.getSystemInfoSync()
      this.setData({ statusBarHeight: sys.statusBarHeight || 20 })
    } catch (e) {
      this.setData({ statusBarHeight: 20 })
    }
    const roleName = options.roleName ? decodeURIComponent(options.roleName) : getApp().getDefaultUserDisplayName()
    this.setData({ roleName })
    this._updatePoints()
  },

  onShow() {
    this._updatePoints()
  },

  onTabTap(e) {
    const idx = e.currentTarget.dataset.index
    if (idx !== undefined && idx !== this.data.activeTab) {
      this.setData({ activeTab: idx })
    }
  },

  onPointsTap() {
    wx.navigateTo({ url: '/packagePoints/pages/pointscenter/pointscenter?roleName=' + encodeURIComponent(this.data.roleName || getApp().getDefaultUserDisplayName()) })
  },

  onInviteTap() {
    wx.navigateTo({ url: '/packagePoints/pages/invite/invite?roleName=' + encodeURIComponent(this.data.roleName || getApp().getDefaultUserDisplayName()) })
  },

  onClaim(e) {
    const { id, type } = e.currentTarget.dataset
    if (!id || !type) return
    if (type === 'limited') {
      wx.showToast({ title: '暂未开放', icon: 'none' })
      return
    }
    if (getApp().globalData.isGuestMode) {
      wx.showToast({ title: '请先登录/注册', icon: 'none' })
      return
    }
    wx.vibrateShort && wx.vibrateShort({ type: 'light' })
    wx.showToast({ title: '领取成功', icon: 'success' })
    this._updatePoints()
  },

  onRulesTap() {
    this.setData({ showRulesModal: true })
  },

  onCloseRules() {
    this.setData({ showRulesModal: false })
  },

  onShareAppMessage() {
    return {
      title: '我的穿搭小助手 PrivClo，快来一起探索天气穿搭吧！',
      path: '/pages/model/model'
    }
  }
})
