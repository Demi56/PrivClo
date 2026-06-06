const TAB = {
  RESALE: 'resale',
  FAVORITES: 'favorites'
}

const PAGE_URLS = {
  [TAB.RESALE]: '/packageWardrobe/pages/resale/resale',
  [TAB.FAVORITES]: '/packageWardrobe/pages/favorites-tryon/favorites-tryon'
}

function navigateWardrobeTab(tab, options) {
  const opts = options || {}
  const gender = opts.gender || 'female'
  const current = opts.current || ''
  if (!tab || tab === current) return
  const base = PAGE_URLS[tab]
  if (!base) return
  wx.redirectTo({ url: base + '?gender=' + encodeURIComponent(gender) })
}

module.exports = {
  TAB,
  navigateWardrobeTab
}
