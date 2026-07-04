/**
 * 首页 / 日记 / 衣橱 / 我的 —— 四个主界面 Tab 切换（统一 reLaunch，避免页面栈叠加）
 */

const MAIN_MODEL = '/pages/model/model'
const MAIN_DIARY = '/pages/diary/diary'
const MAIN_WARDROBE = '/pages/wardrobe/wardrobe'
const MAIN_MINE = '/pages/mine/mine'

let relaunchLock = false
let relaunchTimer = null

function normalizeRoute(path) {
  return String(path || '').replace(/^\//, '')
}

function getTopPage() {
  const pages = getCurrentPages()
  if (!pages || !pages.length) return null
  return pages[pages.length - 1]
}

function reLaunchMain(path, gender) {
  const g = gender || 'female'
  const url = path + '?gender=' + encodeURIComponent(g)
  const targetRoute = normalizeRoute(path)
  const top = getTopPage()

  if (top) {
    const currentRoute = normalizeRoute(top.route || top.__route__ || '')
    const options = top.options || {}
    if (currentRoute === targetRoute && String(options.gender || 'female') === g) {
      return
    }
  }

  if (relaunchLock) return
  relaunchLock = true
  if (relaunchTimer) clearTimeout(relaunchTimer)

  relaunchTimer = setTimeout(function () {
    relaunchTimer = null
    wx.reLaunch({
      url: url,
      complete: function () {
        relaunchLock = false
      },
      fail: function () {
        relaunchLock = false
      }
    })
  }, 50)
}

module.exports = {
  MAIN_MODEL,
  MAIN_DIARY,
  MAIN_WARDROBE,
  MAIN_MINE,
  reLaunchMain
}
