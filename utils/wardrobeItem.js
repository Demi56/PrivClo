/**
 * 衣橱单品结构：支持正面/背面抠图
 * { src, srcFront, srcBack } 或旧版字符串 cloud:// / https
 */

function normalizeWardrobeItem(item) {
  if (!item) return null
  if (typeof item === 'string') {
    const src = item.trim()
    if (!src) return null
    return { src, srcFront: src, srcBack: '' }
  }
  if (typeof item !== 'object') return null
  const srcFront = (item.srcFront || item.src || item.imageUrl || item.base || item.url || '').trim()
  const srcBack = (item.srcBack || '').trim()
  const src = (item.src || srcFront || '').trim()
  if (!src && !srcFront) return null
  return Object.assign({}, item, {
    src: src || srcFront,
    srcFront: srcFront || src,
    srcBack
  })
}

/** 上衣/下装/套装建议录入背面；鞋/配饰可单面 */
function needsDualSide(typeId) {
  const id = String(typeId || '').toLowerCase()
  return id === 'tops' || id === 'bottoms' || id === 'sets' || id === 'inner'
}

function extractTryonTextures(item) {
  const n = normalizeWardrobeItem(item)
  if (!n) return null
  return {
    front: n.srcFront || n.src,
    back: n.srcBack || ''
  }
}

module.exports = {
  normalizeWardrobeItem,
  needsDualSide,
  extractTryonTextures
}
