const { getImageUrl } = require('../../utils/image.js')

// 默认角色确认及多角色切换页
Page({
  data: {
    statusBarHeight: 20,
    gender: 'female',
    roleName: '默认用户',
    isDefaultRole: true,
    avatarPrevUrl: '',
    avatarFemaleUrl: '',
    avatarMaleUrl: '',
    avatarFemaleError: false,
    avatarMaleError: false,
    prevAvatarError: false
  },

  onLoad(options) {
    try {
      const sys = wx.getSystemInfoSync()
      this.setData({ statusBarHeight: sys.statusBarHeight || 20 })
    } catch (e) {
      this.setData({ statusBarHeight: 20 })
    }
    const gender = options.gender || getApp().getUserGender() || 'female'
    const roleName = getApp().getRoleDisplayName(gender)
    const defaultName = getApp().getDefaultUserDisplayName()
    const isDefaultRole = roleName === defaultName
    this.setData({
      gender,
      roleName,
      isDefaultRole,
      avatarPrevUrl: getImageUrl('/images/role/avatar-prev.png'),
      avatarFemaleUrl: getImageUrl('/images/role/avatar-female.png'),
      avatarMaleUrl: getImageUrl('/images/role/avatar-male.png')
    })
  },

  onShow() {
    const gender = this.data.gender || 'female'
    const roleName = getApp().getRoleDisplayName(gender)
    const defaultName = getApp().getDefaultUserDisplayName()
    const isDefaultRole = roleName === defaultName
    this.setData({ roleName, isDefaultRole })
  },

  onBack() {
    wx.navigateBack()
  },

  onAvatarTap() {
    wx.navigateTo({ url: '/pages/model/model?gender=' + (this.data.gender || 'female') })
  },

  onPrevRole() {
    wx.showToast({ title: '上一个角色', icon: 'none' })
  },

  onNextRole() {
    wx.showToast({ title: '下一个角色', icon: 'none' })
  },

  onAddMember() {
    wx.navigateTo({ url: '/pages/add-member/add-member' })
  },

  onAvatarFemaleError() {
    this.setData({ avatarFemaleError: true })
  },
  onAvatarMaleError() {
    this.setData({ avatarMaleError: true })
  },
  onPrevAvatarError() {
    this.setData({ prevAvatarError: true })
  }
})
