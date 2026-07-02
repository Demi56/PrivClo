/**
 * 系统信息（替代已弃用的 wx.getSystemInfoSync）
 */
function getSystemMetrics() {
  let statusBarHeight = 20
  let windowWidth = 375
  let pixelRatio = 2
  let safeAreaInsets = { top: 0, right: 0, bottom: 0, left: 0 }

  try {
    if (wx.getWindowInfo) {
      const win = wx.getWindowInfo()
      if (win.statusBarHeight != null) statusBarHeight = win.statusBarHeight
      if (win.windowWidth) windowWidth = win.windowWidth
      if (win.pixelRatio) pixelRatio = win.pixelRatio
      if (win.safeAreaInsets) safeAreaInsets = win.safeAreaInsets
    } else {
      const sys = wx.getSystemInfoSync()
      statusBarHeight = sys.statusBarHeight || statusBarHeight
      windowWidth = sys.windowWidth || windowWidth
      pixelRatio = sys.pixelRatio || pixelRatio
      safeAreaInsets = sys.safeAreaInsets || safeAreaInsets
    }
  } catch (e) {}

  return { statusBarHeight, windowWidth, pixelRatio, safeAreaInsets }
}

module.exports = {
  getSystemMetrics
}
