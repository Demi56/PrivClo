/**
 * 用户画像获取 - 汇总本地/云端的用户数据
 * 客户端传入聚合后的 profile + wardrobe，返回结构化画像供推荐使用
 */
const cloud = require('wx-server-sdk')
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV })

exports.main = async (event, context) => {
  const { profileData, wardrobeData, openid } = event

  const profile = profileData || {}
  const wardrobe = Array.isArray(wardrobeData) ? wardrobeData : []

  const structured = {
    gender: profile.gender || 'female',
    age: profile.age || null,
    stylePreferences: Array.isArray(profile.stylePreferences) ? profile.stylePreferences : [],
    bodyType: profile.bodyType || null,
    keywords: Array.isArray(profile.keywords) ? profile.keywords : [],
    avoidItems: Array.isArray(profile.avoidItems) ? profile.avoidItems : [],
    preferItems: Array.isArray(profile.preferItems) ? profile.preferItems : []
  }

  const wardrobeByCategory = {}
  wardrobe.forEach(item => {
    const cat = (item.category || 'other').toLowerCase()
    if (!wardrobeByCategory[cat]) wardrobeByCategory[cat] = []
    wardrobeByCategory[cat].push({
      name: item.name || item.description,
      src: item.src,
      category: cat
    })
  })

  return {
    success: true,
    profile: structured,
    wardrobeByCategory,
    wardrobeCount: wardrobe.length
  }
}
