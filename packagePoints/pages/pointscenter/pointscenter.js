// 积分中心 - 收入与支出明细
Page({
  data: {
    statusBarHeight: 20,
    roleName: '依依',
    totalPoints: 0,
    recordList: []
  },

  onBack() {
    wx.navigateBack()
  },

  _updatePointsFromStorage() {
    const app = getApp()
    const isGuest = app.globalData.isGuestMode
    if (isGuest) {
      this.setData({ totalPoints: 0, recordList: [] })
    } else {
      const totalPoints = (app.getPoints && app.getPoints()) || 0
      const recordList = (app.getPointsRecords && app.getPointsRecords()) || []
      this.setData({ totalPoints, recordList })
    }
  },

  onLoad(options) {
    try {
      const sys = wx.getSystemInfoSync()
      this.setData({ statusBarHeight: sys.statusBarHeight || 20 })
    } catch (e) {
      this.setData({ statusBarHeight: 20 })
    }
    const roleName = options.roleName ? decodeURIComponent(options.roleName) : '依依'
    this.setData({ roleName })
    this._updatePointsFromStorage()
  },

  onShow() {
    this._updatePointsFromStorage()
  },

  onShareAppMessage() {
    return {
      title: '我的穿搭小助手 PrivClo，快来一起探索天气穿搭吧！',
      path: '/pages/index/index'
    }
  }
})
