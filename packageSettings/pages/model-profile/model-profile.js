const { getImageUrl } = require('../../../utils/image.js')

const STYLE_OPTIONS = [
  '日常休闲风', '法式风', '商务职场风', '运动风', '极简风', '复古风', '街头潮酷', '新中式',
  '汉服', 'JK', '洛丽塔', 'Vintage', '山系户外'
]

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
    roleAvatarFemaleUrl: '',
    roleAvatarMaleUrl: '',
    styleOptions: STYLE_OPTIONS,
    selectedStyles: []
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
    try {
      const raw = wx.getStorageSync(key)
      const s = (raw?.selectedStyles && Array.isArray(raw.selectedStyles))
        ? raw.selectedStyles
        : (getApp().getStylePreference ? getApp().getStylePreference(this.data.gender) : [])
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
          selectedStyles: s || []
        })
      } else {
        this.setData({
          roleNickname: defaultName,
          roleHeight: body.height,
          roleWeight: body.weight,
          roleBustWaistHip: body.bustWaistHip,
          roleBustWaistHipEnabled: false,
          selectedStyles: s || []
        })
      }
    } catch (e) {
      this.setData({
        roleNickname: defaultName,
        roleHeight: body.height,
        roleWeight: body.weight,
        roleBustWaistHip: body.bustWaistHip,
        roleBustWaistHipEnabled: false,
        selectedStyles: []
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

  toggleStyle(e) {
    const name = e.currentTarget.dataset.name
    if (!name) return
    let list = this.data.selectedStyles || []
    const idx = list.indexOf(name)
    if (idx >= 0) {
      list = list.filter(function (item) { return item !== name })
    } else {
      list = list.concat(name)
    }
    this.setData({ selectedStyles: list })
  },

  onCancel() {
    wx.navigateBack()
  },

  onSave() {
    if (!getApp().requireGuestLoginForSave()) return
    const { roleNickname, roleHeight, roleWeight, roleBustWaistHip, roleBustWaistHipEnabled, selectedStyles, gender } = this.data
    const profile = {
      nickname: (roleNickname || '').trim(),
      height: (roleHeight || '').trim(),
      weight: (roleWeight || '').trim(),
      bustWaistHip: roleBustWaistHipEnabled ? (roleBustWaistHip || '').trim() : '',
      selectedStyles: selectedStyles || []
    }
    try {
      const g = gender || 'female'
      wx.setStorageSync('modelProfile_' + g, profile)
      if (getApp().saveStylePreference) getApp().saveStylePreference(selectedStyles)
      wx.showToast({ title: '保存成功', icon: 'success' })
      setTimeout(() => wx.navigateBack(), 800)
    } catch (e) {
      wx.showToast({ title: '保存失败', icon: 'none' })
    }
  }
})
