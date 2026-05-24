// 穿搭偏好 - 不喜欢/喜欢的单品，供精灵小助手记忆
Page({
  data: {
    statusBarHeight: 20,
    avoidItems: '',
    preferItems: ''
  },

  onLoad() {
    try {
      const sys = wx.getSystemInfoSync()
      this.setData({ statusBarHeight: sys.statusBarHeight || 20 })
    } catch (e) {
      this.setData({ statusBarHeight: 20 })
    }
    const prefs = getApp().getOutfitPreferences()
    this.setData({
      avoidItems: (prefs.avoidItems || []).join('、'),
      preferItems: (prefs.preferItems || []).join('、')
    })
  },

  onBack() {
    wx.navigateBack()
  },

  onAvoidInput(e) {
    this.setData({ avoidItems: (e.detail && e.detail.value) || '' })
  },

  onPreferInput(e) {
    this.setData({ preferItems: (e.detail && e.detail.value) || '' })
  },

  onSave() {
    const avoidStr = (this.data.avoidItems || '').trim()
    const preferStr = (this.data.preferItems || '').trim()
    const avoidItems = avoidStr
      ? avoidStr.split(/[、,，]/).map(s => s.trim()).filter(Boolean)
      : []
    const preferItems = preferStr
      ? preferStr.split(/[、,，]/).map(s => s.trim()).filter(Boolean)
      : []
    getApp().saveOutfitPreferences({ avoidItems, preferItems })
    wx.showToast({ title: '已保存', icon: 'success' })
    setTimeout(() => wx.navigateBack(), 800)
  }
})
