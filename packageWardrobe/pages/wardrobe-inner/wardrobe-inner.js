let getImageUrl = (p) => (p && typeof p === 'string' ? p : '')
try {
  const img = require('../../../utils/image.js')
  if (img && img.getImageUrl) getImageUrl = img.getImageUrl
} catch (e) { console.warn('[wardrobe-inner] image utils fallback', e) }

const wardrobeNav = require('../../../utils/wardrobeNav.js')

// 从私人衣橱存储中统计各分类的衣物数量
function getCategoryCountsFromWardrobe() {
  const app = getApp()
  const items = app.getUserWardrobeItems ? app.getUserWardrobeItems() : {}
  const counts = { tops: 0, bottoms: 0, sets: 0, inner: 0, shoes: 0, accessories: 0 }
  const customTypes = app.getCustomTypes ? app.getCustomTypes() : []
  customTypes.forEach(t => { counts[t.id] = 0 })
  for (const key of Object.keys(items)) {
    const parts = key.split(':')
    if (parts.length >= 2 && Array.isArray(items[key])) {
      const typeId = parts[0]
      if (counts.hasOwnProperty(typeId)) {
        counts[typeId] += items[key].length
      } else if (typeId.startsWith('custom_')) {
        counts[typeId] = (counts[typeId] || 0) + items[key].length
      }
    }
  }
  return counts
}

// 衣橱内页 - 收藏区 + 衣物分区
Page({
  data: {
    statusBarHeight: 20,
    scrollAreaTop: 0,
    scrollAreaBottom: 0,
    gender: 'female',
    wardrobeNavTab: '',
    categories: [
      { id: 'tops', name: '上衣区', count: 0, unit: '件', cover: '/packageWardrobe/images/categories/tops-cover.png' },
      { id: 'bottoms', name: '下装区', count: 0, unit: '件', cover: '/packageWardrobe/images/categories/bottoms-cover.png' },
      { id: 'sets', name: '套装区', count: 0, unit: '件', cover: '/packageWardrobe/images/categories/sets-cover.png' },
      { id: 'inner', name: '内搭区', count: 0, unit: '件', cover: '/packageWardrobe/images/categories/inner-cover.png' },
      { id: 'shoes', name: '鞋子区', count: 0, unit: '双', cover: '/packageWardrobe/images/categories/shoes-cover.png' },
      { id: 'accessories', name: '其他配饰区', count: 0, unit: '件', cover: '/packageWardrobe/images/categories/accessories-cover.png' }
    ]
  },

  onLoad(options) {
    let statusBarHeight = 20
    let scrollAreaTop = 60
    let scrollAreaBottom = 120
    try {
      const sys = wx.getSystemInfoSync()
      statusBarHeight = sys.statusBarHeight || 20
      const w = sys.windowWidth || 375
      const safeBottom = (sys.safeAreaInsets && sys.safeAreaInsets.bottom) || 0
      const rpx2px = w / 750
      scrollAreaTop = statusBarHeight + Math.ceil((24 + 72) * rpx2px) /* header: padding + content */
      const footerHeight = (24 + 88 + 24) * rpx2px + safeBottom
      scrollAreaBottom = Math.ceil(footerHeight)
      this.setData({ statusBarHeight, scrollAreaTop, scrollAreaBottom })
    } catch (e) {
      this.setData({ statusBarHeight, scrollAreaTop, scrollAreaBottom })
    }
    const gender = options.gender || 'female'
    const counts = getCategoryCountsFromWardrobe()
    const app = getApp()
    const baseCats = (this.data.categories || []).map(c => ({
      ...c,
      count: counts[c.id] || 0,
      cover: c.cover ? getImageUrl(c.cover) : c.cover
    }))
    const customTypes = app.getCustomTypes ? app.getCustomTypes() : []
    const customCats = customTypes.map(t => ({
      id: t.id,
      name: t.name + '区',
      count: counts[t.id] || 0,
      unit: '件',
      cover: null
    }))
    const categories = baseCats.concat(customCats)
    this.setData({ gender, categories })
  },

  onShow() {
    const app = getApp()
    const counts = getCategoryCountsFromWardrobe()
    const baseCats = [
      { id: 'tops', name: '上衣区', count: 0, unit: '件', cover: '/packageWardrobe/images/categories/tops-cover.png' },
      { id: 'bottoms', name: '下装区', count: 0, unit: '件', cover: '/packageWardrobe/images/categories/bottoms-cover.png' },
      { id: 'sets', name: '套装区', count: 0, unit: '件', cover: '/packageWardrobe/images/categories/sets-cover.png' },
      { id: 'inner', name: '内搭区', count: 0, unit: '件', cover: '/packageWardrobe/images/categories/inner-cover.png' },
      { id: 'shoes', name: '鞋子区', count: 0, unit: '双', cover: '/packageWardrobe/images/categories/shoes-cover.png' },
      { id: 'accessories', name: '其他配饰区', count: 0, unit: '件', cover: '/packageWardrobe/images/categories/accessories-cover.png' }
    ]
    const categoriesMapped = baseCats.map(c => ({
      ...c,
      count: counts[c.id] || 0,
      cover: c.cover ? getImageUrl(c.cover) : c.cover
    }))
    const customTypes = app.getCustomTypes ? app.getCustomTypes() : []
    const customCats = customTypes.map(t => ({
      id: t.id,
      name: t.name + '区',
      count: counts[t.id] || 0,
      unit: '件',
      cover: null
    }))
    const categories = categoriesMapped.concat(customCats)
    this.setData({ categories })
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

  onCategoryTap(e) {
    const id = e.currentTarget.dataset.id
    const gender = this.data.gender || 'female'
    if (['tops', 'bottoms', 'sets', 'inner', 'shoes', 'accessories'].includes(id) || (id && id.startsWith('custom_'))) {
      wx.navigateTo({
        url: '/packageWardrobe/pages/category-detail/category-detail?category=' + encodeURIComponent(id) + '&gender=' + gender
      })
    } else {
      wx.showToast({ title: '进入 ' + id, icon: 'none' })
    }
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
