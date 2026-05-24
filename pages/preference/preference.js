// 新用户偏好及资料收集页
Page({
  data: {
    statusBarHeight: 20,
    gender: 'female',
    age: 24,
    styleTags: ['日常休闲风'],
    showMoreStyles: false,
    moreStylesBtnText: '探索更多小众风格>'
  },

  onLoad(options) {
    try {
      const sys = wx.getSystemInfoSync()
      this.setData({ statusBarHeight: sys.statusBarHeight || 20 })
    } catch (e) {
      this.setData({ statusBarHeight: 20 })
    }
    if (options.guest === '1') {
      getApp().globalData.isGuestMode = true
    }
    const savedGender = getApp().getUserGender()
    if (savedGender) {
      this.setData({ gender: savedGender })
    }
  },

  selectGender(e) {
    const value = e.currentTarget.dataset.value
    this.setData({ gender: value })
  },

  onAgeChange(e) {
    const age = e.detail.value
    this.setData({ age: parseInt(age, 10) })
  },

  toggleStyle(e) {
    const id = e.currentTarget.dataset.id
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

  onNext() {
    const app = getApp()
    const gender = this.data.gender || 'female'
    const age = this.data.age || 24
    const styles = this.data.styleTags || []
    app.saveUserGender(gender)
    app.saveStylePreference(styles)
    const url = '/pages/role/role?gender=' + gender + '&age=' + age + '&styles=' + encodeURIComponent(JSON.stringify(styles))
    wx.navigateTo({ url })
  }
})
