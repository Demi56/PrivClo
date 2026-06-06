/**
 * 分类 Tab → model-tryon 槽位键（配饰等无对应图层时不更新 Canvas）
 */
const TAB_TO_OUTFIT_KEY = {
  tops: 'top',
  bottoms: 'bottom',
  sets: 'suit',
  inner: 'inner',
  shoes: 'shoes',
  accessories: null
}

function emptyOutfit() {
  return { inner: '', top: '', bottom: '', shoes: '', suit: '' }
}

/**
 * 从衣物项提取用于展示/ fallback 的 src
 * @param {string|Object} item - 字符串为旧版 src，对象为 { src?, base?, type?, slot?, attachment? }
 */
function getItemSrc(item) {
  if (!item) return ''
  if (typeof item === 'string') return item.trim()
  return (item.srcFront || item.src || item.base || item.imageUrl || item.url || '').trim()
}

/**
 * 应用所选衣物到 outfit
 * @param {Object} outfit
 * @param {string} tabId
 * @param {string|Object} item - 旧版为 src 字符串，Spine 版为 { type, slot, attachment, src?, layers? }
 */
function applyTabPickToOutfit(outfit, tabId, item) {
  const o = Object.assign(emptyOutfit(), outfit || {})
  const key = TAB_TO_OUTFIT_KEY[tabId]
  if (!key) return o
  const hasValue = typeof item === 'string'
    ? !!item.trim()
    : !!(item && (item.src || item.srcFront || item.attachment || item.base || item.imageUrl || item.url))
  if (!hasValue) return o
  const value = item
  if (key === 'suit') {
    o.suit = value
    o.top = ''
    o.bottom = ''
  } else if (key === 'top' || key === 'bottom') {
    o[key] = value
    o.suit = ''
  } else {
    o[key] = value
  }
  return o
}

function removeSrcFromOutfit(outfit, src) {
  if (!src) return outfit || emptyOutfit()
  const o = Object.assign({}, emptyOutfit(), outfit || {})
  const toRemove = typeof src === 'string' ? src : getItemSrc(src)
  Object.keys(o).forEach(function (k) {
    const v = o[k]
    if (toRemove && (v === toRemove || (v && getItemSrc(v) === toRemove))) o[k] = ''
  })
  return o
}

module.exports = {
  TAB_TO_OUTFIT_KEY,
  emptyOutfit,
  getItemSrc,
  applyTabPickToOutfit,
  removeSrcFromOutfit
}
