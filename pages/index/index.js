const { getImageUrl } = require('../../utils/image.js')

const BOOT_SPRITE = getImageUrl('/images/boot-sprite.webp')
const SPRITE_FALLBACK = getImageUrl('/images/sprite.png')

// 登录/注册引导页
Page({
  data: {
    statusBarHeight: 20,
    spriteUrl: BOOT_SPRITE,
    spriteFallbackUrl: SPRITE_FALLBACK
  },

  onLoad() {
    const sys = wx.getSystemInfoSync()
    this.setData({ statusBarHeight: sys.statusBarHeight || 20 })
  },

  onSpriteError() {
    if (this.data.spriteUrl !== this.data.spriteFallbackUrl) {
      this.setData({ spriteUrl: this.data.spriteFallbackUrl })
    }
  },

  onLogin() {
    wx.navigateTo({ url: '/pages/login/login' })
  },

  onGuest() {
    wx.navigateTo({ url: '/pages/preference/preference?guest=1' })
  }
})
