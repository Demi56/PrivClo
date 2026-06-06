const { getImageUrl } = require('../../utils/image.js')

const BOOT_SPRITE = getImageUrl('/images/boot-sprite.webp')
const SPRITE_FALLBACK = getImageUrl('/images/sprite.png')

// 登录引导页已隐藏，保留兼容跳转至首页
Page({
  data: {
    statusBarHeight: 20,
    spriteUrl: BOOT_SPRITE,
    spriteFallbackUrl: SPRITE_FALLBACK
  },

  onLoad() {
    const app = getApp()
    const g = app.getUserGender && app.getUserGender()
    const genderQ = (g === 'male' || g === 'female') ? '?gender=' + encodeURIComponent(g) : ''
    wx.redirectTo({ url: '/pages/model/model' + genderQ })
  }
})
