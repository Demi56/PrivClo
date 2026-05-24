// 日记内页（天气逻辑与 diary-calendar 保持一致）
const WEEK_NAMES = ['周日', '周一', '周二', '周三', '周四', '周五', '周六']
const WEATHER_TYPES = ['sunny', 'cloudy', 'overcast', 'rainy', 'haze']
const WEATHER_MAP = { sunny: '晴天', cloudy: '阴天', overcast: '多云', rainy: '雨天', haze: '雾霾' }
const DEFAULT_CONTENT = '示例文案：今天天气真好，穿了新买的毛衣，感觉整个人都暖洋洋的。去公园散步的时候遇到了一只超级可爱的小狗🐶。\n中午吃了好吃的舒芙蕾，太幸福了～'

const FLIP_DURATION = 1200
const STORAGE_KEY = 'diary_pages'

function getWeatherForDay(year, month, day) {
  const seed = year * 10000 + month * 100 + day
  const idx = seed % WEATHER_TYPES.length
  return WEATHER_TYPES[idx]
}

// 贴纸分类与素材
const STICKER_CATEGORIES = [
  { id: 'weather', name: '天气' },
  { id: 'mood', name: '心情' },
  { id: 'food', name: '美食' },
  { id: 'decor', name: '装饰' },
  { id: 'corner', name: '角' }
]

const STICKER_LIBRARY = {
  weather: [
    { id: 'w1', emoji: '🌧️', name: '雨' },
    { id: 'w2', emoji: '☀️', name: '晴' },
    { id: 'w3', emoji: '⛈️', name: '雷雨' },
    { id: 'w4', emoji: '🌙', name: '月' },
    { id: 'w5', emoji: '💨', name: '风' },
    { id: 'w6', emoji: '❄️', name: '雪' },
    { id: 'w7', emoji: '🌈', name: '彩虹' },
    { id: 'w8', emoji: '☂️', name: '伞' },
    { id: 'w9', emoji: '☁️', name: '云' },
    { id: 'w10', emoji: '🌤️', name: '晴转多云' }
  ],
  mood: [
    { id: 'm1', emoji: '😊', name: '开心' },
    { id: 'm2', emoji: '😢', name: '难过' },
    { id: 'm3', emoji: '😍', name: '喜欢' },
    { id: 'm4', emoji: '😤', name: '生气' },
    { id: 'm5', emoji: '🥰', name: '幸福' },
    { id: 'm6', emoji: '😴', name: '困' },
    { id: 'm7', emoji: '🤔', name: '思考' },
    { id: 'm8', emoji: '😌', name: '平静' }
  ],
  food: [
    { id: 'f1', emoji: '☕', name: '咖啡' },
    { id: 'f2', emoji: '🍰', name: '蛋糕' },
    { id: 'f3', emoji: '🍩', name: '甜甜圈' },
    { id: 'f4', emoji: '🍦', name: '冰淇淋' },
    { id: 'f5', emoji: '🍕', name: '披萨' },
    { id: 'f6', emoji: '🍔', name: '汉堡' },
    { id: 'f7', emoji: '🥗', name: '沙拉' }
  ],
  decor: [
    { id: 'd1', emoji: '❤️', name: '爱心' },
    { id: 'd2', emoji: '🎀', name: '蝴蝶结' },
    { id: 'd3', emoji: '✨', name: '星星' },
    { id: 'd4', emoji: '🌿', name: '叶子' },
    { id: 'd5', emoji: '💧', name: '水滴' },
    { id: 'd6', emoji: '⚡', name: '闪电' }
  ],
  corner: [
    { id: 'c1', emoji: '📌', name: '图钉' },
    { id: 'c2', emoji: '🖼️', name: '相框' },
    { id: 'c3', emoji: '🔖', name: '书签' }
  ]
}

Page({
  data: {
    statusBarHeight: 20,
    swiperHeight: 600,
    currentPage: 0,
    pages: [],
    defaultContent: DEFAULT_CONTENT,
    inputVisible: false,
    editingContent: '',
    editingPageId: null,
    isFlipping: false,
    flipDeg: 0,
    flipFromIndex: 0,
    flipTargetIndex: 0,
    flipOrigin: 'left center',
    stickerVisible: false,
    stickerCategories: STICKER_CATEGORIES,
    stickerCurrentCat: 'weather',
    stickerList: STICKER_LIBRARY.weather
  },

  onLoad(options) {
    try {
      const sys = wx.getSystemInfoSync()
      const statusBarHeight = sys.statusBarHeight || 20
      const windowHeight = sys.windowHeight || 600
      const headerH = 48
      const bottomBarH = 100
      const swiperHeight = Math.max(500, windowHeight - statusBarHeight - headerH - bottomBarH)
      this.setData({ statusBarHeight, swiperHeight })
    } catch (e) {
      this.setData({ statusBarHeight: 20, swiperHeight: 600 })
    }
    const year = parseInt(options.year) || new Date().getFullYear()
    const month = parseInt(options.month) || new Date().getMonth() + 1
    const day = parseInt(options.day) || new Date().getDate()
    const weather = options.weather || 'sunny'

    try {
      const cached = wx.getStorageSync(STORAGE_KEY)
      const stored = cached && typeof cached === 'string' ? JSON.parse(cached) : cached
      if (stored && Array.isArray(stored.pages) && stored.pages.length > 0) {
        const idx = stored.pages.findIndex(p => p.year === year && p.month === month && p.day === day)
        if (idx >= 0) {
          this.setData({ pages: stored.pages, currentPage: idx })
          return
        }
      }
    } catch (e) {}

    const d = new Date(year, month - 1, day)
    const week = WEEK_NAMES[d.getDay()]
    const weatherText = WEATHER_MAP[weather] || '晴天'
    const page = {
      id: 'p' + Date.now(),
      year, month, day, week, weather, weatherText,
      content: DEFAULT_CONTENT,
      photo: '',
      stickers: []
    }
    this.setData({ pages: [page] })
  },

  onNextPage() {
    if (this.data.isFlipping) return
    const { currentPage, pages } = this.data
    let targetIdx = currentPage + 1
    let nextPages = pages

    if (targetIdx >= pages.length) {
      const last = pages[pages.length - 1]
      const d = new Date(last.year, last.month - 1, last.day)
      d.setDate(d.getDate() + 1)
      const newYear = d.getFullYear()
      const newMonth = d.getMonth() + 1
      const newDay = d.getDate()
      const weather = getWeatherForDay(newYear, newMonth, newDay)
      const newPage = {
        id: 'p' + (pages.length + 1),
        year: newYear,
        month: newMonth,
        day: newDay,
        week: WEEK_NAMES[d.getDay()],
        weather,
        weatherText: WEATHER_MAP[weather] || '晴天',
        content: DEFAULT_CONTENT,
        photo: '',
        stickers: []
      }
      nextPages = [...pages, newPage]
      targetIdx = pages.length
    }

    this.setData({
      isFlipping: true,
      flipFromIndex: currentPage,
      flipTargetIndex: targetIdx,
      flipDeg: 0,
      flipOrigin: 'left center',
      pages: nextPages
    }, () => {
      setTimeout(() => {
        this.setData({ flipDeg: -180 })
      }, 20)
      setTimeout(() => {
        this.setData({
          currentPage: targetIdx,
          isFlipping: false,
          flipDeg: 0
        })
      }, FLIP_DURATION + 50)
    })
  },

  onPrevPage() {
    if (this.data.isFlipping) return
    const { currentPage, pages } = this.data
    let targetIdx = currentPage - 1
    let nextPages = pages
    let flipFromIdx = currentPage
    let flipToIdx = targetIdx

    if (targetIdx < 0) {
      const first = pages[0]
      if (!first) return
      const d = new Date(first.year, first.month - 1, first.day)
      d.setDate(d.getDate() - 1)
      const newYear = d.getFullYear()
      const newMonth = d.getMonth() + 1
      const newDay = d.getDate()
      const weather = getWeatherForDay(newYear, newMonth, newDay)
      const newPage = {
        id: 'p' + (Date.now().toString(36) + Math.random().toString(36).slice(2)),
        year: newYear,
        month: newMonth,
        day: newDay,
        week: WEEK_NAMES[d.getDay()],
        weather,
        weatherText: WEATHER_MAP[weather] || '晴天',
        content: DEFAULT_CONTENT,
        photo: '',
        stickers: []
      }
      nextPages = [newPage, ...pages]
      targetIdx = 0
      flipFromIdx = 1
      flipToIdx = 0
    }

    this.setData({
      isFlipping: true,
      flipFromIndex: flipFromIdx,
      flipTargetIndex: flipToIdx,
      flipDeg: 0,
      flipOrigin: 'right center',
      pages: nextPages
    }, () => {
      setTimeout(() => {
        this.setData({ flipDeg: 180 })
      }, 20)
      setTimeout(() => {
        this.setData({
          currentPage: targetIdx,
          isFlipping: false,
          flipDeg: 0
        })
      }, FLIP_DURATION + 50)
    })
  },

  onBack() {
    wx.navigateBack()
  },

  onSave() {
    if (!getApp().requireGuestLoginForSave()) return
    const { pages } = this.data
    if (!pages || pages.length === 0) {
      wx.showToast({ title: '暂无内容可保存', icon: 'none' })
      return
    }
    try {
      wx.setStorageSync(STORAGE_KEY, JSON.stringify({ pages, updatedAt: Date.now() }))
      wx.showToast({ title: '已保存', icon: 'success' })
    } catch (e) {
      wx.showToast({ title: '保存失败', icon: 'none' })
    }
  },

  onUploadPhoto() {
    wx.chooseImage({
      count: 1,
      sizeType: ['compressed'],
      sourceType: ['album', 'camera'],
      success: (res) => {
        const path = res.tempFilePaths[0]
        const { currentPage, pages } = this.data
        const updated = [...pages]
        if (updated[currentPage]) {
          updated[currentPage] = { ...updated[currentPage], photo: path }
          this.setData({ pages: updated })
        }
      }
    })
  },

  onFocusInput() {
    const { currentPage, pages, defaultContent } = this.data
    const content = (pages[currentPage] && pages[currentPage].content) ? pages[currentPage].content : defaultContent
    this.setData({ inputVisible: true, editingContent: content, editingPageId: currentPage })
  },

  onCloseInput() {
    const { editingContent, editingPageId, pages } = this.data
    if (editingPageId !== null && pages[editingPageId]) {
      const updated = [...pages]
      updated[editingPageId] = { ...updated[editingPageId], content: editingContent }
      this.setData({ pages: updated })
    }
    this.setData({ inputVisible: false, editingPageId: null })
  },

  onInput(e) {
    this.setData({ editingContent: e.detail.value })
  },

  onBlur() {
    this.onCloseInput()
  },

  onSticker() {
    this.setData({ stickerVisible: true })
  },

  onCloseSticker() {
    this.setData({ stickerVisible: false })
  },

  onStickerPanelTap() {
    // 阻止点击面板时关闭
  },

  onStickerCategory(e) {
    const cat = e.currentTarget.dataset.cat
    this.setData({
      stickerCurrentCat: cat,
      stickerList: STICKER_LIBRARY[cat] || []
    })
  },

  onStickerSelect(e) {
    const item = e.currentTarget.dataset.item
    const { currentPage, pages } = this.data
    if (!pages[currentPage]) return
    const stickers = pages[currentPage].stickers || []
    const newSticker = {
      sid: 's' + Date.now() + '_' + Math.random().toString(36).slice(2),
      emoji: item.emoji,
      name: item.name,
      left: (stickers.length % 3) * 33 + 10 + '%',
      top: (Math.floor(stickers.length / 3) % 2) * 35 + 15 + '%'
    }
    const updated = [...pages]
    updated[currentPage] = {
      ...updated[currentPage],
      stickers: [...stickers, newSticker]
    }
    this.setData({ pages: updated })
    wx.showToast({ title: '已粘贴', icon: 'success', duration: 800 })
  },

  onStickerTouchStart(e) {
    if (this.data.isFlipping) return
    const sid = e.currentTarget.dataset.sid
    const { currentPage, pages } = this.data
    const sticker = (pages[currentPage]?.stickers || []).find(s => s.sid === sid)
    if (!sticker) return
    const touch = e.touches[0]
    this._dragState = {
      sid,
      startX: touch.clientX,
      startY: touch.clientY,
      startLeft: parseFloat(sticker.left) || 10,
      startTop: parseFloat(sticker.top) || 15,
      rect: null
    }
    const query = wx.createSelectorQuery().in(this)
    query.select('#stickerLayer').boundingClientRect(rect => {
      if (this._dragState && rect) this._dragState.rect = rect
    }).exec()
  },

  onStickerTouchMove(e) {
    if (!this._dragState) return
    const touch = e.touches[0]
    if (!this._dragState.rect) {
      wx.createSelectorQuery().in(this).select('#stickerLayer').boundingClientRect(rect => {
        if (rect && this._dragState) {
          this._dragState.rect = rect
          this._applyStickerDrag(touch)
        }
      }).exec()
      return
    }
    this._applyStickerDrag(touch)
  },

  _applyStickerDrag(touch) {
    const state = this._dragState
    if (!state || !state.rect) return
    const { sid, startX, startY, startLeft, startTop, rect } = state
    const deltaX = touch.clientX - startX
    const deltaY = touch.clientY - startY
    const { width, height } = rect
    if (!width || !height) return
    let newLeft = startLeft + (deltaX / width) * 100
    let newTop = startTop + (deltaY / height) * 100
    newLeft = Math.max(0, Math.min(95, newLeft))
    newTop = Math.max(0, Math.min(95, newTop))
    const { currentPage, pages } = this.data
    const stickers = [...(pages[currentPage]?.stickers || [])]
    const idx = stickers.findIndex(s => s.sid === sid)
    if (idx < 0) return
    stickers[idx] = { ...stickers[idx], left: newLeft + '%', top: newTop + '%' }
    const updated = [...pages]
    updated[currentPage] = { ...updated[currentPage], stickers }
    this.setData({ pages: updated })
    state.startX = touch.clientX
    state.startY = touch.clientY
    state.startLeft = newLeft
    state.startTop = newTop
  },

  onStickerTouchEnd() {
    this._dragState = null
  }
})
