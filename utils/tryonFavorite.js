const SEASON_OPTIONS = ['春季', '夏季', '秋季', '冬季']
const SCENE_OPTIONS = ['通勤', '约会', '旅游', '运动', '宅家', '晚宴']
const STYLE_OPTIONS = ['日常休闲', '法式', '极简', '复古', '潮酷', '新中式']
const HOME_FAVORITE_OUTFIT_ID_KEY = 'privclo_home_tryon_favorite_id'

function formatDate(date) {
  const d = date || new Date()
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return y + '-' + m + '-' + day
}

function buildTryonFavoriteOutfit(options) {
  const opts = options || {}
  const season = opts.season || ''
  const scene = opts.scene || ''
  const style = opts.style || ''
  const tags = [season, scene, style].filter(Boolean)
  const slots = Array.isArray(opts.slots) ? opts.slots.filter(function (s) { return s }) : []
  return {
    id: opts.id || ('fav_' + Date.now()),
    outfitKey: opts.outfitKey || '',
    image: opts.image || '',
    tags: tags,
    title: opts.title || '',
    date: opts.date || formatDate(new Date()),
    season: season,
    scene: scene,
    style: style,
    favorited: true,
    tryonPrimary: false,
    tryonItemSlots: slots.slice(),
    source: opts.source || 'tryon'
  }
}

function getFavoriteOutfits() {
  const app = getApp()
  return app.getFavoriteOutfits ? app.getFavoriteOutfits() : []
}

function addFavoriteOutfit(outfit) {
  if (!outfit || !outfit.id) return null
  const app = getApp()
  const saved = getFavoriteOutfits()
  const next = saved.filter(function (item) { return item.id !== outfit.id })
  next.push(outfit)
  if (app.saveFavoriteOutfits) app.saveFavoriteOutfits(next)
  if (app.globalData) {
    app.globalData.lastTryonFavoriteTags = outfit.tags || []
    if (outfit.tryonItemSlots && outfit.tryonItemSlots.length) {
      app.globalData.favoritesTryonItemSlots = outfit.tryonItemSlots.slice()
    }
  }
  return outfit
}

function removeFavoriteOutfit(id) {
  if (!id) return
  const app = getApp()
  const next = getFavoriteOutfits().filter(function (item) { return item.id !== id })
  if (app.saveFavoriteOutfits) app.saveFavoriteOutfits(next)
}

function saveTryonFavoriteFromTags(options) {
  const opts = options || {}
  const seasonOptions = opts.seasonOptions || SEASON_OPTIONS
  const sceneOptions = opts.sceneOptions || SCENE_OPTIONS
  const styleOptions = opts.styleOptions || STYLE_OPTIONS
  const si = typeof opts.seasonIndex === 'number' ? opts.seasonIndex : 0
  const ci = typeof opts.sceneIndex === 'number' ? opts.sceneIndex : 0
  const ti = typeof opts.styleIndex === 'number' ? opts.styleIndex : 0
  const outfit = buildTryonFavoriteOutfit({
    id: opts.id,
    image: opts.image || '',
    slots: opts.slots || [],
    season: seasonOptions[si] || '',
    scene: sceneOptions[ci] || '',
    style: styleOptions[ti] || '',
    source: opts.source || 'tryon'
  })
  return addFavoriteOutfit(outfit)
}

function loadHomeFavoriteOutfitId() {
  try {
    return wx.getStorageSync(HOME_FAVORITE_OUTFIT_ID_KEY) || ''
  } catch (e) {
    return ''
  }
}

function saveHomeFavoriteOutfitId(id) {
  try {
    if (id) wx.setStorageSync(HOME_FAVORITE_OUTFIT_ID_KEY, id)
    else wx.removeStorageSync(HOME_FAVORITE_OUTFIT_ID_KEY)
  } catch (e) {}
}

function isFavoriteOutfitActive(id) {
  if (!id) return false
  return getFavoriteOutfits().some(function (item) {
    return item.id === id && item.favorited !== false
  })
}

module.exports = {
  SEASON_OPTIONS,
  SCENE_OPTIONS,
  STYLE_OPTIONS,
  HOME_FAVORITE_OUTFIT_ID_KEY,
  formatDate,
  buildTryonFavoriteOutfit,
  getFavoriteOutfits,
  addFavoriteOutfit,
  removeFavoriteOutfit,
  saveTryonFavoriteFromTags,
  loadHomeFavoriteOutfitId,
  saveHomeFavoriteOutfitId,
  isFavoriteOutfitActive
}
