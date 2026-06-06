// 穿搭偏好 - 不喜欢/喜欢的单品 + 年龄/风格偏好
const STYLE_OPTIONS_MAIN = [
  '日常休闲风', '法式风', '商务职场风', '运动风', '极简风', '复古风', '街头潮酷', '新中式'
]
const STYLE_OPTIONS_MORE = ['汉服', 'JK', '洛丽塔', 'Vintage', '山系户外']

Page({
  data: {
    statusBarHeight: 20,
    avoidItems: '',
    preferItems: '',
    age: 24,
    styleTags: ['日常休闲风'],
    showMoreStyles: false,
    moreStylesBtnText: '探索更多小众风格>'
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
    this.setData({
      avoidItems: (prefs.avoidItems || []).join('、'),
      preferItems: (prefs.preferItems || []).join('、'),
      age: prefs.age != null ? prefs.age : 24,
      styleTags: styles
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

  onAgeChange(e) {
    this.setData({ age: parseInt(e.detail.value, 10) })
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

  toggleMoreStyles() {
    const next = !this.data.showMoreStyles
    this.setData({
      showMoreStyles: next,
      moreStylesBtnText: next ? '收起' : '探索更多小众风格>'
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
    getApp().saveOutfitPreferences({
      avoidItems,
      preferItems,
      age: this.data.age || 24,
      styleTags
    })
    wx.showToast({ title: '已保存', icon: 'success' })
    setTimeout(() => wx.navigateBack(), 800)
  }
})
