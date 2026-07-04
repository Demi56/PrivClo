const { getImageUrl } = require('../../../utils/image.js')

// 穿搭回顾 - 年度报告 / 穿搭回忆录（根据角色区分男女版本）
const FEMALE_DATA = {
  outfitImgSrc: '/packageMemoir/images/memoir/outfit-sample.png',
  headerIllusSrc: '/packageMemoir/images/memoir/header-illus.png',
  speechIllusSrc: '/packageMemoir/images/memoir/speech-illus.png',
  weatherDesc: '陪你度过了 280 个晴天，在这些日子里，你最爱搭配连衣长裙。',
  outfitName: '森林漫步套装',
  likeNum: 188,
  statsDesc: '留下了你的美丽身影',
  colorDesc: '温暖的大地色系是你的最爱',
  saveHours: 68,
  cityCount: 12
}

const MALE_DATA = {
  outfitImgSrc: '/packageMemoir/images/memoir/outfit-sample-male.png',
  headerIllusSrc: '/packageMemoir/images/memoir/header-illus-male.png',
  speechIllusSrc: '/packageMemoir/images/memoir/speech-illus-male.png',
  weatherDesc: '陪你度过了 280 个晴天，在这些日子里，你最爱搭配休闲卫衣。',
  outfitName: '都市型男套装',
  likeNum: 156,
  statsDesc: '留下了你的帅气身影',
  colorDesc: '低调的色系是你的首选',
  saveHours: 72,
  cityCount: 10
}

Page({
  data: {
    statusBarHeight: 20,
    gender: 'female',
    outfitImgSrc: '',
    headerIllusSrc: '',
    speechIllusSrc: '',
    weatherDesc: '',
    outfitName: '',
    likeNum: 0,
    statsDesc: '',
    colorDesc: '',
    saveHours: 0,
    cityCount: 0
  },

  onLoad(options) {
    try {
      const sys = wx.getSystemInfoSync()
      this.setData({ statusBarHeight: sys.statusBarHeight || 20 })
    } catch (e) {
      this.setData({ statusBarHeight: 20 })
    }
    const gender = (options.gender === 'male') ? 'male' : 'female'
    const raw = gender === 'male' ? MALE_DATA : FEMALE_DATA
    const data = {
      ...raw,
      outfitImgSrc: getImageUrl(raw.outfitImgSrc),
      headerIllusSrc: getImageUrl(raw.headerIllusSrc),
      speechIllusSrc: getImageUrl(raw.speechIllusSrc)
    }
    this.setData({ gender, ...data })
  },

  onBack() {
    wx.navigateBack()
  },

  onSave() {
    if (!getApp().requireGuestLoginForSave()) return
    wx.showToast({ title: '保存', icon: 'none' })
  },

  onSaveToAlbum() {
    if (!getApp().requireGuestLoginForSave()) return
    wx.showToast({ title: '保存到相册', icon: 'none' })
  },

  onShare() {
    wx.showShareMenu({ withShareTicket: true })
    wx.showToast({ title: '点击右上角分享', icon: 'none' })
  },

  onOutfitImgError() {
    if (this._memoirFallbackOutfit) return
    this._memoirFallbackOutfit = true
    // 子包实拍图 CDN/本地缺失时，用主包精灵图占位，避免白块
    this.setData({ outfitImgSrc: getImageUrl('/images/sprite.webp') })
  },

  onHeaderIllusError() {
    if (this._memoirFallbackHeader) return
    this._memoirFallbackHeader = true
    this.setData({ headerIllusSrc: getImageUrl('/images/sprite.webp') })
  },

  onSpeechIllusError() {
    if (this._memoirFallbackSpeech) return
    this._memoirFallbackSpeech = true
    this.setData({ speechIllusSrc: getImageUrl('/images/sprite.webp') })
  },

  onShareAppMessage() {
    return {
      title: '我的穿搭回忆录 - 年度报告',
      path: '/packageMemoir/pages/memoir/memoir?gender=' + (this.data.gender || 'female')
    }
  }
})
