/**
 * 安全返回上一页，避免页面栈不足时触发开发者工具 routeDone 警告
 */
function getPageStackDepth() {
  const pages = getCurrentPages()
  return pages && pages.length ? pages.length : 0
}

function safeNavigateBack(options) {
  const opts = options || {}
  const depth = getPageStackDepth()
  if (depth <= 1) {
    const fallback = opts.fallbackUrl || '/pages/wardrobe/wardrobe'
    wx.reLaunch({
      url: fallback,
      fail: () => wx.switchTab && wx.switchTab({ url: fallback })
    })
    return
  }
  const wantDelta = opts.delta != null ? opts.delta : 1
  const delta = Math.min(Math.max(wantDelta, 1), depth - 1)
  wx.navigateBack({
    delta,
    fail: () => {
      const fallback = opts.fallbackUrl || '/pages/wardrobe/wardrobe'
      wx.reLaunch({ url: fallback })
    }
  })
}

/** 登录/授权后返回触发保存的页面（只退一层，回到 add-clothing 等） */
function backAfterAuth(fromSave) {
  if (fromSave) {
    safeNavigateBack({ delta: 1 })
    return
  }
  const app = getApp()
  const g = app && app.getUserGender && app.getUserGender()
  const genderQ = (g === 'male' || g === 'female') ? '?gender=' + encodeURIComponent(g) : ''
  wx.reLaunch({ url: '/pages/model/model' + genderQ })
}

module.exports = {
  safeNavigateBack,
  backAfterAuth,
  getPageStackDepth
}
