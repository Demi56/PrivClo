// 穿搭偏好 - 不喜欢/喜欢的单品 + 风格偏好
const BUILTIN_STYLE_OPTIONS = [
  '日常休闲风', '法式风', '商务职场风', '运动风', '极简风', '复古风', '街头潮酷', '新中式',
  '汉服', 'JK', '洛丽塔', 'Vintage', '山系户外'
]

function buildStyleDisplayOptions(customStyleTags) {
  const custom = (customStyleTags || []).filter(function (name) {
    return name && BUILTIN_STYLE_OPTIONS.indexOf(name) < 0
  })
  return BUILTIN_STYLE_OPTIONS.concat(custom)
}

Page({
  data: {
    statusBarHeight: 20,
    avoidItems: '',
    preferItems: '',
    styleTags: ['日常休闲风'],
    styleDisplayOptions: BUILTIN_STYLE_OPTIONS.slice(),
    customStyleTags: [],
    showStyleAddPopup: false,
    editingStyleName: ''
  },

  onLoad() {
    try {
      const sys = wx.getSystemInfoSync()
      this.setData({ statusBarHeight: sys.statusBarHeight || 20 })
    } catch (e) {
      this.setData({ statusBarHeight: 20 })
    }
    const app = getApp()
    const prefs = app.getOutfitPreferences()
    let styles = prefs.styleTags && prefs.styleTags.length
      ? prefs.styleTags.slice()
      : (app.getStylePreference ? app.getStylePreference() : [])
    if (!styles || !styles.length) styles = ['日常休闲风']
    const customStyleTags = Array.isArray(prefs.customStyleTags) ? prefs.customStyleTags.slice() : []
    this.setData({
      avoidItems: (prefs.avoidItems || []).join('、'),
      preferItems: (prefs.preferItems || []).join('、'),
      styleTags: styles,
      customStyleTags,
      styleDisplayOptions: buildStyleDisplayOptions(customStyleTags)
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

  toggleStyle(e) {
    const id = e.currentTarget.dataset.id
    if (!id) return
    let list = this.data.styleTags || []
    const idx = list.indexOf(id)
    if (idx >= 0) {
      list = list.filter(function (item) { return item !== id })
    } else {
      list = list.concat(id)
    }
    this.setData({ styleTags: list })
  },

  onAddCustomStyle() {
    this.setData({ showStyleAddPopup: true, editingStyleName: '' })
  },

  onStyleNameInput(e) {
    this.setData({ editingStyleName: (e.detail && e.detail.value) || '' })
  },

  onCloseStyleAddPopup() {
    this.setData({ showStyleAddPopup: false, editingStyleName: '' })
  },

  onConfirmCustomStyle() {
    const name = (this.data.editingStyleName || '').trim()
    if (!name) {
      wx.showToast({ title: '请输入风格名称', icon: 'none' })
      return
    }
    if (name.length > 12) {
      wx.showToast({ title: '风格名称最多12字', icon: 'none' })
      return
    }
    const display = this.data.styleDisplayOptions || []
    if (display.indexOf(name) >= 0) {
      wx.showToast({ title: '该风格已存在', icon: 'none' })
      return
    }
    const customStyleTags = (this.data.customStyleTags || []).concat([name])
    const styleTags = (this.data.styleTags || []).concat([name])
    this.setData({
      customStyleTags,
      styleDisplayOptions: buildStyleDisplayOptions(customStyleTags),
      styleTags,
      showStyleAddPopup: false,
      editingStyleName: ''
    })
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
    const styleTags = (this.data.styleTags && this.data.styleTags.length)
      ? this.data.styleTags.slice()
      : ['日常休闲风']
    const current = getApp().getOutfitPreferences()
    getApp().saveOutfitPreferences({
      avoidItems,
      preferItems,
      age: current.age,
      styleTags,
      customStyleTags: this.data.customStyleTags || []
    })
    wx.showToast({ title: '已保存', icon: 'success' })
    setTimeout(() => wx.navigateBack(), 800)
  }
})
