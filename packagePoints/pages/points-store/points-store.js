const { getImageUrl } = require('../../../utils/image.js')
const { reLaunchMain, MAIN_DIARY, MAIN_WARDROBE } = require('../../../utils/mainTabs.js')
const { getSkinIndexByProductId, WARDROBE_THEME_COUNT } = require('../../../config/pointsStore.js')
const {
  getActiveDiarySkinIndex,
  setActiveDiarySkinByProductId
} = require('../../../utils/diarySkin.js')
const {
  getActiveWardrobeThemeId,
  getThemeIdByProductId,
  setActiveWardrobeThemeByProductId,
  DEFAULT_WARDROBE_THEME_ID
} = require('../../../utils/wardrobeTheme.js')
const {
  getDiarySkinImageUrl,
  getDiarySkinCdnUrl,
  resolveDiarySkinTempUrls,
  getDiarySkinCloudFileId,
  resolveWardrobeThemeTempUrls,
  resolveWardrobeThemeTempUrl,
  getWardrobeThemeCloudFileId
} = require('../../../utils/pointsStoreImage.js')

const REDEEMED_ITEMS_KEY = 'privclo_points_store_redeemed'

const _img = (p) => getImageUrl('/images/points-store/' + p)
const _skin = (n) => getDiarySkinImageUrl(n)
const _skinCdn = (n) => getDiarySkinCdnUrl(n)

/** 商品 id → 皮肤序号（与 config/pointsStore 一致，供图片刷新） */
const SKIN_ID_TO_INDEX = {
  '1': 1,
  '2': 2,
  '3': 3,
  '13': 4,
  '14': 5,
  '15': 6,
  '16': 7
}

/** 商品 id → 主题序号（与 config/pointsStore 一致，供图片刷新） */
const THEME_ID_TO_INDEX = {
  '11': 1,
  '6': 2,
  '7': 3
}

// 积分商城 - 顶部横向 Tab + 两列商品网格
Page({
  data: {
    statusBarHeight: 20,
    tabList: ['日记皮肤', '日记贴纸', '衣橱主题', '衣橱容量'],
    activeTabIndex: 0,
    productList: [
      { id: '1', name: '蓝海梦境', points: 0, image: _skin(1), imageFallback: _skinCdn(1), category: 0 },
      { id: '2', name: '幽绿秘境', points: 500, image: _skin(2), imageFallback: _skinCdn(2), category: 0 },
      { id: '3', name: '魔法星图', points: 500, image: _skin(3), imageFallback: _skinCdn(3), category: 0 },
      { id: '13', name: '元气万花筒', points: 500, image: _skin(4), imageFallback: _skinCdn(4), category: 0 },
      { id: '14', name: '霓虹赛博', points: 500, image: _skin(5), imageFallback: _skinCdn(5), category: 0 },
      { id: '15', name: '粉黛独角兽', points: 500, image: _skin(6), imageFallback: _skinCdn(6), category: 0 },
      { id: '16', name: '樱之恋曲', points: 500, image: _skin(7), imageFallback: _skinCdn(7), category: 0 },
      { id: '4', name: '贴纸包-毕业季', points: 30, image: _img('sticker/1.png'), category: 1 },
      { id: '5', name: '贴纸包-新春', points: 30, image: _img('sticker/2.png'), category: 1 },
      { id: '11', name: '经典奶油', points: 0, image: '', imageFallback: '', themeIndex: 1, category: 2 },
      { id: '6', name: '复古墨绿', points: 300, image: '', imageFallback: '', themeIndex: 2, category: 2 },
      { id: '7', name: '棕色原木', points: 200, image: '', imageFallback: '', themeIndex: 3, category: 2 },
      { id: '8', name: '容量+20', points: 200, image: _img('capacity/1.png'), category: 3 }
    ],
    displayList: []
  },

  onBack() {
    wx.navigateBack()
  },

  onLoad(options) {
    try {
      const sys = wx.getSystemInfoSync()
      this.setData({ statusBarHeight: sys.statusBarHeight || 20 })
    } catch (e) {
      this.setData({ statusBarHeight: 20 })
    }
    this._syncProductActionState()
    this._refreshDiarySkinImages()
    this._refreshWardrobeThemeImages()
  },

  onShow() {
    this._syncProductActionState()
    this._refreshWardrobeThemeImages()
  },

  _getRedeemedIds() {
    try {
      const raw = wx.getStorageSync(REDEEMED_ITEMS_KEY)
      if (!Array.isArray(raw)) return []
      return raw.map((id) => String(id))
    } catch (e) {
      return []
    }
  },

  _saveRedeemedId(productId) {
    const id = String(productId)
    const ids = this._getRedeemedIds()
    if (ids.indexOf(id) >= 0) return
    ids.push(id)
    try {
      wx.setStorageSync(REDEEMED_ITEMS_KEY, ids)
    } catch (e) {
      console.error('save redeemed item failed', e)
    }
  },

  _resolveProductAction(item, redeemedIds) {
    const id = String(item.id)
    const category = typeof item.category === 'number' ? item.category : -1

    if (category === 0) {
      const skinIndex = getSkinIndexByProductId(id)
      const activeIndex = getActiveDiarySkinIndex()

      if (skinIndex && skinIndex === activeIndex) {
        return {
          actionLabel: '已使用',
          actionDisabled: true,
          actionRedeemed: false
        }
      }

      if (skinIndex === 1) {
        return {
          actionLabel: '去使用',
          actionDisabled: false,
          actionRedeemed: true
        }
      }

      if (redeemedIds.indexOf(id) >= 0) {
        return {
          actionLabel: '已兑换，去使用',
          actionDisabled: false,
          actionRedeemed: true
        }
      }

      return {
        actionLabel: '兑换',
        actionDisabled: false,
        actionRedeemed: false
      }
    }

    if (category === 2) {
      const themeId = getThemeIdByProductId(id)
      const activeThemeId = getActiveWardrobeThemeId()

      if (themeId && themeId === activeThemeId) {
        return {
          actionLabel: '已使用',
          actionDisabled: true,
          actionRedeemed: false
        }
      }

      if (themeId === DEFAULT_WARDROBE_THEME_ID) {
        return {
          actionLabel: '去使用',
          actionDisabled: false,
          actionRedeemed: true
        }
      }

      if (redeemedIds.indexOf(id) >= 0) {
        return {
          actionLabel: '已兑换，去使用',
          actionDisabled: false,
          actionRedeemed: true
        }
      }

      return {
        actionLabel: '兑换',
        actionDisabled: false,
        actionRedeemed: false
      }
    }

    if (redeemedIds.indexOf(id) >= 0) {
      return {
        actionLabel: '已兑换，去使用',
        actionDisabled: false,
        actionRedeemed: true
      }
    }
    return {
      actionLabel: '兑换',
      actionDisabled: false,
      actionRedeemed: false
    }
  },

  _syncProductActionState() {
    const redeemedIds = this._getRedeemedIds()
    const productList = (this.data.productList || []).map((item) => {
      const action = this._resolveProductAction(item, redeemedIds)
      return { ...item, ...action }
    })
    this.setData({ productList }, () => {
      this._filterProducts()
    })
  },

  _applySkinImageUrl(productList, skinIndex, url) {
    if (!url) return productList
    return productList.map((item) => {
      if (SKIN_ID_TO_INDEX[item.id] !== skinIndex) return item
      return { ...item, image: url }
    })
  },

  _refreshDiarySkinImages() {
    resolveDiarySkinTempUrls().then((urlMap) => {
      if (!urlMap || !Object.keys(urlMap).length) return
      let productList = this.data.productList || []
      for (let i = 1; i <= 8; i++) {
        const fileId = getDiarySkinCloudFileId(i)
        const tempUrl = fileId ? urlMap[fileId] : ''
        if (tempUrl) {
          productList = this._applySkinImageUrl(productList, i, tempUrl)
        }
      }
      this.setData({ productList }, () => {
        if (this.data.activeTabIndex === 0) this._filterProducts()
      })
    })
  },

  _applyThemeImageUrl(productList, themeIndex, url) {
    if (!url) return productList
    return productList.map((item) => {
      const itemThemeIndex = item.themeIndex || THEME_ID_TO_INDEX[String(item.id)]
      if (itemThemeIndex !== themeIndex) return item
      return { ...item, image: url }
    })
  },

  _refreshWardrobeThemeImages() {
    resolveWardrobeThemeTempUrls().then((urlMap) => {
      if (!urlMap || !Object.keys(urlMap).length) return
      let productList = this.data.productList || []
      for (let i = 1; i <= WARDROBE_THEME_COUNT; i++) {
        const fileId = getWardrobeThemeCloudFileId(i)
        const tempUrl = fileId && urlMap[fileId] ? urlMap[fileId] : ''
        if (tempUrl) {
          productList = this._applyThemeImageUrl(productList, i, tempUrl)
        }
      }
      this.setData({ productList }, () => {
        this._filterProducts()
      })
    })
  },

  _filterProducts() {
    const idx = this.data.activeTabIndex
    const list = this.data.productList || []
    const filtered = list
      .filter(function (item) { return item && item.category === idx })
      .map(function (item) {
        return {
          id: item.id == null ? '' : String(item.id),
          name: item.name == null ? '' : String(item.name),
          points: typeof item.points === 'number' ? item.points : 0,
          image: item.image ? String(item.image) : '',
          imageFallback: item.imageFallback ? String(item.imageFallback) : '',
          themeIndex: typeof item.themeIndex === 'number' ? item.themeIndex : 0,
          category: typeof item.category === 'number' ? item.category : 0,
          actionLabel: item.actionLabel ? String(item.actionLabel) : '兑换',
          actionDisabled: !!item.actionDisabled,
          actionRedeemed: !!item.actionRedeemed
        }
      })
    this.setData({ displayList: filtered })
  },

  onTabTap(e) {
    const index = e.currentTarget.dataset.index
    if (index === undefined) return
    this.setData({ activeTabIndex: index }, () => {
      this._filterProducts()
      if (index === 0) this._refreshDiarySkinImages()
      if (index === 2) this._refreshWardrobeThemeImages()
    })
  },

  _goUseProduct(item) {
    if (!item) return
    const category = typeof item.category === 'number' ? item.category : 0
    const app = getApp()
    const gender = (app.getUserGender && app.getUserGender()) || 'female'

    if (category === 0) {
      setActiveDiarySkinByProductId(item.id)
      reLaunchMain(MAIN_DIARY, gender)
      return
    }
    if (category === 1) {
      reLaunchMain(MAIN_DIARY, gender)
      return
    }
    if (category === 2) {
      setActiveWardrobeThemeByProductId(item.id)
      reLaunchMain(MAIN_WARDROBE, gender)
      return
    }
    if (category === 3) {
      reLaunchMain(MAIN_WARDROBE, gender)
    }
  },

  onExchange(e) {
    const id = e.currentTarget.dataset.id
    const item = (this.data.productList || []).find((p) => String(p.id) === String(id))
    if (!item) return
    if (item.actionDisabled) return
    if (item.actionRedeemed) {
      this._goUseProduct(item)
      return
    }

    const app = getApp()
    if (app.requireGuestLoginForSave && !app.requireGuestLoginForSave()) return

    const required = typeof item.points === 'number' ? item.points : 0
    const current = (app.getPoints && app.getPoints()) || 0
    if (current < required) {
      wx.showToast({
        title: '积分不足，兑换失败，快去做任务换取积分吧！',
        icon: 'none',
        duration: 3000
      })
      return
    }

    if (app.addPointsRecord) {
      app.addPointsRecord('expense', '积分商城兑换-' + item.name, -required)
    }
    this._saveRedeemedId(item.id)
    this._syncProductActionState()
    wx.showToast({ title: '兑换成功', icon: 'success' })
  },

  onProductImgError(e) {
    const id = e.currentTarget.dataset.id
    if (!id) return
    const product = (this.data.productList || []).find((item) => String(item.id) === String(id))
    const themeIndex = product && (product.themeIndex || THEME_ID_TO_INDEX[String(id)])
    if (themeIndex) {
      resolveWardrobeThemeTempUrl(themeIndex).then((url) => {
        if (!url) return
        const productList = (this.data.productList || []).map((item) => {
          if (String(item.id) !== String(id)) return item
          if (item.image === url) return item
          return { ...item, image: url }
        })
        const displayList = (this.data.displayList || []).map((item) => {
          if (String(item.id) !== String(id)) return item
          if (item.image === url) return item
          return { ...item, image: url }
        })
        this.setData({ productList, displayList })
      })
      return
    }
    const list = (this.data.displayList || []).map((item) => {
      if (String(item.id) !== String(id) || !item.imageFallback) return item
      if (item.image === item.imageFallback) return item
      return { ...item, image: item.imageFallback }
    })
    this.setData({ displayList: list })
  }
})
