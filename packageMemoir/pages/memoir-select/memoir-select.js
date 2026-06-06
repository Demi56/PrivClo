const { getImageUrl } = require('../../../utils/image.js')

// 穿搭回忆报告 - 角色选择（复制角色切换页，依依/阳阳左右箭头切换）
Page({
  data: {
    statusBarHeight: 20,
    gender: 'female',
    roleName: '默认用户',
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
    const gender = options.gender || 'female'
    const roleName = getApp().getRoleDisplayName(gender)
    this.setData({
      gender,
      roleName,
      avatarPrevUrl: getImageUrl('/images/role/avatar-prev.png'),
      avatarFemaleUrl: getImageUrl('/images/role/avatar-female.png'),
      avatarMaleUrl: getImageUrl('/images/role/avatar-male.png')
    })
  },

  onShow() {
    const gender = this.data.gender || 'female'
    const roleName = getApp().getRoleDisplayName(gender)
    this.setData({ roleName })
  },

  onBack() {
    wx.navigateBack()
  },

  onAvatarTap() {
    // 不跳转报告页；点击头像在依依/阳阳间切换预览
    this.toggleGender()
  },

  /** 两档角色（女/男）切换，与角色页一致 */
  toggleGender() {
    const g = this.data.gender === 'female' ? 'male' : 'female'
    const roleName = getApp().getRoleDisplayName(g)
    this.setData({ gender: g, roleName })
  },

  onPrevRole() {
    this.toggleGender()
  },

  onNextRole() {
    this.toggleGender()
  },

  goToReport() {
    wx.navigateTo({
      url: '/packageMemoir/pages/memoir/memoir?gender=' + (this.data.gender || 'female'),
      fail: (err) => {
        console.error('memoir navigateTo fail', err)
        wx.showToast({ title: '打开报告失败，请稍后重试', icon: 'none' })
      }
    })
  },

  onGenerate() {
    this.goToReport()
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
