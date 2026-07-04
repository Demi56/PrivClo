const tryonItemSlotsSync = require('./tryonItemSlotsSync.js')

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

const PATH_TAB_SEGMENTS = [
  ['/items/tops/', 'tops'],
  ['/items/bottoms/', 'bottoms'],
  ['/items/sets/', 'sets'],
  ['/items/inner/', 'inner'],
  ['/items/shoes/', 'shoes'],
  ['/items/accessories/', 'accessories']
]

function normalizeSrcKey(src) {
  const s = String(src || '').trim()
  if (!s) return ''
  const idx = Math.max(s.lastIndexOf('/'), s.lastIndexOf('\\'))
  return idx >= 0 ? s.slice(idx + 1) : s
}

function srcMatchesEntry(src, entry) {
  const s = String(src || '').trim()
  if (!s) return false
  if (typeof entry === 'string') {
    const t = entry.trim()
    return t === s || normalizeSrcKey(t) === normalizeSrcKey(s)
  }
  if (!entry || typeof entry !== 'object') return false
  return [entry.src, entry.srcFront, entry.srcBack].some(function (v) {
    if (!v) return false
    const t = String(v).trim()
    return t === s || normalizeSrcKey(t) === normalizeSrcKey(s)
  })
}

function findTabIdForWardrobeSrc(src, app) {
  if (!src) return null
  app = app || (typeof getApp === 'function' ? getApp() : null)
  const items = (app && app.getUserWardrobeItems
    ? app.getUserWardrobeItems()
    : (app && app.globalData && app.globalData.userWardrobeItems)) || {}
  const keys = Object.keys(items)
  for (let k = 0; k < keys.length; k++) {
    const tabId = keys[k].split(':')[0]
    const arr = items[keys[k]] || []
    for (let j = 0; j < arr.length; j++) {
      if (srcMatchesEntry(src, arr[j])) return tabId
    }
  }
  return null
}

function resolveTabIdForSrc(src, app) {
  if (!src) return null
  const s = String(src)
  for (let i = 0; i < PATH_TAB_SEGMENTS.length; i++) {
    const seg = PATH_TAB_SEGMENTS[i][0]
    const tabId = PATH_TAB_SEGMENTS[i][1]
    if (s.indexOf(seg) >= 0) return tabId
  }
  return findTabIdForWardrobeSrc(src, app)
}

function findWardrobeItemBySrc(src, app) {
  if (!src) return null
  const s = String(src).trim()
  if (!s) return null
  app = app || (typeof getApp === 'function' ? getApp() : null)
  const items = (app && app.getUserWardrobeItems
    ? app.getUserWardrobeItems()
    : (app && app.globalData && app.globalData.userWardrobeItems)) || {}
  const keys = Object.keys(items)
  for (let k = 0; k < keys.length; k++) {
    const arr = items[keys[k]] || []
    for (let j = 0; j < arr.length; j++) {
      const e = arr[j]
      if (srcMatchesEntry(s, e)) {
        return typeof e === 'string' ? e : e
      }
    }
  }
  return s
}

function buildOutfitFromTryonSlots(slots, app) {
  app = app || (typeof getApp === 'function' ? getApp() : null)
  let outfit = emptyOutfit()
  const filled = tryonItemSlotsSync.getFilledItems(slots)
  filled.forEach(function (src) {
    const tabId = resolveTabIdForSrc(src, app)
    if (!tabId) return
    const item = findWardrobeItemBySrc(src, app) || src
    outfit = applyTabPickToOutfit(outfit, tabId, item)
  })
  return outfit
}

function pickTopSrcFromTryonSlots(slots, app) {
  app = app || (typeof getApp === 'function' ? getApp() : null)
  const filled = tryonItemSlotsSync.getFilledItems(slots)
  if (!filled.length) return ''

  for (let i = 0; i < filled.length; i++) {
    const tabId = resolveTabIdForSrc(filled[i], app)
    if (tabId === 'tops' || tabId === 'sets') {
      return getItemSrc(findWardrobeItemBySrc(filled[i], app) || filled[i])
    }
  }

  if (filled.length === 1) {
    return getItemSrc(findWardrobeItemBySrc(filled[0], app) || filled[0])
  }

  for (let i = 0; i < filled.length; i++) {
    const src = getItemSrc(findWardrobeItemBySrc(filled[i], app) || filled[i])
    if (src) return src
  }

  return ''
}

/**
 * 首页 3D 试穿：优先从槽位重建 outfit，并单独解析 top 贴图 src
 */
function resolveHomeTryonFromApp(app) {
  app = app || (typeof getApp === 'function' ? getApp() : null)
  const slots = tryonItemSlotsSync.getTryonItemSlotsFromApp(app)
  const fromSlots = buildOutfitFromTryonSlots(slots, app)
  const legacy = (app && app.globalData && app.globalData.tryonInitialOutfit) || null
  const legacyOk = legacy && typeof legacy === 'object' && outfitHasWearableLayers(legacy)
  const outfit = outfitHasWearableLayers(fromSlots)
    ? fromSlots
    : (legacyOk ? legacy : emptyOutfit())

  let topSrc = getItemSrc(outfit.top)
  if (!topSrc) topSrc = pickTopSrcFromTryonSlots(slots, app)
  if (!topSrc && legacyOk) topSrc = getItemSrc(legacy.top)

  if (!topSrc) {
    const filled = tryonItemSlotsSync.getFilledItems(slots)
    if (filled.length) {
      topSrc = getItemSrc(findWardrobeItemBySrc(filled[0], app) || filled[0])
    }
  }

  if (outfitHasWearableLayers(fromSlots) && app && app.globalData) {
    app.globalData.tryonInitialOutfit = fromSlots
  }

  return { outfit: outfit, topSrc: topSrc || '', slots: slots }
}

function outfitHasWearableLayers(outfit) {
  const o = outfit || {}
  return ['inner', 'top', 'bottom', 'shoes', 'suit'].some(function (key) {
    return !!getItemSrc(o[key])
  })
}

/**
 * 将实时试穿区单品格同步到 globalData，供首页 3D 模特使用
 * @returns {{ ok: boolean, reason?: string, outfit?: object, gender?: string }}
 */
function commitTryonToHome(slots, options) {
  const opts = options || {}
  const app = opts.app || getApp()
  const filled = tryonItemSlotsSync.getFilledItems(slots)
  if (!filled.length) {
    return { ok: false, reason: 'empty' }
  }
  const normalized = tryonItemSlotsSync.setTryonItemSlotsToApp(slots, app)
  const outfit = buildOutfitFromTryonSlots(normalized, app)
  if (!outfitHasWearableLayers(outfit)) {
    return { ok: false, reason: 'no_wearable' }
  }
  app.globalData.tryonInitialOutfit = outfit
  return {
    ok: true,
    outfit: outfit,
    gender: opts.gender || 'female'
  }
}

module.exports = {
  TAB_TO_OUTFIT_KEY,
  emptyOutfit,
  getItemSrc,
  applyTabPickToOutfit,
  removeSrcFromOutfit,
  resolveTabIdForSrc,
  findWardrobeItemBySrc,
  buildOutfitFromTryonSlots,
  pickTopSrcFromTryonSlots,
  resolveHomeTryonFromApp,
  commitTryonToHome
}
