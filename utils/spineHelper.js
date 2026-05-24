/**
 * Spine 换装辅助工具
 * 插槽定义、附件转换、数据兼容
 * 配合 spine-miniprogram 或 spine-wechat 使用
 */

/** 5个衣物插槽（与闪耀暖暖级换装对应） */
const SLOT_NAMES = ['top', 'bottom', 'dress', 'shoes', 'hair']

/** Tab ID 到 Spine 插槽的映射 */
const TAB_TO_SLOT = {
  tops: 'top',
  bottoms: 'bottom',
  sets: 'dress',
  inner: 'top', // 内搭复用 top 插槽下层
  shoes: 'shoes',
  accessories: 'hair'
}

/** 原 outfit 键到 spine 插槽（兼容旧数据结构） */
const OLD_OUTFIT_TO_SLOT = {
  inner: 'top',
  top: 'top',
  bottom: 'bottom',
  suit: 'dress',
  shoes: 'shoes'
}

/**
 * 判断衣物是否为 Spine 附件格式
 * @param {string|Object} item - 衣物数据：旧版为 src 字符串，新版为 { type, slot, attachment, src?, layers? }
 */
function isSpineAttachment(item) {
  if (!item) return false
  if (typeof item === 'object' && item.type === 'spine') return true
  return false
}

/**
 * 判断衣物是否为 PNG 格式（兼容现有数据）
 */
function isPngClothing(item) {
  if (!item) return false
  if (typeof item === 'string' && item.trim()) return true
  if (typeof item === 'object' && (item.src || item.base)) return true
  return false
}

/**
 * 从衣物数据提取 Spine 插槽名
 */
function getSlotFromItem(item) {
  if (!item) return null
  if (typeof item === 'object' && item.slot) return item.slot
  return null
}

/**
 * 从衣物数据提取 Spine 附件名（atlas 中的 region 名称）
 */
function getAttachmentName(item) {
  if (!item) return ''
  if (typeof item === 'object' && item.attachment) return item.attachment
  return ''
}

/**
 * 将旧版 outfit { top, bottom, suit, shoes, inner } 转为 Spine 插槽映射
 * @param {Object} outfit
 * @returns {Object} slot -> 衣物数据
 */
function outfitToSlotMap(outfit) {
  const map = {}
  const o = outfit || {}
  // suit 优先，覆盖 top+bottom
  if (o.suit) {
    map.dress = toClothingData(o.suit)
    map.top = null
    map.bottom = null
  } else {
    if (o.inner) map.top = toClothingData(o.inner, 'top')
    else if (o.top) map.top = toClothingData(o.top, 'top')
    if (o.bottom) map.bottom = toClothingData(o.bottom, 'bottom')
  }
  if (o.shoes) map.shoes = toClothingData(o.shoes, 'shoes')
  return map
}

/**
 * 标准化为衣物数据结构
 * @param {string|Object} raw
 * @param {string} slot
 */
function toClothingData(raw, slot) {
  if (!raw) return null
  if (typeof raw === 'string') {
    return { type: 'png', slot, src: raw }
  }
  if (typeof raw === 'object') {
    return { type: raw.type || 'png', slot: raw.slot || slot, ...raw }
  }
  return null
}

/**
 * 多图层衣物标准化（基础层 + 阴影 + 高光）
 * @param {string|Object|Array} url - 衣物 URL 或图层定义
 * @returns {Array<{ base: string, type: 'base'|'shadow'|'highlight' }>}
 */
function normalizeClothingLayers(url) {
  if (!url) return []
  if (typeof url === 'string') {
    return [{ base: url, type: 'base' }]
  }
  if (Array.isArray(url)) {
    return url.map((u) => (typeof u === 'string' ? { base: u, type: 'base' } : u))
  }
  if (typeof url === 'object' && url.layers) {
    return url.layers
  }
  if (typeof url === 'object' && url.base) {
    return [{ base: url.base, type: url.type || 'base' }, ...(url.shadow ? [{ base: url.shadow, type: 'shadow' }] : []), ...(url.highlight ? [{ base: url.highlight, type: 'highlight' }] : [])]
  }
  return []
}

/**
 * PNG 转为 Spine 附件描述（用于运行时创建 RegionAttachment）
 * 实际创建需在 spine 运行时中完成
 * @param {string} pngUrl
 * @param {string} slotName
 * @returns {Object} 附件描述
 */
function pngToAttachmentDesc(pngUrl, slotName) {
  return {
    type: 'region',
    src: pngUrl,
    slot: slotName,
    name: slotName + '_' + (pngUrl.split('/').pop() || 'custom').replace(/\.[^.]+$/, '')
  }
}

/**
 * 云开发衣物数据结构（支持 Spine）
 * {
 *   _id, name, category, slot,
 *   type: 'png' | 'spine',
 *   src?: string,           // PNG URL
 *   attachment?: string,     // Spine 附件名
 *   layers?: [{ base, type }]
 * }
 */
const CLOUD_CLOTHING_SCHEMA = {
  type: ['png', 'spine'],
  slot: SLOT_NAMES
}

module.exports = {
  SLOT_NAMES,
  TAB_TO_SLOT,
  OLD_OUTFIT_TO_SLOT,
  isSpineAttachment,
  isPngClothing,
  getSlotFromItem,
  getAttachmentName,
  outfitToSlotMap,
  toClothingData,
  normalizeClothingLayers,
  pngToAttachmentDesc,
  CLOUD_CLOTHING_SCHEMA
}
