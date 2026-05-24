// 微信登录确认及同意授权页
const { openUserAgreement, openPrivacyPolicy } = require('../../utils/legalPages.js')

Page({
  data: {
    statusBarHeight: 20,
    agreed: false,
    fromSave: false
  },

  onLoad(options) {
    const fromSave = options.fromSave === '1' || options.fromSave === true
    try {
      const sys = wx.getSystemInfoSync()
      this.setData({ statusBarHeight: sys.statusBarHeight || 20, fromSave: !!fromSave })
    } catch (e) {
      this.setData({ statusBarHeight: 20, fromSave: !!fromSave })
    }
  },

  toggleAgreement() {
    this.setData({ agreed: !this.data.agreed })
  },

  onConfirm() {
    if (!this.data.agreed) return
    const app = getApp()
    app.globalData.isGuestMode = false
    if (app.grantRegistrationReward) app.grantRegistrationReward()
    if (this.data.fromSave) {
      wx.navigateBack({ delta: 2 })
    } else {
      wx.navigateTo({ url: '/pages/preference/preference' })
    }
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
