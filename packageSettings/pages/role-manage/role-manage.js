// 角色管理 - 角色切换 / 信息录入
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
    const gender = options.gender || getApp().getUserGender() || 'female'
    this.setData({ gender })
  },

  onBack() {
    wx.navigateBack()
  },

  onRoleSwitch() {
    const g = this.data.gender || 'female'
    wx.navigateTo({ url: '/pages/role/role?gender=' + encodeURIComponent(g) })
  },

  onRoleProfile() {
    const g = this.data.gender || 'female'
    wx.navigateTo({
      url: '/packageSettings/pages/model-profile/model-profile?gender=' + encodeURIComponent(g)
    })
  }
})
