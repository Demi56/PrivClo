// 微信登录确认及同意授权页（由「我的」头像或保存拦截进入）
const { openUserAgreement, openPrivacyPolicy } = require('../../utils/legalPages.js')

Page({
  data: {
    statusBarHeight: 20,
    agreed: false,
    fromSave: false,
    fromMine: false
  },

  onLoad(options) {
    const opt = options || {}
    const fromSave = opt.fromSave === '1' || opt.fromSave === true
    const fromMine = opt.fromMine === '1' || opt.fromMine === true
    try {
      const sys = wx.getSystemInfoSync()
      this.setData({
        statusBarHeight: sys.statusBarHeight || 20,
        fromSave: !!fromSave,
        fromMine: !!fromMine
      })
    } catch (e) {
      this.setData({ statusBarHeight: 20, fromSave: !!fromSave, fromMine: !!fromMine })
    }
  },

  toggleAgreement() {
    this.setData({ agreed: !this.data.agreed })
  },

  onConfirm() {
    if (!this.data.agreed) return
    const app = getApp()
    app.markUserLoggedIn()
    if (app.grantRegistrationReward) app.grantRegistrationReward()
    wx.showToast({ title: '登录成功', icon: 'success', duration: 1200 })
    if (this.data.fromSave) {
      setTimeout(() => wx.navigateBack({ delta: 2 }), 500)
      return
    }
    if (this.data.fromMine) {
      setTimeout(() => wx.navigateBack(), 500)
      return
    }
    setTimeout(() => {
      const g = app.getUserGender && app.getUserGender()
      const genderQ = (g === 'male' || g === 'female') ? '?gender=' + encodeURIComponent(g) : ''
      wx.reLaunch({ url: '/pages/model/model' + genderQ })
    }, 500)
  },

  onAgreement() {
    openUserAgreement()
  },

  onPrivacy() {
    openPrivacyPolicy()
  },

  onBack() {
    wx.navigateBack()
  }
})
