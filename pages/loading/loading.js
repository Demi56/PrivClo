// 加载过渡页 - 小程序启动后直接进入首页
const { getLoadingSpriteImageUrl, getLoadingSpriteCdnUrl } = require('../../utils/spriteImage.js')

Page({
  data: {
    statusBarHeight: 20,
    progress: 0,
    loadingSpriteUrl: ''
  },

  onLoad() {
    try {
      const sys = wx.getSystemInfoSync()
      this.setData({
        statusBarHeight: sys.statusBarHeight || 20,
        loadingSpriteUrl: getLoadingSpriteImageUrl()
      })
    } catch (e) {
      this.setData({ statusBarHeight: 20, loadingSpriteUrl: getLoadingSpriteImageUrl() })
    }
    this.startProgress()
  },

  startProgress() {
    const self = this
    const minTime = 1200
    const start = Date.now()
    let progress = 0
    const timer = setInterval(function () {
      const elapsed = Date.now() - start
      progress = Math.min(95, Math.floor((elapsed / minTime) * 100))
      self.setData({ progress })
      if (progress >= 95 && elapsed >= minTime) {
        clearInterval(timer)
        self.setData({ progress: 100 })
        setTimeout(function () {
          const app = getApp()
          const g = app.getUserGender && app.getUserGender()
          const genderQ = (g === 'male' || g === 'female')
            ? '?gender=' + encodeURIComponent(g)
            : ''
          wx.redirectTo({ url: '/pages/model/model' + genderQ })
        }, 200)
      }
    }, 50)
  },

  onLoadingSpriteError() {
    const cdn = getLoadingSpriteCdnUrl()
    if (this.data.loadingSpriteUrl !== cdn) {
      this.setData({ loadingSpriteUrl: cdn })
    }
  }
})
