/**
 * 用户画像关键词矩阵构建
 * 供智能推荐系统使用
 */

/**
 * @param {Object} userData - 来自 app 的本地数据
 */
function buildUserProfile(userData) {
  const data = userData || {}
  const keywords = []

  if (data.stylePreferences && Array.isArray(data.stylePreferences)) {
    data.stylePreferences.forEach(style => {
      keywords.push({ category: 'style', value: style, weight: 1.0 })
    })
  }

  if (data.avoidItems && Array.isArray(data.avoidItems)) {
    data.avoidItems.forEach(item => {
      keywords.push({ category: 'avoid', value: item, weight: 0.9 })
    })
  }

  if (data.preferItems && Array.isArray(data.preferItems)) {
    data.preferItems.forEach(item => {
      keywords.push({ category: 'prefer', value: item, weight: 1.0 })
    })
  }

  return {
    gender: data.gender || 'female',
    age: data.age || null,
    stylePreferences: data.stylePreferences || [],
    bodyType: data.bodyType || null,
    keywords,
    avoidItems: data.avoidItems || [],
    preferItems: data.preferItems || []
  }
}

/**
 * 从衣橱数据构建推荐用 wardrobe 列表
 * @param {Object} userWardrobeItems - app.getUserWardrobeItems()
 * @param {Object} subCategoriesByType - { tops: [{id,name}], bottoms: [...], ... }
 */
function buildWardrobeForRecommend(userWardrobeItems, subCategoriesByType) {
  const list = []
  const items = userWardrobeItems || {}

  const categoryMap = {
    tops: 'top',
    top: 'top',
    inner: 'top',
    bottoms: 'bottom',
    bottom: 'bottom',
    sets: 'outerwear',
    suit: 'outerwear',
    shoes: 'shoes',
    accessories: 'accessory'
  }

  Object.keys(items).forEach(key => {
    const arr = items[key]
    if (!Array.isArray(arr)) return
    const [typeId, subId] = key.split(':')
    const category = categoryMap[typeId] || typeId
    const subs = subCategoriesByType && subCategoriesByType[typeId]
    const subName = (Array.isArray(subs) ? subs.find(s => s.id === subId) : null)?.name || subId
    arr.forEach((item) => {
      const src = typeof item === 'string' ? item : item?.src
      if (!src) return
      list.push({
        category,
        name: subName,
        src,
        description: subName
      })
    })
  })

  return list
}

/**
 * 从 app 聚合推荐所需的全部数据
 * @param {Object} app
 * @param {{ gender?: string }} [opts] 页面传入的性别优先于全局（如 ?gender=male）
 */
function aggregateForRecommend(app, opts) {
  const o = opts || {}
  const gender = (o.gender && String(o.gender).trim())
    ? String(o.gender).trim()
    : (app.getUserGender ? app.getUserGender() : 'female')
  const profile = buildUserProfile({
    gender: gender,
    stylePreferences: app.getStylePreference ? app.getStylePreference() : [],
    avoidItems: (app.getOutfitPreferences ? app.getOutfitPreferences() : {}).avoidItems || [],
    preferItems: (app.getOutfitPreferences ? app.getOutfitPreferences() : {}).preferItems || []
  })

  const ws = require('./wardrobeSubCategories.js')
  const subs = {}
  ;['tops', 'bottoms', 'sets', 'inner', 'shoes', 'accessories'].forEach(cat => {
    try {
      subs[cat] = ws.getSubCategories(cat)
    } catch (e) {
      subs[cat] = []
    }
  })

  const wardrobe = buildWardrobeForRecommend(
    app.getUserWardrobeItems ? app.getUserWardrobeItems() : {},
    subs
  )

  const roleProfile = app.getRoleProfile ? app.getRoleProfile(profile.gender) : {}
  const outfitPrefs = app.getOutfitPreferences ? app.getOutfitPreferences() : {}
  if (outfitPrefs.age) profile.age = outfitPrefs.age
  else if (roleProfile.age) profile.age = roleProfile.age
  if (roleProfile.bodyType) profile.bodyType = roleProfile.bodyType

  return { profile, wardrobe }
}

module.exports = {
  buildUserProfile,
  buildWardrobeForRecommend,
  aggregateForRecommend
}
