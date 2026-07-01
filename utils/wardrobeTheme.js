const {
  getWardrobeThemeCloudFileId,
  resolveWardrobeThemeTempUrl,
  resolveWardrobeThemeTempUrls
} = require('./pointsStoreImage.js')

const WARDROBE_THEME_STORAGE_KEY = 'privclo_wardrobe_theme_id'
const DEFAULT_WARDROBE_THEME_ID = 'theme-1'

const WARDROBE_THEMES = [
  {
    id: 'theme-1',
    name: '经典奶油',
    themeIndex: 1,
    image: '',
    previewColor: '#F5E6D3'
  },
  {
    id: 'theme-2',
    name: '复古墨绿',
    themeIndex: 2,
    image: '',
    previewColor: '#3D5C4A'
  },
  {
    id: 'theme-3',
    name: '棕色原木',
    themeIndex: 3,
    image: '',
    previewColor: '#C4956A'
  }
]

const WARDROBE_THEME_PRODUCT_ID_TO_THEME_ID = {
  '11': 'theme-1',
  '6': 'theme-2',
  '7': 'theme-3'
}

function getThemeIdByProductId(productId) {
  return WARDROBE_THEME_PRODUCT_ID_TO_THEME_ID[String(productId)] || ''
}

function getActiveWardrobeThemeId() {
  return loadThemeId()
}

function setActiveWardrobeThemeByProductId(productId) {
  const themeId = getThemeIdByProductId(productId)
  if (themeId) saveThemeId(themeId)
}

function getThemeById(id) {
  return WARDROBE_THEMES.find(function (item) { return item.id === id }) || null
}

function loadThemeId() {
  try {
    const saved = wx.getStorageSync(WARDROBE_THEME_STORAGE_KEY)
    if (saved === 'classic') return DEFAULT_WARDROBE_THEME_ID
    if (saved && getThemeById(saved)) return saved
  } catch (e) {}
  return DEFAULT_WARDROBE_THEME_ID
}

function saveThemeId(id) {
  if (!getThemeById(id)) return
  try {
    wx.setStorageSync(WARDROBE_THEME_STORAGE_KEY, id)
  } catch (e) {}
}

function refreshThemeImage(theme) {
  if (!theme || !theme.themeIndex) return Promise.resolve('')
  return resolveWardrobeThemeTempUrl(theme.themeIndex)
}

function resolveActiveTheme(id) {
  const themeId = id || loadThemeId()
  const theme = getThemeById(themeId) || getThemeById(DEFAULT_WARDROBE_THEME_ID)
  return {
    id: theme.id,
    name: theme.name,
    themeIndex: theme.themeIndex,
    image: theme.image || '',
    previewColor: theme.previewColor || '#F5E6D3'
  }
}

function refreshActiveThemeImage(id) {
  const theme = resolveActiveTheme(id)
  return refreshThemeImage(theme).then((url) => ({
    ...theme,
    image: url || theme.image || getWardrobeThemeCloudFileId(theme.themeIndex) || ''
  }))
}

module.exports = {
  WARDROBE_THEME_STORAGE_KEY,
  DEFAULT_WARDROBE_THEME_ID,
  WARDROBE_THEMES,
  WARDROBE_THEME_PRODUCT_ID_TO_THEME_ID,
  getThemeById,
  getThemeIdByProductId,
  getActiveWardrobeThemeId,
  setActiveWardrobeThemeByProductId,
  loadThemeId,
  saveThemeId,
  refreshThemeImage,
  resolveActiveTheme,
  refreshActiveThemeImage,
  resolveWardrobeThemeTempUrls
}
