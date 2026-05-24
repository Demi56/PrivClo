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

  onOutfitPreferences() {
    wx.navigateTo({ url: '/packageSettings/pages/outfit-preferences/outfit-preferences' })
  },

  onOutfitPreferences() {
    wx.navigateTo({ url: '/packageSettings/pages/outfit-preferences/outfit-preferences' })
  },

  onAccountSecurity() {
    wx.navigateTo({ url: '/packageSettings/pages/account-security/account-security?gender=' + (this.data.gender || 'female') })
  },

  onNotification() {
    wx.showToast({ title: '通知设置', icon: 'none' })
  },

  onFAQ() {
    wx.showToast({ title: '常见问题', icon: 'none' })
  },

  onPrivacy() {
    wx.navigateTo({ url: '/packageSettings/pages/privacy-terms/privacy-terms?tab=0' })
  },

  onTerms() {
    wx.navigateTo({ url: '/packageSettings/pages/ai-service/ai-service' })
  }
})
