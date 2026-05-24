/**
 * 首页 / 日记 / 衣橱 / 我的 —— 四个主界面 Tab 切换（统一 reLaunch，避免页面栈叠加）
 */

const MAIN_MODEL = '/pages/model/model'
const MAIN_DIARY = '/pages/diary/diary'
const MAIN_WARDROBE = '/pages/wardrobe/wardrobe'
const MAIN_MINE = '/pages/mine/mine'

function reLaunchMain(path, gender) {
  const g = gender || 'female'
  wx.reLaunch({
    url: path + '?gender=' + encodeURIComponent(g)
  })
}

module.exports = {
  MAIN_MODEL,
  MAIN_DIARY,
  MAIN_WARDROBE,
  MAIN_MINE,
  reLaunchMain
}
