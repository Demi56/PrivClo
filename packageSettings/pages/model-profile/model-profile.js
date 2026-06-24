const { getImageUrl } = require('../../../utils/image.js')

const DEFAULT_ROLE_BODY = {
  female: { height: '163', weight: '52', bustWaistHip: '84 / 62 / 88' },
  male: { height: '175', weight: '68', bustWaistHip: '95 / 80 / 98' }
}

Page({
  data: {
    statusBarHeight: 20,
    gender: 'female',
    roleNickname: '',
    roleHeight: '',
    roleWeight: '',
    roleBustWaistHip: '',
    roleBustWaistHipEnabled: false,
    age: 24,
    roleAvatarFemaleUrl: '',
    roleAvatarMaleUrl: ''
  },

  onLoad(options) {
    try {
      const sys = wx.getSystemInfoSync()
      this.setData({ statusBarHeight: sys.statusBarHeight || 20 })
    } catch (e) {
      this.setData({ statusBarHeight: 20 })
    }
    const gender = options.gender || getApp().getUserGender() || 'female'
    this.setData({
      gender,
      roleAvatarFemaleUrl: getImageUrl('/images/role/avatar-female.png'),
      roleAvatarMaleUrl: getImageUrl('/images/role/avatar-male.png')
    })
    this.loadProfile()
  },

  getRoleProfileKey() {
    return 'modelProfile_' + (this.data.gender || 'female')
  },

  loadProfile() {
    const isMale = this.data.gender === 'male'
    const defaultName = getApp().getDefaultUserDisplayName()
    const body = DEFAULT_ROLE_BODY[isMale ? 'male' : 'female']
    const key = this.getRoleProfileKey()
    const prefs = getApp().getOutfitPreferences()
    const age = prefs.age != null ? prefs.age : 24
    try {
      const raw = wx.getStorageSync(key)
      if (raw && typeof raw === 'object') {
        const nickname = (raw.nickname && String(raw.nickname).trim()) || defaultName
        const roleHeight = raw.height !== undefined && raw.height !== '' ? String(raw.height) : body.height
        const roleWeight = raw.weight !== undefined && raw.weight !== '' ? String(raw.weight) : body.weight
        const hasBust = raw.bustWaistHip && String(raw.bustWaistHip).trim()
        this.setData({
          roleNickname: nickname,
          roleHeight,
          roleWeight,
          roleBustWaistHip: hasBust || body.bustWaistHip,
          roleBustWaistHipEnabled: !!hasBust,
          age
        })
      } else {
        this.setData({
          roleNickname: defaultName,
          roleHeight: body.height,
          roleWeight: body.weight,
          roleBustWaistHip: body.bustWaistHip,
          roleBustWaistHipEnabled: false,
          age
        })
      }
    } catch (e) {
      this.setData({
        roleNickname: defaultName,
        roleHeight: body.height,
        roleWeight: body.weight,
        roleBustWaistHip: body.bustWaistHip,
        roleBustWaistHipEnabled: false,
        age
      })
    }
  },

  onToggleBustWaistHip(e) {
    const enabled = e.detail && e.detail.value
    const isMale = this.data.gender === 'male'
    const body = DEFAULT_ROLE_BODY[isMale ? 'male' : 'female']
    this.setData({
      roleBustWaistHipEnabled: enabled,
      roleBustWaistHip: enabled ? (this.data.roleBustWaistHip || body.bustWaistHip) : ''
    })
  },

  onRoleNicknameInput(e) {
    this.setData({ roleNickname: (e.detail && e.detail.value) || '' })
  },

  onRoleHeightInput(e) {
    this.setData({ roleHeight: (e.detail && e.detail.value) || '' })
  },

  onRoleWeightInput(e) {
    this.setData({ roleWeight: (e.detail && e.detail.value) || '' })
  },

  onRoleBustWaistHipInput(e) {
    this.setData({ roleBustWaistHip: (e.detail && e.detail.value) || '' })
  },

  onAgeChange(e) {
    this.setData({ age: parseInt(e.detail.value, 10) })
  },

  onCancel() {
    wx.navigateBack()
  },

  onSave() {
    if (!getApp().requireGuestLoginForSave()) return
    const { roleNickname, roleHeight, roleWeight, roleBustWaistHip, roleBustWaistHipEnabled, age, gender } = this.data
    const app = getApp()
    const existing = app.getRoleProfile(gender) || {}
    const prefs = app.getOutfitPreferences()
    const profile = {
      nickname: (roleNickname || '').trim(),
      height: (roleHeight || '').trim(),
      weight: (roleWeight || '').trim(),
      bustWaistHip: roleBustWaistHipEnabled ? (roleBustWaistHip || '').trim() : '',
      selectedStyles: Array.isArray(existing.selectedStyles) ? existing.selectedStyles : [],
      avatarUrl: existing.avatarUrl || ''
    }
    try {
      const g = gender || 'female'
      wx.setStorageSync('modelProfile_' + g, profile)
      app.saveOutfitPreferences({
        avoidItems: prefs.avoidItems,
        preferItems: prefs.preferItems,
        age: age != null ? age : 24,
        styleTags: prefs.styleTags,
        customStyleTags: prefs.customStyleTags
      })
      wx.showToast({ title: '保存成功', icon: 'success' })
      setTimeout(() => wx.navigateBack(), 800)
    } catch (e) {
      wx.showToast({ title: '保存失败', icon: 'none' })
    }
  }
})
