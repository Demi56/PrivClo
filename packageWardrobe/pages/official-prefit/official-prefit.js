// 智选衣橱展示区 - 查看官方预设搭配
Page({
  data: {
    statusBarHeight: 20,
    prefitStyles: [
      { id: 'casual', name: '休闲日常', desc: '简约舒适' },
      { id: 'office', name: '通勤职场', desc: '干练得体' },
      { id: 'date', name: '约会出游', desc: '甜美浪漫' },
      { id: 'sport', name: '运动活力', desc: '动感十足' }
    ]
  },

  onLoad(options) {
    try {
      const sys = wx.getSystemInfoSync()
      this.setData({ statusBarHeight: sys.statusBarHeight || 20 })
    } catch (e) {
      this.setData({ statusBarHeight: 20 })
    }
  },

  onBack() {
    wx.navigateBack()
  },

  onPrefitTap(e) {
    const id = e.currentTarget.dataset.id
    wx.showToast({ title: id + ' 风格开发中', icon: 'none' })
  }
})
