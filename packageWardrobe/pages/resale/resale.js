const { getImageUrl } = require('../../../utils/image.js')
const wardrobeNav = require('../../utils/wardrobeNav.js')

// 闲置转卖 - 精灵管家 + 对话气泡 + 闲置统计
Page({
  data: {
    statusBarHeight: 20,
    gender: 'female',
    wardrobeNavTab: wardrobeNav.TAB.RESALE,
    idleCount: 3,
    idleDays: 456,
    spriteError: false,
    spriteUrl: '',
    spriteFallbackUrl: ''
  },

  onLoad(options) {
    const gender = options.gender || 'female'
    try {
      const sys = wx.getSystemInfoSync()
      this.setData({
        gender,
        statusBarHeight: sys.statusBarHeight || 20,
        spriteUrl: getImageUrl('/packageWardrobe/images/resale/sprite.png'),
        spriteFallbackUrl: getImageUrl('/images/sprite.webp')
      })
    } catch (e) {
      this.setData({
        gender,
        statusBarHeight: 20,
        spriteUrl: getImageUrl('/packageWardrobe/images/resale/sprite.png'),
        spriteFallbackUrl: getImageUrl('/images/sprite.webp')
      })
    }
  },

  onSpriteError() {
    this.setData({ spriteError: true })
  },

  onBack() {
    wx.navigateBack()
  },

  onWardrobeNavTap(e) {
    const tab = e.currentTarget.dataset.tab
    wardrobeNav.navigateWardrobeTab(tab, {
      gender: this.data.gender || 'female',
      current: this.data.wardrobeNavTab
    })
  },

  onXianyuTap() {
    wx.showToast({ title: '发布到闲鱼功能开发中', icon: 'none' })
  },

  onZhuanzhuanTap() {
    wx.showToast({ title: '转转一键转卖功能开发中', icon: 'none' })
  },

  onBatchProcess() {
    wx.showToast({ title: '批量处理功能开发中', icon: 'none' })
  }
})
