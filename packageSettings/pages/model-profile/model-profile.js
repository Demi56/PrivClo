const { getImageUrl } = require('../../../utils/image.js')
const { getModelImagePath } = require('../../../utils/clothingPositions.js')

// 角色信息录入/编辑页 - 风格选项与注册 preference 页一致
const STYLE_OPTIONS = [
  '日常休闲风', '法式风', '商务职场风', '运动风', '极简风', '复古风', '街头潮酷', '新中式',
  '汉服', 'JK', '洛丽塔', 'Vintage', '山系户外'
]

Page({
  data: {
    statusBarHeight: 20,
    nickname: '',
    height: '',
    weight: '',
    bustWaistHip: '',
    styleOptions: STYLE_OPTIONS,
    selectedStyles: [],
    avatarUrl: '',
    modelDefaultUrl: ''
  },

  onLoad(options) {
    try {
      const sys = wx.getSystemInfoSync()
      this.setData({ statusBarHeight: sys.statusBarHeight || 20 })
    } catch (e) {
      this.setData({ statusBarHeight: 20 })
    }
    const gender = options.gender || 'female'
    this.setData({
      gender,
      avatarUrl: getImageUrl(getModelImagePath(gender)),
      modelDefaultUrl: getImageUrl(getModelImagePath(gender))
    })
    this.loadProfile()
  },

  loadProfile() {
    const gender = this.data.gender || 'female'
    const key = 'modelProfile_' + gender
    try {
      const raw = wx.getStorageSync(key)
      const s = (raw?.selectedStyles && Array.isArray(raw.selectedStyles))
        ? raw.selectedStyles
        : getApp().getStylePreference(gender)
      this.setData({
        nickname: raw?.nickname || '',
        height: raw?.height !== undefined && raw?.height !== '' ? String(raw.height) : '',
        weight: raw?.weight !== undefined && raw?.weight !== '' ? String(raw.weight) : '',
        bustWaistHip: raw?.bustWaistHip || '',
        selectedStyles: s || []
      })
    } catch (e) {}
  },

  onNicknameInput(e) {
    this.setData({ nickname: (e.detail && e.detail.value) || '' })
  },

  onHeightInput(e) {
    this.setData({ height: (e.detail && e.detail.value) || '' })
  },

  onWeightInput(e) {
    this.setData({ weight: (e.detail && e.detail.value) || '' })
  },

  onBustWaistHipInput(e) {
    this.setData({ bustWaistHip: (e.detail && e.detail.value) || '' })
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
    const { nickname, height, weight, bustWaistHip, selectedStyles, gender } = this.data
    const profile = {
      nickname: (nickname || '').trim(),
      height: (height || '').trim(),
      weight: (weight || '').trim(),
      bustWaistHip: (bustWaistHip || '').trim(),
      selectedStyles: selectedStyles || []
    }
    try {
      const g = gender || 'female'
      const key = 'modelProfile_' + g
      wx.setStorageSync(key, profile)
      getApp().saveUserGender(g)
      getApp().saveStylePreference(selectedStyles)
      wx.showToast({ title: '保存成功', icon: 'success' })
      setTimeout(() => wx.navigateBack(), 800)
    } catch (e) {
      wx.showToast({ title: '保存失败', icon: 'none' })
    }
  }
})
