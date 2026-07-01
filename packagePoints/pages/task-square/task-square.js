const { reLaunchMain, MAIN_MODEL, MAIN_DIARY, MAIN_WARDROBE } = require('../../../utils/mainTabs.js')
const {
  buildPageTaskData,
  claimTask,
  recordDailyAction,
  getGoTaskUrl
} = require('../../../utils/taskSquare.js')

const TAB_MAIN_PAGES = {
  [MAIN_MODEL]: true,
  [MAIN_DIARY]: true,
  [MAIN_WARDROBE]: true
}

// 任务广场 - 卡片化、手游质感，含每日/新手/成就/限时四类任务
Page({
  data: {
    statusBarHeight: 20,
    roleName: '默认用户',
    totalPoints: 0,
    todayPoints: 0,
    dailyMax: 100,
    activeTab: 0,
    tabList: ['每日', '新手', '成就', '限时'],
    dailyTasks: [],
    noviceTasks: [],
    achieveTasks: [],
    limitedTasks: [],
    dailyAllDone: false,
    showRulesModal: false
  },

  onBack() {
    wx.navigateBack()
  },

  _refreshTasks() {
    const app = getApp()
    const data = buildPageTaskData(app)
    this.setData({
      totalPoints: data.totalPoints,
      todayPoints: data.todayPoints,
      dailyMax: data.dailyMax,
      dailyAllDone: data.dailyAllDone,
      dailyTasks: data.dailyTasks,
      noviceTasks: data.noviceTasks,
      achieveTasks: data.achieveTasks,
      limitedTasks: data.limitedTasks
    })
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
    this._refreshTasks()
  },

  onShow() {
    this._refreshTasks()
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

  _goTask(taskId, type) {
    if (taskId === 'share') {
      wx.showToast({ title: '请点击右上角分享给好友', icon: 'none' })
      return
    }
    const url = getGoTaskUrl(taskId, type)
    if (!url) return
    const app = getApp()
    const gender = (app.getUserGender && app.getUserGender()) || 'female'
    if (TAB_MAIN_PAGES[url]) {
      reLaunchMain(url, gender)
      return
    }
    const join = url.indexOf('?') >= 0 ? '&' : '?'
    wx.navigateTo({
      url: url + join + 'roleName=' + encodeURIComponent(this.data.roleName || app.getDefaultUserDisplayName()),
      fail: () => wx.navigateTo({ url })
    })
  },

  onClaim(e) {
    const { id, type, action } = e.currentTarget.dataset
    if (!id || !type) return

    if (action === 'go') {
      this._goTask(id, type)
      return
    }
    if (action === 'none') return

    const app = getApp()
    if (app.requireGuestLoginForSave && !app.requireGuestLoginForSave()) return

    const result = claimTask(id, type, app)
    if (result.success) {
      wx.vibrateShort && wx.vibrateShort({ type: 'light' })
      wx.showToast({
        title: '+' + result.points + ' 积分',
        icon: 'success'
      })
    } else {
      wx.showToast({ title: result.message || '领取失败', icon: 'none' })
    }
    this._refreshTasks()
  },

  onRulesTap() {
    this.setData({ showRulesModal: true })
  },

  onCloseRules() {
    this.setData({ showRulesModal: false })
  },

  onShareAppMessage() {
    recordDailyAction('share')
    this._refreshTasks()
    return {
      title: '我的衣橱管家 PrivClo，快来一起探索天气穿搭吧！',
      path: '/pages/model/model'
    }
  }
})
