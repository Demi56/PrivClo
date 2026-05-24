const { getImageUrl } = require('../../utils/image.js')
const { MAIN_MODEL, MAIN_DIARY, MAIN_MINE, reLaunchMain } = require('../../utils/mainTabs.js')

// 衣橱页面 - 我的衣橱
Page({
  data: {
    statusBarHeight: 20,
    avatarError: false,
    wardrobeImgSrc: '',
    wardrobeImgError: false,
    gender: 'female',
    currentWardrobe: '依依的衣橱',
    itemCount: 0,
    wardrobeList: [],
    currentIndex: 0,
    magicActive: false
  },

  _updateItemCountFromStorage() {
    const app = getApp()
    const items = app.getUserWardrobeItems ? app.getUserWardrobeItems() : {}
    let count = 0
    if (items && typeof items === 'object') {
      for (const key of Object.keys(items)) {
        const arr = items[key]
        if (Array.isArray(arr)) count += arr.length
      }
    }
    const list = this.data.wardrobeList || []
    const idx = this.data.currentIndex || 0
    const nextList = list.length ? list.map((item, i) => i === idx ? { ...item, items: count } : item) : [{ id: 1, name: this.data.currentWardrobe, items: count }]
    this.setData({ itemCount: count, wardrobeList: nextList })
  },

  onLoad(options) {
    try {
      const sys = wx.getSystemInfoSync()
      this.setData({ statusBarHeight: sys.statusBarHeight || 20 })
    } catch (e) {
      this.setData({ statusBarHeight: 20 })
    }
    const gender = options.gender || 'female'
    const roleName = getApp().getRoleDisplayName(gender)
    const wardrobeName = roleName + '的衣橱'
    const wardrobeList = [{ id: 1, name: wardrobeName, items: 0 }]
    this.setData({
      gender,
      currentWardrobe: wardrobeName,
      itemCount: 0,
      wardrobeList,
      wardrobeImgSrc: getImageUrl('/images/wardrobe/wardrobe-closet.png')
    }, () => this._updateItemCountFromStorage())
  },

  onShow() {
    const gender = this.data.gender || 'female'
    const roleName = getApp().getRoleDisplayName(gender)
    const wardrobeName = roleName + '的衣橱'
    const list = this.data.wardrobeList || []
    const idx = this.data.currentIndex || 0
    if (list.length > 0 && list[idx]) {
      const next = []
      for (let i = 0; i < list.length; i++) {
        next.push(i === idx ? { id: list[i].id, name: wardrobeName, items: list[i].items } : list[i])
      }
      this.setData({ currentWardrobe: wardrobeName, wardrobeList: next })
    } else {
      this.setData({ currentWardrobe: wardrobeName })
    }
    this._updateItemCountFromStorage()
  },

  onAvatarTap() {
    wx.showToast({ title: '头像', icon: 'none' })
  },

  onAvatarError() {
    this.setData({ avatarError: true })
  },

  onWardrobeImgError() {
    this.setData({ wardrobeImgError: true })
  },

  onPrevWardrobe() {
    const { currentIndex, wardrobeList } = this.data
    if (currentIndex > 0) {
      const idx = currentIndex - 1
      this.setData({
        currentIndex: idx,
        currentWardrobe: wardrobeList[idx].name,
        itemCount: wardrobeList[idx].items
      })
    }
  },

  onNextWardrobe() {
    const { currentIndex, wardrobeList } = this.data
    if (currentIndex < wardrobeList.length - 1) {
      const idx = currentIndex + 1
      this.setData({
        currentIndex: idx,
        currentWardrobe: wardrobeList[idx].name,
        itemCount: wardrobeList[idx].items
      })
    }
  },

  onOpenWardrobe() {
    this.setData({ magicActive: true })
    setTimeout(() => {
      this.setData({ magicActive: false })
      wx.navigateTo({ url: '/packageWardrobe/pages/wardrobe-inner/wardrobe-inner?gender=' + (this.data.gender || 'female') })
    }, 1000)
  },

  onTabHome() { reLaunchMain(MAIN_MODEL, this.data.gender) },
  onTabDiary() { reLaunchMain(MAIN_DIARY, this.data.gender) },
  onTabWardrobe() {},
  onTabMine() { reLaunchMain(MAIN_MINE, this.data.gender) }
})
