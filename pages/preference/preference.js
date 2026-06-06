// 新用户引导页已合并至首页性别弹窗；保留本页作兼容跳转
Page({
  onLoad() {
    wx.redirectTo({ url: '/pages/model/model' })
  }
})
