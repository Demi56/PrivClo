const { MAIN_MODEL, MAIN_DIARY, MAIN_MINE, reLaunchMain } = require('../../utils/mainTabs.js')
const {
  resolveActiveTheme,
  refreshActiveThemeImage
} = require('../../utils/wardrobeTheme.js')
const { resolveWardrobeThemeTempUrl } = require('../../utils/pointsStoreImage.js')

// 衣橱页面 - 我的衣橱
Page({
  data: {
    statusBarHeight: 20,
    avatarError: false,
    wardrobeImgSrc: '',
    wardrobeImgError: false,
    wardrobeThemeIndex: 1,
    gender: 'female',
    currentWardrobe: '默认用户的衣橱',
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

  _refreshWardrobeThemeImage() {
    const theme = resolveActiveTheme()
    refreshActiveThemeImage().then((result) => {
      if (!result || !result.image) return
      this.setData({
        wardrobeImgSrc: result.image,
        wardrobeImgError: false,
        wardrobeThemeIndex: result.themeIndex || theme.themeIndex || 1
      })
    })
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
      wardrobeImgError: false
    }, () => {
      this._updateItemCountFromStorage()
      this._refreshWardrobeThemeImage()
    })
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
    this._refreshWardrobeThemeImage()
  },

  onAvatarTap() {
    wx.showToast({ title: '头像', icon: 'none' })
  },

  onAvatarError() {
    this.setData({ avatarError: true })
  },

  onWardrobeImgError() {
    const themeIndex = this.data.wardrobeThemeIndex || resolveActiveTheme().themeIndex || 1
    resolveWardrobeThemeTempUrl(themeIndex).then((url) => {
      if (!url) {
        this.setData({ wardrobeImgError: true })
        return
      }
      if (this.data.wardrobeImgSrc !== url) {
        this.setData({ wardrobeImgSrc: url, wardrobeImgError: false })
        return
      }
      this.setData({ wardrobeImgError: true })
    })
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
    if (this._openingWardrobe) return
    this._openingWardrobe = true
    const gender = this.data.gender || 'female'
    this.setData({ magicActive: true })
    setTimeout(() => {
      this.setData({ magicActive: false })
      wx.navigateTo({
        url: '/packageWardrobe/pages/category-detail/category-detail?category=tops&gender=' + encodeURIComponent(gender),
        complete: () => {
          this._openingWardrobe = false
        }
      })
    }, 600)
  },

  onTabHome() { reLaunchMain(MAIN_MODEL, this.data.gender) },
  onTabDiary() { reLaunchMain(MAIN_DIARY, this.data.gender) },
  onTabWardrobe() {},
  onTabMine() { reLaunchMain(MAIN_MINE, this.data.gender) }
})
