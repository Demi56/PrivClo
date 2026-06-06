const { getImageUrl } = require('../../utils/image.js')
const { MAIN_MODEL, MAIN_WARDROBE, MAIN_MINE, reLaunchMain } = require('../../utils/mainTabs.js')
const DIARY_STORAGE_KEY = 'diary_pages'

// 日记页面 - 我的日记本
Page({
  data: {
    statusBarHeight: 20,
    avatarError: false,
    diaryImgSrc: '',
    diaryImgError: false,
    gender: 'female',
    currentDiary: '默认用户的穿搭日记',
    pageCount: 1,
    showSampleHint: true,
    diaryList: [],
    currentIndex: 0,
    magicActive: false
  },

  _updatePageCountFromStorage() {
    try {
      const cached = wx.getStorageSync(DIARY_STORAGE_KEY)
      const stored = cached && typeof cached === 'string' ? JSON.parse(cached) : cached
      const pages = stored?.pages || []
      const count = pages.length
      if (count > 0) {
        const list = this.data.diaryList || []
        const idx = this.data.currentIndex || 0
        const nextList = list.length ? list.map((item, i) => i === idx ? { ...item, pages: count } : item) : [{ id: 1, name: this.data.currentDiary, pages: count }]
        this.setData({ pageCount: count, showSampleHint: false, diaryList: nextList })
      } else {
        const list = this.data.diaryList || []
        const idx = this.data.currentIndex || 0
        const nextList = list.length ? list.map((item, i) => i === idx ? { ...item, pages: 1 } : item) : [{ id: 1, name: this.data.currentDiary, pages: 1 }]
        this.setData({ pageCount: 1, showSampleHint: true, diaryList: nextList })
      }
    } catch (e) {
      this.setData({ pageCount: 1, showSampleHint: true })
    }
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
    const diaryName = roleName + '的穿搭日记'
    const diaryList = [{ id: 1, name: diaryName, pages: 1 }]
    this.setData({
      gender,
      currentDiary: diaryName,
      diaryList,
      diaryImgSrc: getImageUrl('/images/diary/diary-book.png')
    }, () => this._updatePageCountFromStorage())
  },

  onShow() {
    const gender = this.data.gender || 'female'
    const roleName = getApp().getRoleDisplayName(gender)
    const diaryName = roleName + '的穿搭日记'
    const list = this.data.diaryList || []
    const idx = this.data.currentIndex || 0
    if (list.length > 0 && list[idx]) {
      const next = []
      for (let i = 0; i < list.length; i++) {
        next.push(i === idx ? { id: list[i].id, name: diaryName, pages: list[i].pages } : list[i])
      }
      this.setData({ currentDiary: diaryName, diaryList: next })
    } else {
      this.setData({ currentDiary: diaryName })
    }
    this._updatePageCountFromStorage()
  },

  onAvatarTap() {
    wx.showToast({ title: '头像', icon: 'none' })
  },

  onAvatarError() {
    this.setData({ avatarError: true })
  },

  onDiaryImgError() {
    this.setData({ diaryImgError: true })
  },

  onPrevDiary() {
    const { currentIndex, diaryList } = this.data
    if (currentIndex > 0) {
      const idx = currentIndex - 1
      this.setData({
        currentIndex: idx,
        currentDiary: diaryList[idx].name,
        pageCount: diaryList[idx].pages
      })
    }
  },

  onNextDiary() {
    const { currentIndex, diaryList } = this.data
    if (currentIndex < diaryList.length - 1) {
      const idx = currentIndex + 1
      this.setData({
        currentIndex: idx,
        currentDiary: diaryList[idx].name,
        pageCount: diaryList[idx].pages
      })
    }
  },

  onOpenDiary() {
    this.setData({ magicActive: true })
    setTimeout(() => {
      this.setData({ magicActive: false })
      wx.navigateTo({ url: '/packageDiary/pages/diary-calendar/diary-calendar?gender=' + (this.data.gender || 'female') })
    }, 1000)
  },

  onTabHome() { reLaunchMain(MAIN_MODEL, this.data.gender) },
  onTabDiary() {},
  onTabWardrobe() { reLaunchMain(MAIN_WARDROBE, this.data.gender) },
  onTabMine() { reLaunchMain(MAIN_MINE, this.data.gender) }
})
