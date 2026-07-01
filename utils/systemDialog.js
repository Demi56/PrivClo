/**
 * 统一系统弹窗确认按钮色（wx.showModal 默认绿色 → 天蓝）
 */
const THEME = require('../config/theme.js')
const MODAL_CONFIRM_COLOR = THEME.modalConfirm || THEME.deepBlue || '#0EA5E9'

let patched = false

function patchSystemDialogs() {
  if (patched || typeof wx === 'undefined' || !wx.showModal) return
  const rawShowModal = wx.showModal.bind(wx)
  wx.showModal = function (options) {
    const opts = options || {}
    if (!opts.confirmColor) {
      opts.confirmColor = MODAL_CONFIRM_COLOR
    }
    return rawShowModal(opts)
  }
  patched = true
}

module.exports = {
  MODAL_CONFIRM_COLOR,
  patchSystemDialogs
}
