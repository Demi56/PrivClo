// 设置页面
Page({
  data: {
    statusBarHeight: 20,
    gender: 'female'
  },

  onLoad(options) {
    try {
      const sys = wx.getSystemInfoSync()
      this.setData({ statusBarHeight: sys.statusBarHeight || 20 })
    } catch (e) {
      this.setData({ statusBarHeight: 20 })
    }
    const gender = options.gender || 'female'
    this.setData({ gender })
  },

  onBack() {
    wx.navigateBack()
  },

  onAccountSecurity() {
    wx.navigateTo({ url: '/packageSettings/pages/account-security/account-security?gender=' + (this.data.gender || 'female') })
  },

  onNotification() {
    wx.navigateTo({ url: '/packageSettings/pages/notification-settings/notification-settings' })
  },

  onFAQ() {
    wx.navigateTo({ url: '/packageSettings/pages/faq/faq' })
  },

  onPrivacy() {
    wx.navigateTo({ url: '/packageSettings/pages/privacy-terms/privacy-terms?tab=0' })
  },

  onTerms() {
    wx.navigateTo({ url: '/packageSettings/pages/ai-service/ai-service' })
  }
})
