const { getImageUrl } = require('../../../utils/image.js')

const _img = (p) => getImageUrl('/images/points-store/' + p)

// 积分商城 - 顶部横向 Tab + 两列商品网格
Page({
  data: {
    statusBarHeight: 20,
    tabList: ['日记皮肤', '日记贴纸', '衣橱主题', '衣橱容量', '角色数量'],
    activeTabIndex: 0,
    productList: [
      { id: '1', name: '白色涂鸦', points: 80, image: _img('skin/1.png'), category: 0 },
      { id: '2', name: '典雅纹路', points: 80, image: _img('skin/2.png'), category: 0 },
      { id: '3', name: '彩色涂鸦', points: 80, image: _img('skin/3.png'), category: 0 },
      { id: '13', name: '动感线条', points: 80, image: _img('skin/4.png'), category: 0 },
      { id: '14', name: '米色几何', points: 80, image: _img('skin/5.png'), category: 0 },
      { id: '15', name: '黑白几何', points: 80, image: _img('skin/6.png'), category: 0 },
      { id: '16', name: '彩色几何', points: 80, image: _img('skin/7.png'), category: 0 },
      { id: '17', name: '简约灰蓝', points: 80, image: _img('skin/8.png'), category: 0 },
      { id: '4', name: '贴纸包-毕业季', points: 30, image: _img('sticker/1.png'), category: 1 },
      { id: '5', name: '贴纸包-新春', points: 30, image: _img('sticker/2.png'), category: 1 },
      { id: '6', name: '复古墨绿', points: 120, image: _img('theme/1.png'), category: 2 },
      { id: '7', name: '棕色原木', points: 100, image: _img('theme/2.png'), category: 2 },
      { id: '8', name: '容量+20', points: 200, image: _img('capacity/1.png'), category: 3 },
      { id: '10', name: '青中年男性角色位+1', points: 2000, image: _img('role/1.png'), category: 4 },
      { id: '26', name: '青中年女性角色位+1', points: 2000, image: _img('role/2.png'), category: 4 },
      { id: '27', name: '男童角色位+1', points: 2000, image: _img('role/3.png'), category: 4 },
      { id: '28', name: '女童角色位+1', points: 2000, image: _img('role/4.png'), category: 4 },
      { id: '29', name: '老年男性角色位+1', points: 2000, image: _img('role/5.png'), category: 4 },
      { id: '30', name: '老年女性角色位+1', points: 2000, image: _img('role/6.png'), category: 4 }
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
    this._filterProducts()
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
          category: typeof item.category === 'number' ? item.category : 0
        }
      })
    this.setData({ displayList: filtered })
  },

  onTabTap(e) {
    const index = e.currentTarget.dataset.index
    if (index === undefined) return
    this.setData({ activeTabIndex: index }, () => { this._filterProducts() })
  },

  onExchange(e) {
    const id = e.currentTarget.dataset.id
    wx.showToast({ title: '兑换功能开发中', icon: 'none' })
  }
})
