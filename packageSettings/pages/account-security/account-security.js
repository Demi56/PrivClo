// 账号与安全
Page({
  data: {
    statusBarHeight: 20,
    gender: 'female',
    nickname: '依依',
    phone: '',
    avatarError: false,
    showRetentionModal: false,
    logoutLabel: '退出登录'
  },

  onLoad(options) {
    try {
      const sys = wx.getSystemInfoSync()
      this.setData({ statusBarHeight: sys.statusBarHeight || 20 })
    } catch (e) {
      this.setData({ statusBarHeight: 20 })
    }
    const gender = options.gender || 'female'
    const app = getApp()
    const nickname = app.globalData.isGuestMode ? '演示账号' : app.getRoleDisplayName(gender)
    const logoutLabel = app.globalData.isGuestMode ? '前往登录' : '退出登录'
    this.setData({ gender, nickname, logoutLabel })
  },

  onShow() {
    const gender = this.data.gender || 'female'
    const app = getApp()
    const nickname = app.globalData.isGuestMode ? '演示账号' : app.getRoleDisplayName(gender)
    const logoutLabel = app.globalData.isGuestMode ? '前往登录' : '退出登录'
    this.setData({ nickname, logoutLabel })
  },

  onBack() {
    wx.navigateBack()
  },

  onAvatarError() {
    this.setData({ avatarError: true })
  },

  onAvatar() {
    wx.showToast({ title: '修改头像', icon: 'none' })
  },

  onNickname() {
    if (getApp().globalData.isGuestMode) {
      wx.showToast({ title: '游客浏览时暂不支持修改用户昵称，请前往登录/注册', icon: 'none', duration: 3000 })
      return
    }
    wx.showToast({ title: '修改昵称', icon: 'none' })
  },

  onBindPhone() {
    wx.showToast({ title: '绑定手机号', icon: 'none' })
  },

  onLogout() {
    if (getApp().globalData.isGuestMode) {
      wx.navigateTo({ url: '/pages/login/login' })
      return
    }
    wx.showModal({
      title: '提示',
      content: '确定要退出登录吗？',
      success: (res) => {
        if (res.confirm) {
          wx.showToast({ title: '已退出登录', icon: 'none' })
        }
      }
    })
  },

  onDeleteAccount() {
    this.setData({ showRetentionModal: true })
  },

  onCloseRetention() {
    this.setData({ showRetentionModal: false })
  },

  onRetentionStay() {
    this.setData({ showRetentionModal: false })
  },

  onRetentionConfirm() {
    this.setData({ showRetentionModal: false })
    wx.showToast({ title: '请联系客服办理', icon: 'none' })
  }
})
