const { getImageUrl } = require('../config/cdn.js')

const WARDROBE_THEME_STORAGE_KEY = 'privclo_wardrobe_theme_id'
const DEFAULT_WARDROBE_THEME_ID = 'classic'

const WARDROBE_THEMES = [
  {
    id: 'classic',
    name: '经典青蓝',
    image: '',
    previewColor: '#6EC5D9'
  },
  {
    id: 'theme-1',
    name: '复古墨绿',
    image: getImageUrl('/images/points-store/theme/1.png'),
    previewColor: '#3D5C4A'
  },
  {
    id: 'theme-2',
    name: '棕色原木',
    image: getImageUrl('/images/points-store/theme/2.png'),
    previewColor: '#C4956A'
  }
]

function getThemeById(id) {
  return WARDROBE_THEMES.find(function (item) { return item.id === id }) || null
}

function loadThemeId() {
  try {
    const saved = wx.getStorageSync(WARDROBE_THEME_STORAGE_KEY)
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

function resolveActiveTheme(id) {
  const themeId = id || loadThemeId()
  const theme = getThemeById(themeId) || getThemeById(DEFAULT_WARDROBE_THEME_ID)
  return {
    id: theme.id,
    name: theme.name,
    image: theme.image || '',
    previewColor: theme.previewColor || '#6EC5D9'
  }
}

module.exports = {
  WARDROBE_THEME_STORAGE_KEY,
  DEFAULT_WARDROBE_THEME_ID,
  WARDROBE_THEMES,
  getThemeById,
  loadThemeId,
  saveThemeId,
  resolveActiveTheme
}
