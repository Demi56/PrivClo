const { getImageUrl } = require('../../../utils/image.js')

// 背景选择 - 我的背景，仅公园小路卡片
Page({
  data: {
    statusBarHeight: 20,
    currentBgImage: '',
    displayList: [
      { id: '12', name: '公园小路', image: getImageUrl('/images/points-store/bg/2.jpeg') },
      { id: '19', name: '深秋公园', image: getImageUrl('/images/points-store/bg/4.jpeg') }
    ]
  },

  _loadCurrentBg() {
    try {
      const bg = wx.getStorageSync('homeBgImage') || ''
      this.setData({ currentBgImage: bg })
    } catch (e) {}
  },

  onBack() {
    wx.navigateBack()
  },

  onLoad() {
    try {
      const sys = wx.getSystemInfoSync()
      this.setData({ statusBarHeight: sys.statusBarHeight || 20 })
    } catch (e) {
      this.setData({ statusBarHeight: 20 })
    }
    this._loadCurrentBg()
  },

  onShow() {
    this._loadCurrentBg()
  },

  onUse(e) {
    const image = e.currentTarget.dataset.image
    if (!image) return
    const isUsed = this.data.currentBgImage === image

    if (isUsed) {
      wx.showModal({
        title: '取消使用',
        content: '是否取消使用该背景？',
        confirmText: '确认取消',
        cancelText: '取消',
        success: (res) => {
          if (res.confirm) {
            try {
              wx.removeStorageSync('homeBgImage')
              this.setData({ currentBgImage: '' })
              wx.showToast({ title: '已取消使用', icon: 'success' })
            } catch (err) {
              wx.showToast({ title: '操作失败', icon: 'none' })
            }
          }
        }
      })
    } else {
      wx.showModal({
        title: '更换背景',
        content: '是否更换首页背景？',
        confirmText: '同意',
        cancelText: '取消',
        success: (res) => {
          if (res.confirm) {
            try {
              wx.setStorageSync('homeBgImage', image)
              this.setData({ currentBgImage: image })
              wx.showToast({ title: '已应用背景', icon: 'success' })
            } catch (err) {
              wx.showToast({ title: '设置失败', icon: 'none' })
            }
          }
        }
      })
    }
  }
})
