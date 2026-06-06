const { getImageUrl } = require('../../../utils/image.js')

// 邀请好友 - 分享确认界面
Page({
  data: {
    statusBarHeight: 20,
    spriteUrl: '',
    roleName: '默认用户',
    inviteCode: 'WB-8829',
    invitedList: [
      { id: 1, name: '小甜甜', time: '2分钟前', avatar: '' },
      { id: 2, name: 'A-Lin', time: '1小时前', avatar: '' },
      { id: 3, name: '一只小兔子', time: '3小时前', avatar: '' }
    ]
  },

  onLoad(options) {
    try {
      const sys = wx.getSystemInfoSync()
      this.setData({ statusBarHeight: sys.statusBarHeight || 20 })
    } catch (e) {
      this.setData({ statusBarHeight: 20 })
    }
    const roleName = options.roleName || getApp().getDefaultUserDisplayName()
    this.setData({
      roleName,
      spriteUrl: getImageUrl('/images/sprite.png')
    })
  },

  onBack() {
    wx.navigateBack()
  },

  onCopyCode() {
    wx.setClipboardData({
      data: this.data.inviteCode,
      success: () => {
        wx.showToast({ title: '已复制邀请码', icon: 'success' })
      }
    })
  },

  onCopyLink() {
    const link = 'https://privclo.example.com/invite/' + this.data.inviteCode
    wx.setClipboardData({
      data: link,
      success: () => {
        wx.showToast({ title: '已复制链接', icon: 'success' })
      }
    })
  },

  onShareWechat() {
    wx.showToast({ title: '请点击右上角分享给微信好友', icon: 'none' })
  },

  onShareQQ() {
    wx.showToast({ title: 'QQ分享', icon: 'none' })
  },

  onViewAll() {
    wx.showToast({ title: '查看全部', icon: 'none' })
  },

  onShareAppMessage() {
    return {
      title: '邀请你加入 PrivClo 穿搭小助手，注册即得1000积分！',
      path: '/pages/model/model?inviteCode=' + this.data.inviteCode
    }
  }
})
