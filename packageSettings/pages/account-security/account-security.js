const { getImageUrl } = require('../../../utils/image.js')
const { validatePhone } = require('../../../utils/accountValidators.js')

// 账号与安全
Page({
  data: {
    statusBarHeight: 20,
    gender: 'female',
    nickname: '默认用户',
    phone: '',
    phoneDisplay: '',
    phoneBound: false,
    showPhonePopup: false,
    editingPhone: '',
    phonePopupTitle: '绑定手机号',
    avatarUrl: '',
    avatarError: false,
    showNicknamePopup: false,
    editingNickname: '',
    showRetentionModal: false,
    logoutLabel: '退出登录'
  },

  getDefaultAvatarUrl(gender) {
    const g = gender === 'male' ? 'male' : 'female'
    return getImageUrl('/images/role/avatar-' + g + '.png')
  },

  loadAvatar() {
    const gender = this.data.gender || 'female'
    const profile = getApp().getRoleProfile(gender)
    const avatarUrl = (profile.avatarUrl && String(profile.avatarUrl).trim())
      ? profile.avatarUrl
      : this.getDefaultAvatarUrl(gender)
    this.setData({ avatarUrl, avatarError: false })
  },

  loadNickname() {
    const gender = this.data.gender || 'female'
    const app = getApp()
    const loggedIn = app.isUserLoggedIn && app.isUserLoggedIn()
    let nickname
    if (loggedIn) {
      nickname = app.getRoleDisplayName(gender)
    } else {
      const profile = app.getRoleProfile(gender)
      const custom = profile.nickname && String(profile.nickname).trim()
      nickname = custom || '演示账号'
    }
    this.setData({ nickname })
  },

  loadPhone() {
    const app = getApp()
    const phone = app.getUserPhone ? app.getUserPhone() : ''
    this.setData({
      phone,
      phoneDisplay: phone && app.maskUserPhone ? app.maskUserPhone(phone) : '',
      phoneBound: !!phone
    })
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
    const loggedIn = app.isUserLoggedIn && app.isUserLoggedIn()
    const logoutLabel = loggedIn ? '退出登录' : '前往登录'
    this.setData({ gender, logoutLabel })
    this.loadNickname()
    this.loadAvatar()
    this.loadPhone()
  },

  onShow() {
    const app = getApp()
    const loggedIn = app.isUserLoggedIn && app.isUserLoggedIn()
    const logoutLabel = loggedIn ? '退出登录' : '前往登录'
    this.setData({ logoutLabel })
    this.loadNickname()
    this.loadAvatar()
    this.loadPhone()
  },

  onBack() {
    wx.navigateBack()
  },

  onAvatarError() {
    this.setData({
      avatarError: true,
      avatarUrl: this.getDefaultAvatarUrl(this.data.gender)
    })
  },

  onAvatar() {
    wx.showActionSheet({
      itemList: ['拍照', '从相册选择'],
      success: (res) => {
        if (res.tapIndex === 0) this.chooseAvatar('camera')
        else if (res.tapIndex === 1) this.chooseAvatar('album')
      }
    })
  },

  chooseAvatar(sourceType) {
    wx.chooseMedia({
      count: 1,
      mediaType: ['image'],
      sourceType: [sourceType],
      sizeType: ['compressed'],
      success: (res) => {
        const path = res.tempFiles && res.tempFiles[0] && res.tempFiles[0].tempFilePath
        if (path) this.saveAvatar(path)
      },
      fail: (err) => {
        const msg = (err && err.errMsg) || ''
        if (msg.indexOf('cancel') >= 0 || msg.indexOf('fail cancel') >= 0) return
        wx.showToast({
          title: sourceType === 'camera' ? '请授权摄像头' : '请授权相册',
          icon: 'none'
        })
      }
    })
  },

  saveAvatar(tempFilePath) {
    const gender = this.data.gender || 'female'
    const key = 'modelProfile_' + gender
    const app = getApp()
    const profile = Object.assign({}, app.getRoleProfile(gender))

    const applyPath = (filePath) => {
      profile.avatarUrl = filePath
      try {
        wx.setStorageSync(key, profile)
        this.setData({ avatarUrl: filePath, avatarError: false })
        wx.showToast({ title: '头像已更新', icon: 'success' })
      } catch (e) {
        wx.showToast({ title: '保存失败', icon: 'none' })
      }
    }

    wx.saveFile({
      tempFilePath: tempFilePath,
      success: (res) => applyPath(res.savedFilePath),
      fail: () => applyPath(tempFilePath)
    })
  },

  onNickname() {
    const gender = this.data.gender || 'female'
    const app = getApp()
    const loggedIn = app.isUserLoggedIn && app.isUserLoggedIn()
    let initial = this.data.nickname || ''
    if (!loggedIn && initial === '演示账号') {
      initial = app.getRoleDisplayName(gender)
    }
    this.setData({
      showNicknamePopup: true,
      editingNickname: initial
    })
  },

  onNicknameInput(e) {
    this.setData({ editingNickname: (e.detail && e.detail.value) || '' })
  },

  onCloseNicknamePopup() {
    this.setData({ showNicknamePopup: false, editingNickname: '' })
  },

  onNicknameConfirm() {
    const name = (this.data.editingNickname || '').trim()
    if (!name) {
      wx.showToast({ title: '请输入昵称', icon: 'none' })
      return
    }
    if (name.length > 20) {
      wx.showToast({ title: '昵称最多20字', icon: 'none' })
      return
    }
    const gender = this.data.gender || 'female'
    const key = 'modelProfile_' + gender
    const profile = Object.assign({}, getApp().getRoleProfile(gender), { nickname: name })
    try {
      wx.setStorageSync(key, profile)
      this.setData({
        nickname: name,
        showNicknamePopup: false,
        editingNickname: ''
      })
      wx.showToast({ title: '昵称已更新', icon: 'success' })
    } catch (e) {
      wx.showToast({ title: '保存失败', icon: 'none' })
    }
  },

  onBindPhone() {
    if (this.data.phoneBound) {
      wx.showActionSheet({
        itemList: ['更换手机号', '解绑手机号'],
        success: (res) => {
          if (res.tapIndex === 0) this.openPhonePopup('更换手机号', '')
          else if (res.tapIndex === 1) this.unbindPhone()
        }
      })
      return
    }
    this.openPhonePopup('绑定手机号', '')
  },

  openPhonePopup(title, initial) {
    this.setData({
      showPhonePopup: true,
      phonePopupTitle: title || '绑定手机号',
      editingPhone: initial || ''
    })
  },

  onPhoneInput(e) {
    const value = ((e.detail && e.detail.value) || '').replace(/\D/g, '').slice(0, 11)
    this.setData({ editingPhone: value })
  },

  onClosePhonePopup() {
    this.setData({ showPhonePopup: false, editingPhone: '' })
  },

  onPhoneConfirm() {
    const result = validatePhone(this.data.editingPhone)
    if (!result.ok) {
      wx.showToast({ title: result.message || '手机号格式不正确', icon: 'none' })
      return
    }
    const app = getApp()
    const isReplace = this.data.phonePopupTitle === '更换手机号'
    if (!app.saveUserPhone || !app.saveUserPhone(result.normalized)) {
      wx.showToast({ title: '保存失败', icon: 'none' })
      return
    }
    this.setData({
      showPhonePopup: false,
      editingPhone: ''
    })
    this.loadPhone()
    wx.showToast({
      title: isReplace ? '手机号已更换' : '绑定成功',
      icon: 'success'
    })
  },

  unbindPhone() {
    wx.showModal({
      title: '解绑手机号',
      content: '解绑后将无法使用该手机号进行账号安全验证，确定解绑吗？',
      confirmText: '解绑',
      cancelText: '取消',
      success: (res) => {
        if (!res.confirm) return
        const app = getApp()
        if (app.clearUserPhone) app.clearUserPhone()
        this.loadPhone()
        wx.showToast({ title: '已解绑', icon: 'none' })
      }
    })
  },

  onLogout() {
    const app = getApp()
    if (!app.isUserLoggedIn || !app.isUserLoggedIn()) {
      app.goWechatLogin({ fromMine: false })
      return
    }
    wx.showModal({
      title: '提示',
      content: '确定要退出登录吗？',
      success: (res) => {
        if (res.confirm) {
          if (app.clearUserLoggedIn) app.clearUserLoggedIn()
          wx.showToast({ title: '已退出登录', icon: 'none' })
          setTimeout(() => wx.navigateBack(), 600)
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
