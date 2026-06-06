const { getImageUrl } = require('../../../utils/image.js')
const { getModelImagePath } = require('../../../utils/clothingPositions.js')
const tryonFavorite = require('../../../utils/tryonFavorite.js')
const wardrobeNav = require('../../../utils/wardrobeNav.js')

// 收藏区试穿页 - 顶部实时试穿区不变，中下部为筛选栏 + 搭配卡片网格
Page({
  data: {
    statusBarHeight: 20,
    headerHeightPx: 48,
    wardrobeNavTab: wardrobeNav.TAB.FAVORITES,
    tryonExpanded: true,
    scrollAreaTop: 0,
    scrollAreaBottom: 0,
    gender: 'female',
    tryonItems: [],
    tryonItemSlots: [],
    selectedTryonSlotIndex: -1,
    modelDisplaySrc: '',
    modelImgSrc: '',
    tryonFavorited: false,
    filterActive: 'all',
    outfitCards: [
      { id: '1', outfitKey: 'warm', image: '/images/model/outfits/female-warm.png', tags: ['秋季', '通勤', '日常休闲'], title: '', date: '2025-10-24', season: '秋季', scene: '通勤', style: '日常休闲', favorited: true, tryonPrimary: false },
      { id: '2', outfitKey: 'cold', image: '/images/model/outfits/female-cold.png', tags: ['冬季', '约会', '法式'], title: '', date: '2025-12-12', season: '冬季', scene: '约会', style: '法式', favorited: true, tryonPrimary: false },
      { id: '3', outfitKey: 'hot', image: '/images/model/outfits/female-hot.png', tags: ['夏季', '旅游', '日常休闲'], title: '', date: '2025-07-05', season: '夏季', scene: '旅游', style: '日常休闲', favorited: true, tryonPrimary: false },
      { id: '4', outfitKey: 'cool', image: '/images/model/outfits/female-cool.png', tags: ['春季', '晚宴', '极简'], title: '', date: '2025-09-18', season: '春季', scene: '晚宴', style: '极简', favorited: true, tryonPrimary: false }
    ],
    officialOutfitCards: [],
    allOutfitCards: [],
    showDatePopup: false,
    showSeasonPopup: false,
    showScenePopup: false,
    showStylePopup: false,
    seasonOptions: ['春季', '夏季', '秋季', '冬季'],
    selectedSeasonIndex: 0,
    sceneOptions: ['通勤', '约会', '旅游', '运动', '宅家', '晚宴'],
    selectedSceneIndex: 0,
    styleOptions: ['日常休闲', '法式', '极简', '复古', '潮酷', '新中式'],
    selectedStyleIndex: 0,
    dateFilterYears: [2024, 2025, 2026, 2027, 2028, 2029, 2030, 2031, 2032, 2033, 2034, 2035],
    dateFilterMonths: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12],
    datePickerYearIndex: 0,
    datePickerMonthIndex: 0,
    showFavoriteTagPopup: false,
    favoriteTagSeasonIndex: 0,
    favoriteTagSceneIndex: 0,
    favoriteTagStyleIndex: 0
  },

  onLoad(options) {
    let statusBarHeight = 20
    let scrollAreaTop = 340
    let scrollAreaBottom = 16
    try {
      const sys = wx.getSystemInfoSync()
      statusBarHeight = sys.statusBarHeight || 20
      const w = sys.windowWidth || 375
      const safeBottom = (sys.safeAreaInsets && sys.safeAreaInsets.bottom) || 0
      const rpx2px = w / 750
      const headerHeightPx = (24 + 72) * rpx2px
      const toggleBarRpx = 88
      const tryonHeightExpanded = statusBarHeight + headerHeightPx + (20 + 50 + 12 + 450 + 12 + toggleBarRpx) * rpx2px
      const tryonHeightCollapsed = statusBarHeight + headerHeightPx + toggleBarRpx * rpx2px
      scrollAreaTop = Math.ceil(tryonHeightExpanded)
      scrollAreaBottom = Math.ceil(safeBottom) || 16
      this.setData({
        statusBarHeight,
        headerHeightPx,
        scrollAreaTop,
        scrollAreaBottom,
        scrollAreaTopExpanded: Math.ceil(tryonHeightExpanded),
        scrollAreaTopCollapsed: Math.ceil(tryonHeightCollapsed)
      })
    } catch (e) {
      const scrollAreaTopExpanded = statusBarHeight + 48 + 340
      const scrollAreaTopCollapsed = statusBarHeight + 48 + 44
      this.setData({
        statusBarHeight,
        headerHeightPx: 48,
        scrollAreaTop: scrollAreaTopExpanded,
        scrollAreaBottom,
        scrollAreaTopExpanded,
        scrollAreaTopCollapsed
      })
    }
    const app = getApp()
    const gender = options.gender || app.globalData.modelGender || 'female'
    if (!app.globalData.favoritesTryonItemSlots || !Array.isArray(app.globalData.favoritesTryonItemSlots)) {
      app.globalData.favoritesTryonItemSlots = Array(9).fill('')
    }
    const tryonItemSlots = app.globalData.favoritesTryonItemSlots.slice()
    const tryonItems = tryonItemSlots.filter(function (s) { return s })
    const modelDisplaySrc = app.globalData.modelDisplaySrc || ''
    const modelImgSrc = modelDisplaySrc || getImageUrl(getModelImagePath(gender))
    const savedFavorites = app.getFavoriteOutfits ? app.getFavoriteOutfits() : []
    let cards = savedFavorites.length
      ? this._applyGenderToCards(savedFavorites, gender)
      : [{ id: '_empty', isEmptyPlaceholder: true }]
    this.setData({
      gender,
      tryonItems,
      tryonItemSlots,
      modelDisplaySrc,
      modelImgSrc,
      outfitCards: cards,
      allOutfitCards: cards
    })
  },

  _applyGenderToCards(cards, gender) {
    const g = gender === 'male' ? 'male' : 'female'
    return (cards || []).map(function (c) {
      if (c.isEmptyPlaceholder) return c
      const key = c.outfitKey || (c.image ? c.image.replace(/.*\/(?:female|male)-([^.]+)\.png$/, '$1') || 'warm' : 'warm')
      var tags = [c.season, c.scene, c.style].filter(Boolean)
      if (tags.length === 0 && c.tags && c.tags.length) tags = c.tags
      return Object.assign({}, c, { outfitKey: key, image: getImageUrl('/images/model/outfits/' + g + '-' + key + '.png'), tags: tags })
    })
  },

  onGoToCollect() {
    wx.navigateBack()
  },

  _getFilteredOutfitCards(allCards, filterActive) {
    const emptyPlaceholder = (allCards || []).find(function (c) { return c && c.isEmptyPlaceholder })
    const keepEmptyIfNoMatch = function (filtered) {
      if (emptyPlaceholder && filtered.length === 0) return [emptyPlaceholder]
      return filtered
    }
    if (filterActive === 'all' || !allCards.length) return allCards
    if (filterActive === 'date') {
      const years = this.data.dateFilterYears
      const months = this.data.dateFilterMonths
      const yi = this.data.datePickerYearIndex
      const mi = this.data.datePickerMonthIndex
      const prefix = years[yi] + '-' + (months[mi] < 10 ? '0' + months[mi] : '' + months[mi])
      return keepEmptyIfNoMatch(allCards.filter(function (c) { return c.date && c.date.substring(0, 7) === prefix }))
    }
    if (filterActive === 'season') {
      const opt = this.data.seasonOptions || []
      const season = opt[this.data.selectedSeasonIndex]
      return keepEmptyIfNoMatch(allCards.filter(function (c) { return c.season === season }))
    }
    if (filterActive === 'scene') {
      const opt = this.data.sceneOptions || []
      const scene = opt[this.data.selectedSceneIndex]
      return keepEmptyIfNoMatch(allCards.filter(function (c) { return c.scene === scene }))
    }
    if (filterActive === 'style') {
      const opt = this.data.styleOptions || []
      const style = opt[this.data.selectedStyleIndex]
      return keepEmptyIfNoMatch(allCards.filter(function (c) { return c.style === style }))
    }
    return allCards
  },

  onFilterBarShield() {
  },

  onFilterTap(e) {
    const id = e.currentTarget.dataset.id
    if (id === 'all') {
      const all = this.data.allOutfitCards || this.data.outfitCards
      this.setData({ filterActive: 'all', outfitCards: all })
    } else {
      wx.showToast({ title: id === 'date' ? '日期' : id === 'season' ? '季节' : id === 'scene' ? '场景' : '风格', icon: 'none' })
    }
  },

  onDateChevronTap() {
    const allYears = this.data.dateFilterYears || []
    const yearRanges = [
      { label: '2024-2027年', years: [2024, 2025, 2026, 2027] },
      { label: '2028-2031年', years: [2028, 2029, 2030, 2031] },
      { label: '2032-2035年', years: [2032, 2033, 2034, 2035] }
    ]
    const rangeItems = yearRanges.map(function (r) { return r.label }).concat(['不限'])
    const page = this
    setTimeout(function () {
      wx.showActionSheet({
        itemList: rangeItems,
        success: (res) => {
          const all = page.data.allOutfitCards || []
          const emptyPh = all.find(function (c) { return c && c.isEmptyPlaceholder })
          if (res.tapIndex === rangeItems.length - 1) {
            page.setData({ filterActive: 'all', outfitCards: all })
            wx.showToast({ title: '已取消日期筛选', icon: 'none' })
            return
          }
          const range = yearRanges[res.tapIndex]
          const yearItems = range.years.map(function (y) { return y + '年' })
          wx.showActionSheet({
            itemList: yearItems,
            success: (res2) => {
              const year = range.years[res2.tapIndex]
              const monthPart1 = ['1月', '2月', '3月', '4月', '5月', '6月']
              const monthPart2 = ['7月', '8月', '9月', '10月', '11月', '12月']
              const monthRange = ['1-6月', '7-12月']
              wx.showActionSheet({
                itemList: monthRange,
                success: (res3) => {
                  const partItems = res3.tapIndex === 0 ? monthPart1 : monthPart2
                  wx.showActionSheet({
                    itemList: partItems,
                    success: (res4) => {
                      const month = res3.tapIndex === 0 ? res4.tapIndex + 1 : res4.tapIndex + 7
                      const prefix = year + '-' + (month < 10 ? '0' + month : '' + month)
                      let result = all.filter(function (c) { return c.date && c.date.substring(0, 7) === prefix })
                      if (emptyPh && result.length === 0) result = [emptyPh]
                      const yi = allYears.indexOf(year)
                      page.setData({
                        datePickerYearIndex: yi >= 0 ? yi : 0,
                        datePickerMonthIndex: month - 1,
                        filterActive: 'date',
                        outfitCards: result
                      })
                      wx.showToast({ title: '已按日期筛选', icon: 'none' })
                    }
                  })
                }
              })
            }
          })
        },
        fail: () => {
          page.setData({ filterActive: 'all', outfitCards: page.data.allOutfitCards || [] })
        }
      })
    }, 400)
  },

  onSeasonChevronTap() {
    const opts = (this.data.seasonOptions || []).concat(['不限'])
    const page = this
    setTimeout(function () {
      wx.showActionSheet({
        itemList: opts,
        success: (res) => {
          const all = page.data.allOutfitCards || []
          const emptyPh = all.find(function (c) { return c && c.isEmptyPlaceholder })
          if (res.tapIndex === opts.length - 1) {
            page.setData({ filterActive: 'all', outfitCards: all })
            wx.showToast({ title: '已取消季节筛选', icon: 'none' })
            return
          }
          const season = opts[res.tapIndex]
          let filtered = all.filter(function (c) { return c.season === season })
          if (emptyPh && filtered.length === 0) filtered = [emptyPh]
          page.setData({
            selectedSeasonIndex: res.tapIndex,
            filterActive: 'season',
            outfitCards: filtered
          })
          wx.showToast({ title: '已按季节筛选', icon: 'none' })
        }
      })
    }, 150)
  },

  onSceneChevronTap() {
    const opts = this.data.sceneOptions || []
    if (opts.length === 0) return
    const page = this
    setTimeout(function () {
      wx.showActionSheet({
        itemList: opts,
        success: (res) => {
          const all = page.data.allOutfitCards || []
          const emptyPh = all.find(function (c) { return c && c.isEmptyPlaceholder })
          const scene = opts[res.tapIndex]
          let filtered = all.filter(function (c) { return c.scene === scene })
          if (emptyPh && filtered.length === 0) filtered = [emptyPh]
          page.setData({
            selectedSceneIndex: res.tapIndex,
            filterActive: 'scene',
            outfitCards: filtered
          })
          wx.showToast({ title: '已按场景筛选', icon: 'none' })
        },
        fail: () => {
          page.setData({ filterActive: 'all', outfitCards: page.data.allOutfitCards || [] })
          wx.showToast({ title: '已取消场景筛选', icon: 'none' })
        }
      })
    }, 150)
  },

  onStyleChevronTap() {
    const opts = this.data.styleOptions || []
    if (opts.length === 0) return
    const page = this
    setTimeout(function () {
      wx.showActionSheet({
        itemList: opts,
        success: (res) => {
          const all = page.data.allOutfitCards || []
          const emptyPh = all.find(function (c) { return c && c.isEmptyPlaceholder })
          const style = opts[res.tapIndex]
          let filtered = all.filter(function (c) { return c.style === style })
          if (emptyPh && filtered.length === 0) filtered = [emptyPh]
          page.setData({
            selectedStyleIndex: res.tapIndex,
            filterActive: 'style',
            outfitCards: filtered
          })
          wx.showToast({ title: '已按风格筛选', icon: 'none' })
        },
        fail: () => {
          page.setData({ filterActive: 'all', outfitCards: page.data.allOutfitCards || [] })
          wx.showToast({ title: '已取消风格筛选', icon: 'none' })
        }
      })
    }, 150)
  },

  onOutfitFavorite(e) {
    const id = e.currentTarget.dataset.id
    const list = this.data.outfitCards || []
    const all = this.data.allOutfitCards || []
    const app = getApp()
    var target = null
    for (var i = 0; i < list.length; i++) { if (list[i].id === id) { target = list[i]; break } }
    if (!target || target.isEmptyPlaceholder) return
    if (target.favorited) {
      wx.showModal({
        title: '提示',
        content: '取消收藏后，穿搭内容会被从收藏区删除，是否确认？',
        confirmText: '确认',
        cancelText: '取消',
        success: (res) => {
          if (res.confirm) {
            const cards = list.filter(function (c) { return c.id !== id })
            const allCards = all.filter(function (c) { return c.id !== id })
            const saved = (app.getFavoriteOutfits ? app.getFavoriteOutfits() : []).filter(function (c) { return c.id !== id })
            if (app.saveFavoriteOutfits) app.saveFavoriteOutfits(saved)
            this.setData({ outfitCards: cards, allOutfitCards: allCards })
            wx.showToast({ title: '已取消收藏', icon: 'none' })
          }
        }
      })
      return
    }
    const cards = list.map(function (c) {
      if (c.id !== id) return c
      return { id: c.id, outfitKey: c.outfitKey, image: c.image, tags: c.tags, title: c.title, date: c.date, season: c.season, scene: c.scene, style: c.style, favorited: true, tryonPrimary: c.tryonPrimary }
    })
    const allCards = all.map(function (c) {
      if (c.id !== id) return c
      return { id: c.id, outfitKey: c.outfitKey, image: c.image, tags: c.tags, title: c.title, date: c.date, season: c.season, scene: c.scene, style: c.style, favorited: true, tryonPrimary: c.tryonPrimary }
    })
    this.setData({ outfitCards: cards, allOutfitCards: allCards })
    const toSave = { id: target.id, outfitKey: target.outfitKey, image: target.image, tags: target.tags, title: target.title, date: target.date, season: target.season, scene: target.scene, style: target.style, favorited: true, tryonPrimary: target.tryonPrimary }
    const saved = app.getFavoriteOutfits ? app.getFavoriteOutfits() : []
    const existing = saved.filter(function (c) { return c.id !== id })
    existing.push(toSave)
    if (app.saveFavoriteOutfits) app.saveFavoriteOutfits(existing)
    wx.showToast({ title: '已收藏', icon: 'none' })
  },

  onOutfitTryOn(e) {
    const id = e.currentTarget.dataset.id
    wx.showToast({ title: '穿上', icon: 'none' })
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

  onTryonToggleTap() {
    try {
      const expanded = !this.data.tryonExpanded
      const topExpanded = this.data.scrollAreaTopExpanded
      const topCollapsed = this.data.scrollAreaTopCollapsed
      const scrollAreaTop = expanded
        ? (typeof topExpanded === 'number' ? topExpanded : 400)
        : (typeof topCollapsed === 'number' ? topCollapsed : 140)
      // 延迟 setData 避免点击穿透导致意外跳转
      setTimeout(() => {
        this.setData({ tryonExpanded: expanded, scrollAreaTop })
      }, 150)
    } catch (e) {
      console.error('onTryonToggleTap error', e)
    }
  },

  onShow() {
    const app = getApp()
    const newGender = app.globalData.modelGender || this.data.gender || 'female'
    if (app.globalData.modelDisplaySrc) {
      this.setData({ modelDisplaySrc: app.globalData.modelDisplaySrc, modelImgSrc: app.globalData.modelDisplaySrc })
    }
    if (app.globalData.favoritesTryonItemSlots && Array.isArray(app.globalData.favoritesTryonItemSlots)) {
      const tryonItemSlots = app.globalData.favoritesTryonItemSlots.slice()
      const tryonItems = tryonItemSlots.filter(function (s) { return s })
      this.setData({ tryonItemSlots, tryonItems })
    }
    const savedFavorites = app.getFavoriteOutfits ? app.getFavoriteOutfits() : []
    let cards = savedFavorites.length
      ? this._applyGenderToCards(savedFavorites, newGender)
      : [{ id: '_empty', isEmptyPlaceholder: true }]
    const filtered = this._getFilteredOutfitCards(cards, this.data.filterActive)
    this.setData({ gender: newGender, allOutfitCards: cards, outfitCards: filtered })
  },

  onModelTap() {
    const gender = getApp().globalData.modelGender || this.data.gender || 'female'
    wx.navigateTo({ url: '/pages/model/model?gender=' + gender })
  },

  onTryonFavorite() {
    const next = !this.data.tryonFavorited
    this.setData({ tryonFavorited: next })
    if (next) {
      this.setData({
        showFavoriteTagPopup: true,
        favoriteTagSeasonIndex: 0,
        favoriteTagSceneIndex: 0,
        favoriteTagStyleIndex: 0
      })
    } else {
      wx.showToast({ title: '已取消收藏', icon: 'none' })
    }
  },

  onCloseFavoriteTagPopup() {
    this.setData({ showFavoriteTagPopup: false, tryonFavorited: false })
  },

  onFavoriteTagSeasonTap(e) {
    const index = e.currentTarget.dataset.index
    if (index !== undefined) this.setData({ favoriteTagSeasonIndex: index })
  },

  onFavoriteTagSceneTap(e) {
    const index = e.currentTarget.dataset.index
    if (index !== undefined) this.setData({ favoriteTagSceneIndex: index })
  },

  onFavoriteTagStyleTap(e) {
    const index = e.currentTarget.dataset.index
    if (index !== undefined) this.setData({ favoriteTagStyleIndex: index })
  },

  onFavoriteTagConfirm() {
    if (!getApp().requireGuestLoginForSave()) {
      this.setData({ tryonFavorited: false, showFavoriteTagPopup: false })
      return
    }
    const slots = (this.data.tryonItemSlots || []).filter(function (s) { return s })
    const image = this.data.modelDisplaySrc || this.data.modelImgSrc || ''
    const outfit = tryonFavorite.saveTryonFavoriteFromTags({
      image: image,
      slots: slots,
      seasonIndex: this.data.favoriteTagSeasonIndex,
      sceneIndex: this.data.favoriteTagSceneIndex,
      styleIndex: this.data.favoriteTagStyleIndex,
      source: 'tryon'
    })
    if (!outfit) {
      this.setData({ tryonFavorited: false, showFavoriteTagPopup: false })
      return
    }
    const app = getApp()
    if (slots.length) app.globalData.favoritesTryonItemSlots = slots.slice()
    this.setData({ showFavoriteTagPopup: false, tryonFavorited: true })
    const gender = this.data.gender || 'female'
    const savedFavorites = tryonFavorite.getFavoriteOutfits()
    let cards = savedFavorites.length
      ? this._applyGenderToCards(savedFavorites, gender)
      : [{ id: '_empty', isEmptyPlaceholder: true }]
    this.setData({ outfitCards: cards, allOutfitCards: cards, filterActive: 'all' })
    wx.showToast({ title: '已保存到收藏区', icon: 'success' })
  },

  onFavoriteTagCancel() {
    this.setData({ showFavoriteTagPopup: false, tryonFavorited: false })
  },

  onTryOn() {
    const app = getApp()
    if (app.incrementStyledCount) app.incrementStyledCount()
    const g = this.data.gender || 'female'
    const slots = (this.data.tryonItemSlots || []).slice()
    app.globalData.tryonItemSlots = slots.length ? slots.slice() : (app.globalData.favoritesTryonItemSlots || []).slice()
    app.globalData.favoritesTryonItemSlots = app.globalData.tryonItemSlots
    app.globalData.tryonLaunchContext = {
      activeTab: 'tops',
      categoryId: 'tops',
      prefitMode: this.data.prefitMode || 'official',
      categoryTabs: []
    }
    wx.navigateTo({
      url: '/pages/tryon/tryon?gender=' + encodeURIComponent(g),
      fail: function (err) {
        console.error('favorites tryon navigateTo fail', err)
        wx.showToast({ title: '无法打开试穿页', icon: 'none' })
      }
    })
  },

  onSlotTap(e) {
    var idx = e.currentTarget.dataset.index
    if (idx === undefined) return
    var slots = this.data.tryonItemSlots || []
    if (!slots[idx]) return
    var current = this.data.selectedTryonSlotIndex
    this.setData({ selectedTryonSlotIndex: current === idx ? -1 : idx })
  },

  onRemoveTryonItem(e) {
    var idx = e.currentTarget.dataset.index
    if (idx === undefined) return
    var slots = this.data.tryonItemSlots || []
    var newSlots = slots.slice()
    newSlots[idx] = ''
    var filled = newSlots.filter(function (s) { return s })
    var minLen = Math.max(9, filled.length)
    var tryonItemSlots = filled.concat(Array(Math.max(0, minLen - filled.length)).fill(''))
    getApp().globalData.favoritesTryonItemSlots = tryonItemSlots
    this.setData({ tryonItemSlots, tryonItems: filled, selectedTryonSlotIndex: -1 })
  }
})
