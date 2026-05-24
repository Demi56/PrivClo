let getImageUrl = (p) => (p && typeof p === 'string' ? p : '')
try {
  const img = require('../../../utils/image.js')
  if (img && img.getImageUrl) getImageUrl = img.getImageUrl
} catch (e) { console.warn('[category-detail] image utils fallback', e) }

const { emptyOutfit, applyTabPickToOutfit, removeSrcFromOutfit } = require('../../../utils/tryonOutfitHelpers.js')
const { getModelImagePath } = require('../../../utils/clothingPositions.js')

// 分类详情页 - 上衣区等，顶部试穿+底部分类展示+底部扫描
Page({
  data: {
    statusBarHeight: 20,
    headerHeightPx: 48,
    scrollAreaTop: 0,
    scrollAreaBottom: 0,
    gender: 'female',
    tryonItems: [],
    tryonItemSlots: [],
    selectedTryonSlotIndex: -1,
    selectedSubCategoryItem: null,
    draggingId: '',
    modelDisplaySrc: '',
    modelImgSrc: '',
    categoryId: 'tops',
    activeTab: 'tops',
    prefitMode: 'official',
    categoryTabs: [
      { id: 'tops', name: '上衣' },
      { id: 'bottoms', name: '下装' },
      { id: 'sets', name: '套装' },
      { id: 'inner', name: '内搭' },
      { id: 'shoes', name: '鞋子' },
      { id: 'accessories', name: '其他配饰' }
    ],
    subCategories: [],
    tryonFavorited: false,
    seasonOptions: ['春季', '夏季', '秋季', '冬季'],
    sceneOptions: ['通勤', '约会', '旅游', '运动', '宅家', '晚宴'],
    styleOptions: ['日常休闲', '法式', '极简', '复古', '潮酷', '新中式'],
    showFavoriteTagPopup: false,
    favoriteTagSeasonIndex: 0,
    favoriteTagSceneIndex: 0,
    favoriteTagStyleIndex: 0,
    showBannerEditPopup: false,
    editingBannerSubId: '',
    editingBannerName: '',
    tryonExpanded: true
  },

  onLoad(options) {
    let statusBarHeight = 20
    let scrollAreaTop = 340
    let scrollAreaBottom = 0
    /** 与 `.scan-footer` 高度一致，用于 detail-main 的 bottom 留白；勿依赖异步 setData 后的 this.data */
    let footerHeightPx = 120
    try {
      const sys = wx.getSystemInfoSync()
      statusBarHeight = sys.statusBarHeight || 20
      const w = sys.windowWidth || 375
      const safeBottom = (sys.safeAreaInsets && sys.safeAreaInsets.bottom) || 0
      const rpx2px = w / 750
      const headerHeightPx = (24 + 72) * rpx2px
      const toggleBarRpx = 88
      const modelOverflowBuffer = 80
      /* 卡片内「实时试穿」为绝对定位，与模特溢出区叠加，多留一段避免中间区 top 与试穿区重叠 */
      const tryonBtnReserveRpx = 100
      const tryonHeightExpanded = statusBarHeight + headerHeightPx + (20 + 50 + 12 + 450 + 12 + modelOverflowBuffer + toggleBarRpx + tryonBtnReserveRpx) * rpx2px
      const tryonHeightCollapsed = statusBarHeight + headerHeightPx + toggleBarRpx * rpx2px
      const footerHeight = (24 + 88 + 24) * rpx2px + safeBottom
      footerHeightPx = Math.ceil(footerHeight)
      /* 初值仅避免首帧错位，`onReady` 会用节点实测 `.tryon-header` 底部覆盖（公式与真实布局总有偏差） */
      const tabPullUpPx = 56 * rpx2px
      scrollAreaTop = Math.ceil(tryonHeightExpanded - tabPullUpPx)
      /* 与 onReady 中节点实测对齐时作为下限，避免 rect 偏小把中间区顶上到导航栏下、误触返回键回到首页 */
      this._minScrollAreaTop = scrollAreaTop
      scrollAreaBottom = 0
      this.setData({
        statusBarHeight,
        headerHeightPx,
        scrollAreaTop,
        scrollAreaBottom,
        footerHeightPx
      })
    } catch (e) {
      const tabPullUpFallback = 28
      scrollAreaTop = statusBarHeight + 48 + 340 - tabPullUpFallback
      this._minScrollAreaTop = scrollAreaTop
      footerHeightPx = 120
      this.setData({
        statusBarHeight,
        headerHeightPx: 48,
        scrollAreaTop,
        scrollAreaBottom,
        footerHeightPx
      })
    }
    let categoryId = options.category || 'tops'
    if (typeof categoryId === 'string' && categoryId.includes('%')) {
      try { categoryId = decodeURIComponent(categoryId) } catch (e) {}
    }
    const gender = options.gender || 'female'
    const defaultTryonItems = []
    const app = getApp()
    let tryonItemSlots = app.globalData.tryonItemSlots
    if (!tryonItemSlots || !Array.isArray(tryonItemSlots)) {
      tryonItemSlots = Array(9).fill('').map((_, i) => defaultTryonItems[i] || '')
      app.globalData.tryonItemSlots = tryonItemSlots
    }
    const tryonItems = tryonItemSlots.filter(function (s) { return s })
    let subCategories = this.getSubCategories(categoryId)
    if (!categoryId.startsWith('custom_')) {
      subCategories = this.applySubCategoryOrder(categoryId, subCategories)
      subCategories = this.mergeUserWardrobeItems(categoryId, subCategories, 'official')
      subCategories = this.applySubCategoryRenames(categoryId, subCategories)
    }
    const titleMap = { tops: '上衣区', bottoms: '下装区', sets: '套装区', inner: '内搭区', shoes: '鞋子区', accessories: '其他配饰区' }
    let categoryTitle = titleMap[categoryId]
    if (!categoryTitle && categoryId.startsWith('custom_')) {
      const customTypes = app.getCustomTypes ? app.getCustomTypes() : []
      const t = customTypes.find(x => x.id === categoryId)
      categoryTitle = t ? t.name + '区' : '衣橱'
    }
    if (!categoryTitle) categoryTitle = '衣橱'
    wx.setNavigationBarTitle({ title: categoryTitle })
    let categoryTabs = this.data.categoryTabs
    if (categoryId.startsWith('custom_')) {
      const customTypes = app.getCustomTypes ? app.getCustomTypes() : []
      const t = customTypes.find(x => x.id === categoryId)
      categoryTabs = t ? [{ id: t.id, name: t.name }] : [{ id: categoryId, name: '自定义' }]
    }
    const modelDisplaySrc = app.globalData.modelDisplaySrc || ''
    const modelImgSrc = modelDisplaySrc || getImageUrl(getModelImagePath(gender))
    const prefitMode = categoryId.startsWith('custom_') ? 'private' : this.data.prefitMode
    scrollAreaBottom = prefitMode === 'private' ? footerHeightPx : 0
    this.setData({
      categoryId,
      categoryTitle,
      categoryTabs: categoryTabs || this.data.categoryTabs,
      activeTab: categoryId,
      prefitMode,
      scrollAreaBottom,
      gender,
      tryonItems,
      tryonItemSlots,
      subCategories,
      modelDisplaySrc,
      modelImgSrc
    })
  },

  _applyCdn(subs) {
    return (subs || []).map(s => ({
      ...s,
      items: (s.items || []).map(i => ({ ...i, src: getImageUrl(i.src) }))
    }))
  },

  getSubCategories(categoryId) {
    if (categoryId === 'tops') {
      return this._applyCdn([
        { id: 'tshirt', name: 'T恤', items: [{ src: '/packageWardrobe/images/items/tops/tshirt/1.png' }, { src: '/packageWardrobe/images/items/tops/tshirt/2.png' }, { src: '/packageWardrobe/images/items/tops/tshirt/3.png' }, { src: '/packageWardrobe/images/items/tops/tshirt/4.png' }] },
        { id: 'shirt', name: '衬衫', items: [{ src: '/packageWardrobe/images/items/tops/shirt/1.png' }, { src: '/packageWardrobe/images/items/tops/shirt/2.png' }, { src: '/packageWardrobe/images/items/tops/shirt/3.png' }] },
        { id: 'sweatshirt', name: '卫衣', items: [{ src: '/packageWardrobe/images/items/tops/sweatshirt/1.png' }, { src: '/packageWardrobe/images/items/tops/sweatshirt/2.png' }, { src: '/packageWardrobe/images/items/tops/sweatshirt/3.png' }, { src: '/packageWardrobe/images/items/tops/sweatshirt/4.png' }] },
        { id: 'sweater', name: '毛衣', items: [{ src: '/packageWardrobe/images/items/tops/sweater/1.png' }, { src: '/packageWardrobe/images/items/tops/sweater/2.png' }, { src: '/packageWardrobe/images/items/tops/sweater/3.png' }, { src: '/packageWardrobe/images/items/tops/sweater/4.png' }] },
        { id: 'knitwear', name: '针织衫', items: [{ src: '/packageWardrobe/images/items/tops/knitwear/1.png' }, { src: '/packageWardrobe/images/items/tops/knitwear/2.png' }, { src: '/packageWardrobe/images/items/tops/knitwear/3.png' }, { src: '/packageWardrobe/images/items/tops/knitwear/4.png' }] },
        { id: 'blazer', name: '西装外套', items: [{ src: '/packageWardrobe/images/items/tops/blazer/1.png' }, { src: '/packageWardrobe/images/items/tops/blazer/2.png' }, { src: '/packageWardrobe/images/items/tops/blazer/3.png' }, { src: '/packageWardrobe/images/items/tops/blazer/4.png' }] },
        { id: 'jacket', name: '夹克', items: [{ src: '/packageWardrobe/images/items/tops/jacket/1.png' }, { src: '/packageWardrobe/images/items/tops/jacket/2.png' }, { src: '/packageWardrobe/images/items/tops/jacket/3.png' }, { src: '/packageWardrobe/images/items/tops/jacket/4.png' }] },
        { id: 'vest', name: '马甲', items: [{ src: '/packageWardrobe/images/items/tops/vest/1.png' }, { src: '/packageWardrobe/images/items/tops/vest/2.png' }, { src: '/packageWardrobe/images/items/tops/vest/3.png' }, { src: '/packageWardrobe/images/items/tops/vest/4.png' }] },
        { id: 'trenchcoat', name: '风衣', items: [{ src: '/packageWardrobe/images/items/tops/trenchcoat/1.png' }, { src: '/packageWardrobe/images/items/tops/trenchcoat/2.png' }, { src: '/packageWardrobe/images/items/tops/trenchcoat/3.png' }, { src: '/packageWardrobe/images/items/tops/trenchcoat/4.png' }] },
        { id: 'overcoat', name: '大衣', items: [{ src: '/packageWardrobe/images/items/tops/overcoat/1.png' }, { src: '/packageWardrobe/images/items/tops/overcoat/2.png' }, { src: '/packageWardrobe/images/items/tops/overcoat/3.png' }, { src: '/packageWardrobe/images/items/tops/overcoat/4.png' }] },
        { id: 'downcoat', name: '羽绒服', items: [{ src: '/packageWardrobe/images/items/tops/downcoat/1.png' }, { src: '/packageWardrobe/images/items/tops/downcoat/2.png' }, { src: '/packageWardrobe/images/items/tops/downcoat/3.png' }, { src: '/packageWardrobe/images/items/tops/downcoat/4.png' }] }
      ])
    }
    if (categoryId === 'bottoms') {
      return this._applyCdn([
        { id: 'jeans', name: '牛仔裤', items: [{ src: '/packageWardrobe/images/items/bottoms/jeans/1.png' }, { src: '/packageWardrobe/images/items/bottoms/jeans/2.png' }, { src: '/packageWardrobe/images/items/bottoms/jeans/3.png' }, { src: '/packageWardrobe/images/items/bottoms/jeans/4.png' }] },
        { id: 'sportspants', name: '运动裤', items: [{ src: '/packageWardrobe/images/items/bottoms/sportspants/1.png' }, { src: '/packageWardrobe/images/items/bottoms/sportspants/2.png' }, { src: '/packageWardrobe/images/items/bottoms/sportspants/3.png' }] },
        { id: 'shorts', name: '短裤', items: [{ src: '/packageWardrobe/images/items/bottoms/shorts/1.png' }, { src: '/packageWardrobe/images/items/bottoms/shorts/2.png' }, { src: '/packageWardrobe/images/items/bottoms/shorts/3.png' }, { src: '/packageWardrobe/images/items/bottoms/shorts/4.png' }] },
        { id: 'dresspants', name: '西裤', items: [{ src: '/packageWardrobe/images/items/bottoms/dresspants/1.png' }, { src: '/packageWardrobe/images/items/bottoms/dresspants/2.png' }, { src: '/packageWardrobe/images/items/bottoms/dresspants/3.png' }, { src: '/packageWardrobe/images/items/bottoms/dresspants/4.png' }] },
        { id: 'skirt', name: '半身裙', items: [{ src: '/packageWardrobe/images/items/bottoms/skirt/1.png' }, { src: '/packageWardrobe/images/items/bottoms/skirt/2.png' }, { src: '/packageWardrobe/images/items/bottoms/skirt/3.png' }, { src: '/packageWardrobe/images/items/bottoms/skirt/4.png' }] }
      ])
    }
    if (categoryId === 'sets') {
      return this._applyCdn([
        { id: 'dresses', name: '连衣裙', items: [{ src: '/packageWardrobe/images/items/sets/dresses/1.png' }, { src: '/packageWardrobe/images/items/sets/dresses/2.png' }, { src: '/packageWardrobe/images/items/sets/dresses/3.png' }, { src: '/packageWardrobe/images/items/sets/dresses/4.png' }] },
        { id: 'casual', name: '连体牛仔', items: [{ src: '/packageWardrobe/images/items/sets/casual/1.png' }, { src: '/packageWardrobe/images/items/sets/casual/2.png' }, { src: '/packageWardrobe/images/items/sets/casual/3.png' }] },
        { id: 'homewear', name: '家居服', items: [{ src: '/packageWardrobe/images/items/sets/homewear/1.png' }, { src: '/packageWardrobe/images/items/sets/homewear/2.png' }, { src: '/packageWardrobe/images/items/sets/homewear/3.png' }] },
        { id: 'businessset', name: '商务套装', items: [{ src: '/packageWardrobe/images/items/sets/businessset/1.png' }, { src: '/packageWardrobe/images/items/sets/businessset/2.png' }, { src: '/packageWardrobe/images/items/sets/businessset/3.png' }, { src: '/packageWardrobe/images/items/sets/businessset/4.png' }] },
        { id: 'sportset', name: '运动套装', items: [{ src: '/packageWardrobe/images/items/sets/sportset/1.png' }, { src: '/packageWardrobe/images/items/sets/sportset/2.png' }, { src: '/packageWardrobe/images/items/sets/sportset/3.png' }, { src: '/packageWardrobe/images/items/sets/sportset/4.png' }] }
      ])
    }
    if (categoryId === 'inner') {
      return this._applyCdn([
        { id: 'baseshirt', name: '打底衫', items: [{ src: '/packageWardrobe/images/items/inner/baseshirt/1.png' }, { src: '/packageWardrobe/images/items/inner/baseshirt/2.png' }, { src: '/packageWardrobe/images/items/inner/baseshirt/3.png' }] },
        { id: 'underwear', name: '内裤', items: [{ src: '/packageWardrobe/images/items/inner/underwear/1.png' }, { src: '/packageWardrobe/images/items/inner/underwear/2.png' }, { src: '/packageWardrobe/images/items/inner/underwear/3.png' }] },
        { id: 'socks', name: '袜子', items: [{ src: '/packageWardrobe/images/items/inner/socks/1.png' }, { src: '/packageWardrobe/images/items/inner/socks/2.png' }, { src: '/packageWardrobe/images/items/inner/socks/3.png' }, { src: '/packageWardrobe/images/items/inner/socks/4.png' }] },
        { id: 'bra', name: '文胸', items: [{ src: '/packageWardrobe/images/items/inner/bra/1.png' }, { src: '/packageWardrobe/images/items/inner/bra/2.png' }, { src: '/packageWardrobe/images/items/inner/bra/3.png' }, { src: '/packageWardrobe/images/items/inner/bra/4.png' }] },
        { id: 'camisole', name: '吊带', items: [{ src: '/packageWardrobe/images/items/inner/camisole/1.png' }, { src: '/packageWardrobe/images/items/inner/camisole/2.png' }, { src: '/packageWardrobe/images/items/inner/camisole/3.png' }, { src: '/packageWardrobe/images/items/inner/camisole/4.png' }] },
        { id: 'tanktop', name: '打底背心', items: [{ src: '/packageWardrobe/images/items/inner/tanktop/1.png' }, { src: '/packageWardrobe/images/items/inner/tanktop/2.png' }, { src: '/packageWardrobe/images/items/inner/tanktop/3.png' }, { src: '/packageWardrobe/images/items/inner/tanktop/4.png' }] },
        { id: 'thermal', name: '保暖衣裤', items: [{ src: '/packageWardrobe/images/items/inner/thermal/1.png' }, { src: '/packageWardrobe/images/items/inner/thermal/2.png' }, { src: '/packageWardrobe/images/items/inner/thermal/3.png' }, { src: '/packageWardrobe/images/items/inner/thermal/4.png' }] }
      ])
    }
    if (categoryId === 'shoes') {
      return this._applyCdn([
        { id: 'casual', name: '休闲鞋', items: [{ src: '/packageWardrobe/images/items/shoes/casual/1.png' }, { src: '/packageWardrobe/images/items/shoes/casual/2.png' }, { src: '/packageWardrobe/images/items/shoes/casual/3.png' }] },
        { id: 'sports', name: '运动鞋', items: [{ src: '/packageWardrobe/images/items/shoes/sports/1.png' }, { src: '/packageWardrobe/images/items/shoes/sports/2.png' }, { src: '/packageWardrobe/images/items/shoes/sports/3.png' }, { src: '/packageWardrobe/images/items/shoes/sports/4.png' }] },
        { id: 'business', name: '商务鞋', items: [{ src: '/packageWardrobe/images/items/shoes/business/1.png' }, { src: '/packageWardrobe/images/items/shoes/business/2.png' }, { src: '/packageWardrobe/images/items/shoes/business/3.png' }] },
        { id: 'heels', name: '高跟鞋', items: [{ src: '/packageWardrobe/images/items/shoes/heels/1.png' }, { src: '/packageWardrobe/images/items/shoes/heels/2.png' }, { src: '/packageWardrobe/images/items/shoes/heels/3.png' }, { src: '/packageWardrobe/images/items/shoes/heels/4.png' }] },
        { id: 'sandals', name: '凉鞋', items: [{ src: '/packageWardrobe/images/items/shoes/sandals/1.png' }, { src: '/packageWardrobe/images/items/shoes/sandals/2.png' }, { src: '/packageWardrobe/images/items/shoes/sandals/3.png' }, { src: '/packageWardrobe/images/items/shoes/sandals/4.png' }] },
        { id: 'slippers', name: '拖鞋', items: [{ src: '/packageWardrobe/images/items/shoes/slippers/1.png' }, { src: '/packageWardrobe/images/items/shoes/slippers/2.png' }, { src: '/packageWardrobe/images/items/shoes/slippers/3.png' }, { src: '/packageWardrobe/images/items/shoes/slippers/4.png' }] },
        { id: 'boots', name: '靴子', items: [{ src: '/packageWardrobe/images/items/shoes/boots/1.png' }, { src: '/packageWardrobe/images/items/shoes/boots/2.png' }, { src: '/packageWardrobe/images/items/shoes/boots/3.png' }, { src: '/packageWardrobe/images/items/shoes/boots/4.png' }] },
        { id: 'functionalshoes', name: '功能鞋', items: [{ src: '/packageWardrobe/images/items/shoes/functionalshoes/1.png' }, { src: '/packageWardrobe/images/items/shoes/functionalshoes/2.png' }, { src: '/packageWardrobe/images/items/shoes/functionalshoes/3.png' }, { src: '/packageWardrobe/images/items/shoes/functionalshoes/4.png' }] }
      ])
    }
    if (typeof categoryId === 'string' && categoryId.startsWith('custom_')) {
      try {
        const app = getApp()
        const config = (app.getPrivateSubConfig && app.getPrivateSubConfig()) || {}
        const cfg = config[categoryId]
        const customTypes = (app.getCustomTypes && app.getCustomTypes()) || []
      const typeInfo = customTypes.find(t => t.id === categoryId)
      const typeName = typeInfo ? typeInfo.name : '自定义'
      if (cfg && cfg.subs && cfg.subs.length > 0) {
        const userItems = (app.getUserWardrobeItems && app.getUserWardrobeItems()) || {}
        return cfg.subs.map(s => {
          const key = `${categoryId}:${s.id}`
          const arr = userItems[key] || []
          const items = arr.map(e => (typeof e === 'string' ? { src: e } : (e && e.src ? { src: e.src } : e)))
          return { id: s.id, name: s.name || '自定义', items }
        })
      }
        const userItems = (app.getUserWardrobeItems && app.getUserWardrobeItems()) || {}
        const defaultKey = `${categoryId}:default`
        const arr = userItems[defaultKey] || []
        const items = arr.map(e => (typeof e === 'string' ? { src: e } : (e && e.src ? { src: e.src } : e)))
        return [{ id: 'default', name: typeName, items }]
      } catch (e) {
        return []
      }
    }
    if (categoryId === 'accessories') {
      return this._applyCdn([
        { id: 'hats', name: '帽子', items: [{ src: '/packageWardrobe/images/items/accessories/hats/1.png' }, { src: '/packageWardrobe/images/items/accessories/hats/2.png' }, { src: '/packageWardrobe/images/items/accessories/hats/3.png' }, { src: '/packageWardrobe/images/items/accessories/hats/4.png' }] },
        { id: 'bags', name: '包包', items: [{ src: '/packageWardrobe/images/items/accessories/bags/1.png' }, { src: '/packageWardrobe/images/items/accessories/bags/2.png' }, { src: '/packageWardrobe/images/items/accessories/bags/3.png' }, { src: '/packageWardrobe/images/items/accessories/bags/4.png' }] },
        { id: 'jewelry', name: '首饰', items: [{ src: '/packageWardrobe/images/items/accessories/jewelry/1.png' }, { src: '/packageWardrobe/images/items/accessories/jewelry/2.png' }, { src: '/packageWardrobe/images/items/accessories/jewelry/3.png' }, { src: '/packageWardrobe/images/items/accessories/jewelry/4.png' }] },
        { id: 'glasses', name: '眼镜', items: [{ src: '/packageWardrobe/images/items/accessories/glasses/1.png' }, { src: '/packageWardrobe/images/items/accessories/glasses/2.png' }, { src: '/packageWardrobe/images/items/accessories/glasses/3.png' }, { src: '/packageWardrobe/images/items/accessories/glasses/4.png' }] },
        { id: 'watch', name: '手表', items: [{ src: '/packageWardrobe/images/items/accessories/watch/1.png' }, { src: '/packageWardrobe/images/items/accessories/watch/2.png' }, { src: '/packageWardrobe/images/items/accessories/watch/3.png' }, { src: '/packageWardrobe/images/items/accessories/watch/4.png' }] },
        { id: 'hair', name: '发饰', items: [{ src: '/packageWardrobe/images/items/accessories/hair/1.png' }, { src: '/packageWardrobe/images/items/accessories/hair/2.png' }, { src: '/packageWardrobe/images/items/accessories/hair/3.png' }, { src: '/packageWardrobe/images/items/accessories/hair/4.png' }] },
        { id: 'scarf', name: '围巾', items: [{ src: '/packageWardrobe/images/items/accessories/scarf/1.png' }, { src: '/packageWardrobe/images/items/accessories/scarf/2.png' }, { src: '/packageWardrobe/images/items/accessories/scarf/3.png' }, { src: '/packageWardrobe/images/items/accessories/scarf/4.png' }] },
        { id: 'gloves', name: '手套', items: [{ src: '/packageWardrobe/images/items/accessories/gloves/1.png' }, { src: '/packageWardrobe/images/items/accessories/gloves/2.png' }, { src: '/packageWardrobe/images/items/accessories/gloves/3.png' }, { src: '/packageWardrobe/images/items/accessories/gloves/4.png' }] },
        { id: 'belt', name: '腰带', items: [{ src: '/packageWardrobe/images/items/accessories/belt/1.png' }, { src: '/packageWardrobe/images/items/accessories/belt/2.png' }, { src: '/packageWardrobe/images/items/accessories/belt/3.png' }, { src: '/packageWardrobe/images/items/accessories/belt/4.png' }] }
      ])
    }
    return []
  },

  applySubCategoryOrder(categoryId, list) {
    const app = getApp()
    const order = app.globalData.subCategoryOrder && app.globalData.subCategoryOrder[categoryId]
    if (!order || !Array.isArray(order) || order.length === 0) return list
    const map = {}
    list.forEach(function (item) { map[item.id] = item })
    const result = []
    order.forEach(function (id) {
      if (map[id]) { result.push(map[id]); delete map[id] }
    })
    Object.keys(map).forEach(function (id) { result.push(map[id]) })
    return result
  },

  applySubCategoryRenames(categoryId, subCategories) {
    const app = getApp()
    const config = app.getPrivateSubConfig ? app.getPrivateSubConfig() : {}
    const renames = (config[categoryId] && config[categoryId].renames) || {}
    if (Object.keys(renames).length === 0) return subCategories
    return subCategories.map(function (s) {
      const renamed = renames[s.id]
      return renamed ? Object.assign({}, s, { name: renamed }) : s
    })
  },

  mergeUserWardrobeItems(categoryId, subCategories, prefitMode) {
    const app = getApp()
    const mode = prefitMode || this.data.prefitMode || 'official'
    const userItems = app.getUserWardrobeItems ? app.getUserWardrobeItems() : (app.globalData.userWardrobeItems || {})
    return subCategories.map(function (sub) {
      const key = `${categoryId}:${sub.id}`
      const extra = userItems[key] || []
      const userItemsArr = extra.map(function (e) {
        return typeof e === 'string' ? { src: e } : (e && e.src ? { src: e.src } : e)
      })
      const originalItems = (sub.items || []).slice()
      const items = mode === 'private' ? userItemsArr : originalItems
      return Object.assign({}, sub, { items })
    })
  },

  getPrivateSubCategories(categoryId) {
    const app = getApp()
    const config = app.getPrivateSubConfig ? app.getPrivateSubConfig() : {}
    const cfg = config[categoryId]
    const baseSubs = this.getSubCategories(categoryId)
    const baseMap = {}
    baseSubs.forEach(function (s) { baseMap[s.id] = s })
    if (cfg && cfg.subs && cfg.subs.length > 0) {
      const userItems = app.getUserWardrobeItems ? app.getUserWardrobeItems() : {}
      return cfg.subs.map(function (entry) {
        const key = `${categoryId}:${entry.id}`
        const extra = userItems[key] || []
        const items = extra.map(function (e) {
          return typeof e === 'string' ? { src: e } : (e && e.src ? { src: e.src } : e)
        })
        const base = baseMap[entry.id]
        return {
          id: entry.id,
          name: entry.name || (base && base.name) || '自定义',
          items
        }
      })
    }
    const ordered = this.applySubCategoryOrder(categoryId, baseSubs)
    const merged = this.mergeUserWardrobeItems(categoryId, ordered, 'private')
    const subs = merged.map(function (s) { return { id: s.id, name: s.name } })
    if (app.savePrivateSubConfig) {
      const newConfig = Object.assign({}, config, { [categoryId]: { subs } })
      app.savePrivateSubConfig(newConfig)
    }
    return merged
  },

  savePrivateSubCategories(categoryId, subCategories) {
    const app = getApp()
    const config = app.getPrivateSubConfig ? app.getPrivateSubConfig() : {}
    const subs = subCategories.map(function (s) { return { id: s.id, name: s.name } })
    const newConfig = Object.assign({}, config, { [categoryId]: { subs } })
    if (app.savePrivateSubConfig) app.savePrivateSubConfig(newConfig)
  },

  saveSubCategoryOrder(categoryId, subCategories) {
    const app = getApp()
    if (!app.globalData.subCategoryOrder) app.globalData.subCategoryOrder = {}
    app.globalData.subCategoryOrder[categoryId] = subCategories.map(function (s) { return s.id })
  },

  onRowLongPress(e) {
    const id = e.currentTarget.dataset.id
    this.setData({ draggingId: id })
  },

  _lastReorderTime: 0,

  onRowTouchMove(e) {
    if (!this.data.draggingId) return
    const touch = e.touches && e.touches[0]
    if (!touch) return
    const now = Date.now()
    if (now - this._lastReorderTime < 80) return
    const self = this
    const query = wx.createSelectorQuery().in(this)
    query.selectAll('.sub-category-row').boundingClientRect()
    query.exec(function (res) {
      if (!res || !res[0] || !self.data.draggingId) return
      const rects = res[0]
      const dragId = self.data.draggingId
      let toIndex = -1
      for (let i = 0; i < rects.length; i++) {
        const r = rects[i]
        if (touch.clientY >= r.top && touch.clientY <= r.bottom) {
          toIndex = i
          break
        }
      }
      if (toIndex < 0) return
      const subCategories = self.data.subCategories || []
      const fromIndex = subCategories.findIndex(function (s) { return s.id === dragId })
      if (fromIndex < 0 || fromIndex === toIndex) return
      self._lastReorderTime = now
      const newList = subCategories.slice()
      const item = newList.splice(fromIndex, 1)[0]
      newList.splice(toIndex, 0, item)
      if (self.data.prefitMode === 'private') {
        self.savePrivateSubCategories(self.data.activeTab, newList)
      } else {
        self.saveSubCategoryOrder(self.data.activeTab, newList)
      }
      self.setData({ subCategories: newList })
    })
  },

  onRowTouchEnd(e) {
    this.setData({ draggingId: '' })
  },

  onBack() {
    wx.navigateBack()
  },

  /**
   * 以实时试穿区 .tryon-header 实际底边对齐中间区 detail-main 的 top，消除公式估算与布局偏差导致的空白条。
   */
  _syncScrollAreaToTryonHeader: function() {
    var self = this
    var minTop = typeof self._minScrollAreaTop === 'number' ? self._minScrollAreaTop : 0
    var headerBottom = (self.data.statusBarHeight || 20) + (self.data.headerHeightPx || 48)
    wx.createSelectorQuery()
      .select('.tryon-header')
      .boundingClientRect()
      .exec(function(res) {
        var rect = res && res[0]
        if (!rect || typeof rect.bottom !== 'number') {
          if (minTop > 0) self.setData({ scrollAreaTop: minTop })
          return
        }
        var topPx = Math.ceil(rect.bottom)
        /* 实测过小（首帧/真机布局未完成）时勿把中间区顶到导航栏下，否则 Tab 叠在返回键上会误触回首页 */
        if (topPx <= headerBottom + 16) {
          if (minTop > 0) topPx = minTop
          else return
        }
        if (topPx <= 0) return
        self.setData({ scrollAreaTop: topPx })
      })
  },

  onReady: function() {
    var self = this
    this._syncScrollAreaToTryonHeader()
    setTimeout(function() {
      self._syncScrollAreaToTryonHeader()
    }, 100)
  },

  onTryonToggleTap() {
    try {
      const expanded = !this.data.tryonExpanded
      var self = this
      // 延迟 setData 避免点击穿透导致意外跳转
      setTimeout(function() {
        self.setData({ tryonExpanded: expanded })
        setTimeout(function() {
          self._syncScrollAreaToTryonHeader()
        }, 80)
      }, 150)
    } catch (e) {
      console.error('onTryonToggleTap error', e)
    }
  },

  onShow() {
    const app = getApp()
    const modelDisplaySrc = app.globalData.modelDisplaySrc
    if (modelDisplaySrc) {
      this.setData({ modelDisplaySrc, modelImgSrc: modelDisplaySrc })
    }
    // 从录入页返回时刷新子分类（含用户新录入的单品）
    const categoryId = this.data.activeTab
    const prefitMode = this.data.prefitMode || 'official'
    let subCategories = prefitMode === 'private'
      ? this.getPrivateSubCategories(categoryId)
      : (() => {
          let s = this.getSubCategories(categoryId)
          s = this.applySubCategoryOrder(categoryId, s)
          s = this.mergeUserWardrobeItems(categoryId, s, 'official')
          return this.applySubCategoryRenames(categoryId, s)
        })()
    this.setData({ subCategories })
    var self = this
    setTimeout(function() {
      self._syncScrollAreaToTryonHeader()
    }, 120)
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
    this.setData({ showFavoriteTagPopup: false })
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
    if (!getApp().requireGuestLoginForSave()) return
    const seasonOptions = this.data.seasonOptions || []
    const sceneOptions = this.data.sceneOptions || []
    const styleOptions = this.data.styleOptions || []
    const si = this.data.favoriteTagSeasonIndex
    const ci = this.data.favoriteTagSceneIndex
    const ti = this.data.favoriteTagStyleIndex
    const tags = [
      seasonOptions[si],
      sceneOptions[ci],
      styleOptions[ti]
    ].filter(Boolean)
    this.setData({ showFavoriteTagPopup: false })
    const app = getApp()
    if (app.globalData) app.globalData.lastTryonFavoriteTags = tags
    wx.showToast({ title: '已保存收藏标签', icon: 'none' })
  },

  onFavoriteTagCancel() {
    this.setData({ showFavoriteTagPopup: false })
  },

  onPrefitModeTap(e) {
    const mode = e.currentTarget.dataset.mode
    if (mode && mode !== this.data.prefitMode) {
      const scrollAreaBottom = mode === 'private' ? (this.data.footerHeightPx || 120) : 0
      const categoryId = this.data.activeTab
      let subCategories = mode === 'private'
        ? this.getPrivateSubCategories(categoryId)
        : (() => {
            let s = this.getSubCategories(categoryId)
            s = this.applySubCategoryOrder(categoryId, s)
            s = this.mergeUserWardrobeItems(categoryId, s, 'official')
            return this.applySubCategoryRenames(categoryId, s)
          })()
      this.setData({ prefitMode: mode, scrollAreaBottom, subCategories })
    }
  },

  onTabTap(e) {
    const id = e.currentTarget.dataset.id
    if (!id) return
    const prefitMode = this.data.prefitMode || 'official'
    let subCategories = prefitMode === 'private'
      ? this.getPrivateSubCategories(id)
      : (() => {
          let s = this.getSubCategories(id)
          s = this.applySubCategoryOrder(id, s)
          s = this.mergeUserWardrobeItems(id, s, 'official')
          return this.applySubCategoryRenames(id, s)
        })()
    const titleMap = { tops: '上衣区', bottoms: '下装区', sets: '套装区', inner: '内搭区', shoes: '鞋子区', accessories: '其他配饰区' }
    wx.setNavigationBarTitle({ title: titleMap[id] || '衣橱' })
    this.setData({ categoryId: id, activeTab: id, subCategories })
  },

  onTryOn() {
    if (this._tryonNavigating) return
    this._tryonNavigating = true
    var self = this
    if (getApp().incrementStyledCount) getApp().incrementStyledCount()
    const g = this.data.gender || 'female'
    const app = getApp()
    if (!app.globalData) app.globalData = {}
    app.globalData.tryonItemSlots = (this.data.tryonItemSlots || []).slice()
    app.globalData.tryonLaunchContext = {
      activeTab: this.data.activeTab,
      prefitMode: this.data.prefitMode,
      categoryTabs: this.data.categoryTabs,
      categoryId: this.data.categoryId
    }
    wx.navigateTo({
      url: '/pages/tryon/tryon?gender=' + encodeURIComponent(g),
      fail: function (err) {
        self._tryonNavigating = false
        console.error('category-detail tryon navigateTo fail', err)
        wx.showToast({ title: '无法打开试穿页', icon: 'none' })
      },
      complete: function () {
        setTimeout(function () {
          self._tryonNavigating = false
        }, 400)
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
    const appRm = getApp()
    appRm.globalData.tryonItemSlots = tryonItemSlots
    const removedSrc = slots[idx]
    if (removedSrc) {
      appRm.globalData.tryonInitialOutfit = removeSrcFromOutfit(appRm.globalData.tryonInitialOutfit, removedSrc)
    }
    this.setData({ tryonItemSlots, tryonItems: filled, selectedTryonSlotIndex: -1 })
  },

  onDeleteSubCategoryItem(e) {
    const subId = e.currentTarget.dataset.subId
    const itemIndex = e.currentTarget.dataset.itemIndex
    if (subId === undefined || itemIndex === undefined) return
    const subCategories = this.data.subCategories || []
    const sub = subCategories.find(function (s) { return s.id === subId })
    if (!sub || !sub.items) return
    const item = sub.items[itemIndex]
    const deletedSrc = item && (typeof item === 'string' ? item : item.src)
    const app = getApp()
    if (deletedSrc && app.isUserWardrobeItem && app.isUserWardrobeItem(deletedSrc)) {
      app.removeUserWardrobeItem(this.data.activeTab, subId, deletedSrc)
    }
    const newItems = sub.items.slice()
    newItems.splice(itemIndex, 1)
    const newSubCategories = subCategories.map(function (s) {
      return s.id === subId ? { id: s.id, name: s.name, items: newItems } : s
    })
    var tryonItemSlots = this.data.tryonItemSlots || []
    var tryonItems = this.data.tryonItems || []
    if (deletedSrc) {
      const idx = tryonItemSlots.indexOf(deletedSrc)
      if (idx >= 0) {
        const newSlots = tryonItemSlots.slice()
        newSlots[idx] = ''
        const filled = newSlots.filter(function (s) { return s })
        const minLen = Math.max(9, filled.length)
        tryonItemSlots = filled.concat(Array(Math.max(0, minLen - filled.length)).fill(''))
        tryonItems = filled
        app.globalData.tryonItemSlots = tryonItemSlots
      }
    }
    if (deletedSrc) {
      app.globalData.tryonInitialOutfit = removeSrcFromOutfit(app.globalData.tryonInitialOutfit, deletedSrc)
    }
    this.setData({ subCategories: newSubCategories, tryonItemSlots, tryonItems, selectedSubCategoryItem: null })
  },

  onSubCategoryItemTap(e) {
    const src = e.currentTarget.dataset.src
    const subId = e.currentTarget.dataset.subId
    const itemIndex = e.currentTarget.dataset.itemIndex
    if (!src || subId === undefined || itemIndex === undefined) return
    const sel = this.data.selectedSubCategoryItem
    if (sel && sel.subId === subId && sel.itemIndex === parseInt(itemIndex, 10)) {
      this.setData({ selectedSubCategoryItem: null })
      return
    }
    this.setData({ selectedSubCategoryItem: { subId, itemIndex: parseInt(itemIndex, 10) } })
    const slots = this.data.tryonItemSlots || []
    const idx = slots.findIndex(function (s) { return !s })
    var newSlots = slots.slice()
    if (idx >= 0) {
      newSlots[idx] = src
    } else {
      newSlots.push(src)
    }
    const tryonItems = newSlots.filter(function (s) { return s })
    const appPick = getApp()
    appPick.globalData.tryonItemSlots = newSlots
    const prevOutfit = appPick.globalData.tryonInitialOutfit || emptyOutfit()
    appPick.globalData.tryonInitialOutfit = applyTabPickToOutfit(prevOutfit, this.data.activeTab, src)
    this.setData({ tryonItemSlots: newSlots, tryonItems })
  },

  onDeleteSubCategoryRow(e) {
    const id = e.currentTarget.dataset.id
    if (!id || this.data.prefitMode !== 'private') return
    const sub = (this.data.subCategories || []).find(function (s) { return s.id === id })
    if (sub && sub.items && sub.items.length > 0) return
    wx.showModal({
      title: '确认删除',
      content: '确定要删除该分类卡片吗？',
      confirmText: '确定',
      cancelText: '取消',
      success: (res) => {
        if (res.confirm) {
          const subCategories = (this.data.subCategories || []).filter(function (s) { return s.id !== id })
          this.savePrivateSubCategories(this.data.activeTab, subCategories)
          this.setData({ subCategories, selectedSubCategoryItem: null })
        }
      }
    })
  },

  onAddCustomSubCategory() {
    if (this.data.prefitMode !== 'private') return
    const newId = 'custom_' + Date.now()
    const newSub = { id: newId, name: '自定义', items: [] }
    const subCategories = (this.data.subCategories || []).concat([newSub])
    this.savePrivateSubCategories(this.data.activeTab, subCategories)
    this.setData({ subCategories })
  },

  onBannerTap(e) {
    const id = e.currentTarget.dataset.id
    const name = e.currentTarget.dataset.name || ''
    this.setData({
      showBannerEditPopup: true,
      editingBannerSubId: id,
      editingBannerName: name
    })
  },

  onBannerEditInput(e) {
    this.setData({ editingBannerName: e.detail.value || '' })
  },

  onBannerEditConfirm() {
    const id = this.data.editingBannerSubId
    const name = (this.data.editingBannerName || '').trim() || '自定义'
    if (!id) {
      this.setData({ showBannerEditPopup: false, editingBannerSubId: '', editingBannerName: '' })
      return
    }
    const subCategories = (this.data.subCategories || []).map(function (s) {
      return s.id === id ? { id: s.id, name, items: s.items || [] } : s
    })
    const app = getApp()
    const config = app.getPrivateSubConfig ? app.getPrivateSubConfig() : {}
    const catKey = this.data.activeTab
    if (this.data.prefitMode === 'private') {
      this.savePrivateSubCategories(catKey, subCategories)
    } else {
      const cfg = config[catKey] || {}
      const renames = Object.assign({}, cfg.renames || {}, { [id]: name })
      const newConfig = Object.assign({}, config, { [catKey]: Object.assign({}, cfg, { renames }) })
      if (app.savePrivateSubConfig) app.savePrivateSubConfig(newConfig)
    }
    this.setData({
      subCategories,
      showBannerEditPopup: false,
      editingBannerSubId: '',
      editingBannerName: ''
    })
  },

  onCloseBannerEditPopup() {
    this.setData({ showBannerEditPopup: false, editingBannerSubId: '', editingBannerName: '' })
  },

  onScanInput() {
    wx.showModal({
      title: '授权说明',
      content: '扫描录入单品需要使用您的摄像头拍摄衣物。授权后即可开始录入，是否同意？',
      confirmText: '同意',
      cancelText: '取消',
      success: (res) => {
        if (res.confirm) {
          wx.navigateTo({ url: '/packageWardrobe/pages/add-clothing/add-clothing' })
        }
      }
    })
  }
})
