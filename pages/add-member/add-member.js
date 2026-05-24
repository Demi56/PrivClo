const { getImageUrl } = require('../../utils/image.js')

const _roleImg = (n) => getImageUrl('/images/points-store/role/' + n + '.png')

// 添加成员页 - 角色位购买
// 六角色布局：总宽 680rpx，容器高 420rpx，人物底部对齐，left 有重叠实现「站在一起」
// roleImage 对应积分商城角色数量卡片的图片（role/1~6.png）
const CHARACTERS = [
  { id: 'male-child', index: 0, name: '男童', exchangeName: '男童角色位+1', points: 2000, roleImage: _roleImg(3), left: 30, width: 110, height: 360, bottom: 40, zIndex: 1 },
  { id: 'female-child', index: 1, name: '女童', exchangeName: '女童角色位+1', points: 2000, roleImage: _roleImg(4), left: 120, width: 110, height: 320, bottom: 20, zIndex: 2 },
  { id: 'middle-male', index: 2, name: '青中年男性', exchangeName: '青中年男性角色位+1', points: 2000, roleImage: _roleImg(1), left: 295, width: 140, height: 500, bottom: 0, zIndex: 3 },
  { id: 'middle-female', index: 3, name: '青中年女性', exchangeName: '青中年女性角色位+1', points: 2000, roleImage: _roleImg(2), left: 200, width: 110, height: 460, bottom: 0, zIndex: 4 },
  { id: 'elder-male', index: 4, name: '老年男性', exchangeName: '老年男性角色位+1', points: 2000, roleImage: _roleImg(5), left: 430, width: 130, height: 480, bottom: 0, zIndex: 5 },
  { id: 'elder-female', index: 5, name: '老年女性', exchangeName: '老年女性角色位+1', points: 2000, roleImage: _roleImg(6), left: 550, width: 130, height: 470, bottom: 0, zIndex: 6 }
]

Page({
  data: {
    statusBarHeight: 20,
    addMemberCharactersUrl: '',
    characters: CHARACTERS,
    selectedIndex: -1
  },

  onBack() {
    const pages = getCurrentPages()
    if (pages.length > 1) {
      wx.navigateBack()
    } else {
      wx.redirectTo({ url: '/pages/role/role' })
    }
  },

  onLoad() {
    try {
      const sys = wx.getSystemInfoSync()
      this.setData({
        statusBarHeight: sys.statusBarHeight || 20,
        addMemberCharactersUrl: getImageUrl('/images/role/add-member-characters.png')
      })
    } catch (e) {
      this.setData({ statusBarHeight: 20, addMemberCharactersUrl: getImageUrl('/images/role/add-member-characters.png') })
    }
  },

  onCharacterTap(e) {
    const index = e.currentTarget.dataset.index
    if (index === undefined || index < 0) return
    const item = CHARACTERS[index]
    const selectedIndex = this.data.selectedIndex === index ? -1 : index
    this.setData({ selectedIndex })
    if (item && selectedIndex >= 0) {
      wx.showToast({ title: '已选 ' + item.name, icon: 'none' })
    }
  },

  onCloseExchangePopup() {
    this.setData({ selectedIndex: -1 })
  },

  onCardTap() {
    // 阻止冒泡，点击卡片不关闭弹窗
  },

  onExchangeConfirm() {
    const idx = this.data.selectedIndex
    const item = idx >= 0 && CHARACTERS[idx] ? CHARACTERS[idx] : null
    if (!item) return
    const app = getApp()
    const required = item.points || 2000
    const current = (app.getPoints && app.getPoints()) || 0
    if (current >= required) {
      if (app.addPointsRecord) app.addPointsRecord('expense', '角色位兑换-' + item.name, -required)
      wx.showToast({ title: '兑换成功', icon: 'success' })
      this.setData({ selectedIndex: -1 })
    } else {
      wx.showToast({ title: '积分不足，兑换失败，快去做任务换取积分吧！', icon: 'none', duration: 3000 })
    }
  }
})
