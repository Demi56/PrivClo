const { getImageUrl } = require('../../../utils/image.js')

// 闲置转卖 - 精灵管家 + 对话气泡 + 闲置统计
Page({
  data: {
    statusBarHeight: 20,
    idleCount: 3,
    idleDays: 456,
    spriteError: false,
    spriteUrl: '',
    spriteFallbackUrl: ''
  },

  onLoad(options) {
    try {
      const sys = wx.getSystemInfoSync()
      this.setData({
        statusBarHeight: sys.statusBarHeight || 20,
        spriteUrl: getImageUrl('/packageWardrobe/images/resale/sprite.png'),
        spriteFallbackUrl: getImageUrl('/images/sprite.png')
      })
    } catch (e) {
      this.setData({
        statusBarHeight: 20,
        spriteUrl: getImageUrl('/packageWardrobe/images/resale/sprite.png'),
        spriteFallbackUrl: getImageUrl('/images/sprite.png')
      })
    }
  },

  onSpriteError() {
    this.setData({ spriteError: true })
  },

  onBack() {
    wx.navigateBack()
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
