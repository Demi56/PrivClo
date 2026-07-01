/**
 * 精灵小管家资料学习库
 * 聚合「信息录入」(modelProfile) 与「穿搭偏好」(privclo_outfit_preferences)
 * 并挂载小程序全量用户资料库
 */

const { buildUserDataLibrary, formatUserDataLibraryForPrompt } = require('./userDataLibrary.js')

function parseAge(outfitPrefs, roleProfile) {
  if (outfitPrefs && outfitPrefs.age != null && Number.isFinite(outfitPrefs.age)) {
    return outfitPrefs.age
  }
  if (roleProfile && roleProfile.age != null) {
    const n = parseInt(roleProfile.age, 10)
    if (Number.isFinite(n)) return n
  }
  return null
}

/** 合并风格标签：穿搭偏好 > 信息录入 selectedStyles > 全局 stylePreference */
function mergeStylePreferences(app, gender) {
  const g = gender === 'male' ? 'male' : 'female'
  const outfitPrefs = app.getOutfitPreferences ? app.getOutfitPreferences() : {}
  const roleProfile = app.getRoleProfile ? app.getRoleProfile(g) : {}
  const fromOutfit = Array.isArray(outfitPrefs.styleTags) ? outfitPrefs.styleTags : []
  const fromProfile = Array.isArray(roleProfile.selectedStyles) ? roleProfile.selectedStyles : []
  let fromStorage = []
  if (fromOutfit.length === 0 && fromProfile.length === 0 && app.getStylePreference) {
    fromStorage = app.getStylePreference(g) || []
  }
  const base = fromOutfit.length
    ? fromOutfit
    : (fromProfile.length ? fromProfile : fromStorage)
  const custom = Array.isArray(outfitPrefs.customStyleTags) ? outfitPrefs.customStyleTags : []
  const seen = new Set()
  const merged = []
  ;[...base, ...custom].forEach(tag => {
    const t = tag && String(tag).trim()
    if (t && !seen.has(t)) {
      seen.add(t)
      merged.push(t)
    }
  })
  return merged.length ? merged : ['日常休闲风']
}

/**
 * 构建精灵小管家完整用户画像（供首页 chat-assistant / 云函数 context 使用）
 * @param {Object} app
 * @param {{ gender?: string }} [opts]
 */
function buildAssistantProfile(app, opts) {
  const o = opts || {}
  const gender = (o.gender && String(o.gender).trim())
    || (app.getUserGender ? app.getUserGender() : 'female')
  const g = gender === 'male' ? 'male' : 'female'
  const roleProfile = app.getRoleProfile ? app.getRoleProfile(g) : {}
  const outfitPrefs = app.getOutfitPreferences ? app.getOutfitPreferences() : {
    avoidItems: [],
    preferItems: [],
    age: null,
    styleTags: [],
    customStyleTags: []
  }
  const stylePreference = mergeStylePreferences(app, g)
  const age = parseAge(outfitPrefs, roleProfile)

  const nickname = (roleProfile.nickname && String(roleProfile.nickname).trim()) || ''
  const height = roleProfile.height != null && roleProfile.height !== ''
    ? String(roleProfile.height)
    : ''
  const weight = roleProfile.weight != null && roleProfile.weight !== ''
    ? String(roleProfile.weight)
    : ''
  const bustWaistHip = roleProfile.bustWaistHip && String(roleProfile.bustWaistHip).trim()
    ? String(roleProfile.bustWaistHip).trim()
    : ''

  const learningLibrary = {
    nickname,
    height,
    weight,
    bustWaistHip,
    age,
    gender: g,
    styleTags: stylePreference,
    customStyleTags: outfitPrefs.customStyleTags || [],
    avoidItems: outfitPrefs.avoidItems || [],
    preferItems: outfitPrefs.preferItems || []
  }

  const userDataLibrary = buildUserDataLibrary(app, { gender: g, weather: o.weather })
  const isGuestMode = !(userDataLibrary.account && userDataLibrary.account.loggedIn)
  const userDataSummary = formatUserDataLibraryForPrompt(userDataLibrary)

  return {
    ...roleProfile,
    gender: g,
    age,
    nickname,
    height,
    weight,
    bustWaistHip,
    selectedStyles: stylePreference,
    stylePreference,
    outfitPreferences: outfitPrefs,
    learningLibrary,
    userDataLibrary,
    userDataSummary,
    isGuestMode
  }
}

module.exports = {
  buildAssistantProfile,
  mergeStylePreferences,
  parseAge
}
