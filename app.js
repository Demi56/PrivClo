// PrivClo v2.0 - 小程序入口
const USER_WARDROBE_KEY = 'privclo_user_wardrobe_items'
const STYLE_PREFERENCE_KEY = 'privclo_style_preference'
const PRIVATE_SUB_CONFIG_KEY = 'privclo_private_sub_config'
const CUSTOM_TYPES_KEY = 'privclo_custom_types'
const FAVORITE_OUTFITS_KEY = 'privclo_favorite_outfits'
const STYLED_COUNT_KEY = 'privclo_styled_count'
const DIARY_PAGES_KEY = 'diary_pages'
const USER_POINTS_KEY = 'privclo_user_points'
const USER_POINTS_RECORDS_KEY = 'privclo_user_points_records'
const REGISTRATION_REWARD_GIVEN_KEY = 'privclo_registration_reward_given'
const USER_GENDER_KEY = 'privclo_user_gender'
const OUTFIT_PREFERENCES_KEY = 'privclo_outfit_preferences'
const CHAT_FEEDBACK_KEY = 'privclo_chat_feedback'

App({
  onLaunch() {
    if (wx.cloud) {
      wx.cloud.init({ traceUser: true })
    }
    try {
      const raw = wx.getStorageSync(USER_WARDROBE_KEY)
      this.globalData.userWardrobeItems = (raw && typeof raw === 'object') ? raw : {}
    } catch (e) {
      this.globalData.userWardrobeItems = {}
    }
  },
  globalData: {
    tryonItemSlots: null,  // 单品格数据，用于衣橱内页与分类详情页同步
    modelDisplaySrc: null, // 首页模特展示图，用于实时试穿区左侧同步
    modelGender: 'female', // 首页模特角色性别，与 modelDisplaySrc 保持一致
    subCategoryOrder: {},  // 各分类的子分类卡片排序 { tops: ['id1','id2',...], bottoms: [...], ... }
    userWardrobeItems: {},  // 用户录入的单品 { 'tops:sweater': [{ src: '...' }], ... }
    isGuestMode: false,    // 是否通过「游客浏览」进入，我的页显示「演示账号」
    favoritesTryonItemSlots: null,  // 收藏区试穿页单品格，与分类详情页 tryonItemSlots 独立
    tryonInitialOutfit: null, // 进入 pages/tryon/tryon 时的初始槽位数据 { inner, top, bottom, shoes, suit }
    tryonLaunchContext: null // 从分类详情进入试穿全屏时携带的 activeTab / prefitMode / categoryTabs
  },

  // 获取用户录入的单品（持久化）
  getUserWardrobeItems() {
    try {
      const raw = wx.getStorageSync(USER_WARDROBE_KEY)
      return (raw && typeof raw === 'object') ? raw : {}
    } catch (e) {
      return {}
    }
  },

  // 添加用户录入的单品并持久化
  addUserWardrobeItem(typeId, categoryId, src) {
    const key = `${typeId}:${categoryId}`
    if (!this.globalData.userWardrobeItems[key]) this.globalData.userWardrobeItems[key] = []
    this.globalData.userWardrobeItems[key].push({ src })
    try {
      wx.setStorageSync(USER_WARDROBE_KEY, this.globalData.userWardrobeItems)
    } catch (e) {
      console.error('save user wardrobe failed', e)
    }
  },

  // 移除用户录入的单品（用于子分类卡片中的删除）
  removeUserWardrobeItem(typeId, categoryId, src) {
    const key = `${typeId}:${categoryId}`
    const arr = this.globalData.userWardrobeItems[key]
    if (!arr || !Array.isArray(arr)) return false
    const i = arr.findIndex(function (e) { return (e && e.src) === src || e === src })
    if (i < 0) return false
    arr.splice(i, 1)
    if (arr.length === 0) delete this.globalData.userWardrobeItems[key]
    try {
      wx.setStorageSync(USER_WARDROBE_KEY, this.globalData.userWardrobeItems)
    } catch (e) {
      console.error('remove user wardrobe failed', e)
    }
    return true
  },

  isUserWardrobeItem(src) {
    return src && typeof src === 'string' && !src.startsWith('/images/')
  },

  /** 获取用户性别（注册/偏好页选择，用于精灵小助手推荐） */
  getUserGender() {
    try {
      const g = wx.getStorageSync(USER_GENDER_KEY)
      return (g === 'male' || g === 'female') ? g : null
    } catch (e) {
      return null
    }
  },

  /** 保存用户性别（preference 页选择时调用） */
  saveUserGender(gender) {
    if (gender !== 'male' && gender !== 'female') return
    try {
      wx.setStorageSync(USER_GENDER_KEY, gender)
    } catch (e) {
      console.error('save user gender failed', e)
    }
  },

  /** 获取穿搭偏好（不喜欢/喜欢的单品，供精灵小助手记忆） */
  getOutfitPreferences() {
    try {
      const raw = wx.getStorageSync(OUTFIT_PREFERENCES_KEY)
      const o = raw && typeof raw === 'object' ? raw : {}
      return {
        avoidItems: Array.isArray(o.avoidItems) ? o.avoidItems : [],
        preferItems: Array.isArray(o.preferItems) ? o.preferItems : []
      }
    } catch (e) {
      return { avoidItems: [], preferItems: [] }
    }
  },

  /** 保存穿搭偏好 */
  saveOutfitPreferences(prefs) {
    if (!prefs || typeof prefs !== 'object') return
    try {
      const current = this.getOutfitPreferences()
      const merged = {
        avoidItems: Array.isArray(prefs.avoidItems) ? prefs.avoidItems : current.avoidItems,
        preferItems: Array.isArray(prefs.preferItems) ? prefs.preferItems : current.preferItems
      }
      wx.setStorageSync(OUTFIT_PREFERENCES_KEY, merged)
    } catch (e) {
      console.error('save outfit preferences failed', e)
    }
  },

  /** 合并从对话中提取的偏好（云函数返回时调用） */
  mergeOutfitPreferencesFromChat(extracted) {
    if (!extracted || typeof extracted !== 'object') return
    const current = this.getOutfitPreferences()
    const avoid = new Set(current.avoidItems)
    const prefer = new Set(current.preferItems)
    ;(extracted.avoid || []).forEach(x => { if (x && String(x).trim()) avoid.add(String(x).trim()) })
    ;(extracted.prefer || []).forEach(x => { if (x && String(x).trim()) prefer.add(String(x).trim()) })
    this.saveOutfitPreferences({
      avoidItems: Array.from(avoid),
      preferItems: Array.from(prefer)
    })
  },

  /** 保存聊天反馈（点赞/点踩） */
  saveChatFeedback(msgId, userMsg, reply, feedback) {
    try {
      const raw = wx.getStorageSync(CHAT_FEEDBACK_KEY)
      const list = Array.isArray(raw) ? raw : []
      list.unshift({ msgId, userMsg, reply, feedback, ts: Date.now() })
      wx.setStorageSync(CHAT_FEEDBACK_KEY, list.slice(0, 100))
    } catch (e) {
      console.error('save chat feedback failed', e)
    }
  },

  /** 获取用户穿搭风格偏好（注册时选择，用于 AI 个性化推荐） */
  getStylePreference(gender) {
    const profile = this.getRoleProfile(gender)
    const fromProfile = profile?.selectedStyles
    if (fromProfile && Array.isArray(fromProfile) && fromProfile.length > 0) {
      return fromProfile
    }
    try {
      const raw = wx.getStorageSync(STYLE_PREFERENCE_KEY)
      return (raw && Array.isArray(raw)) ? raw : []
    } catch (e) {
      return []
    }
  },

  /** 保存用户穿搭风格偏好（注册/设置时调用） */
  saveStylePreference(styles) {
    try {
      wx.setStorageSync(STYLE_PREFERENCE_KEY, Array.isArray(styles) ? styles : [])
    } catch (e) {
      console.error('save style preference failed', e)
    }
  },

  // 角色档案：按性别读取，供各页同步显示昵称等
  getRoleProfile(gender) {
    const g = gender === 'male' ? 'male' : 'female'
    try {
      const raw = wx.getStorageSync('modelProfile_' + g)
      return (raw && typeof raw === 'object') ? raw : {}
    } catch (e) {
      return {}
    }
  },

  getRoleDisplayName(gender) {
    const profile = this.getRoleProfile(gender)
    const name = (profile.nickname && String(profile.nickname).trim()) || ''
    if (name) return name
    return gender === 'male' ? '阳阳' : '依依'
  },

  getPrivateSubConfig() {
    try {
      const raw = wx.getStorageSync(PRIVATE_SUB_CONFIG_KEY)
      return (raw && typeof raw === 'object') ? raw : {}
    } catch (e) {
      return {}
    }
  },

  savePrivateSubConfig(config) {
    try {
      wx.setStorageSync(PRIVATE_SUB_CONFIG_KEY, config)
    } catch (e) {
      console.error('save private sub config failed', e)
    }
  },

  getCustomTypes() {
    try {
      const raw = wx.getStorageSync(CUSTOM_TYPES_KEY)
      return Array.isArray(raw) ? raw : []
    } catch (e) {
      return []
    }
  },

  saveCustomTypes(types) {
    try {
      wx.setStorageSync(CUSTOM_TYPES_KEY, Array.isArray(types) ? types : [])
    } catch (e) {
      console.error('save custom types failed', e)
    }
  },

  /** 获取用户收藏的搭配卡片（持久化） */
  getFavoriteOutfits() {
    try {
      const raw = wx.getStorageSync(FAVORITE_OUTFITS_KEY)
      return Array.isArray(raw) ? raw : []
    } catch (e) {
      return []
    }
  },

  /** 保存用户收藏的搭配卡片 */
  saveFavoriteOutfits(outfits) {
    try {
      wx.setStorageSync(FAVORITE_OUTFITS_KEY, Array.isArray(outfits) ? outfits : [])
    } catch (e) {
      console.error('save favorite outfits failed', e)
    }
  },

  /** 获取用户点击实时试穿的次数（已搭） */
  getStyledCount() {
    try {
      const n = wx.getStorageSync(STYLED_COUNT_KEY)
      return typeof n === 'number' && n >= 0 ? n : 0
    } catch (e) {
      return 0
    }
  },

  /** 用户点击实时试穿时递增已搭次数 */
  incrementStyledCount() {
    const n = this.getStyledCount() + 1
    try {
      wx.setStorageSync(STYLED_COUNT_KEY, n)
    } catch (e) {
      console.error('save styled count failed', e)
    }
  },

  /** 获取用户积分（仅登录用户有效，游客为 0） */
  getPoints() {
    if (this.globalData.isGuestMode) return 0
    try {
      const n = wx.getStorageSync(USER_POINTS_KEY)
      return typeof n === 'number' && n >= 0 ? n : 0
    } catch (e) {
      return 0
    }
  },

  /** 获取用户积分明细记录 */
  getPointsRecords() {
    if (this.globalData.isGuestMode) return []
    try {
      const raw = wx.getStorageSync(USER_POINTS_RECORDS_KEY)
      return Array.isArray(raw) ? raw : []
    } catch (e) {
      return []
    }
  },

  /** 添加积分并记录明细 */
  addPointsRecord(type, activity, points) {
    if (this.globalData.isGuestMode) return
    const now = new Date()
    const timeStr = now.getFullYear() + '-' + String(now.getMonth() + 1).padStart(2, '0') + '-' + String(now.getDate()).padStart(2, '0') + ' ' + String(now.getHours()).padStart(2, '0') + ':' + String(now.getMinutes()).padStart(2, '0')
    const records = this.getPointsRecords()
    const id = records.length > 0 ? Math.max(...records.map(r => r.id || 0)) + 1 : 1
    records.unshift({ id, type, activity, points, time: timeStr })
    const total = this.getPoints() + points
    try {
      wx.setStorageSync(USER_POINTS_KEY, total)
      wx.setStorageSync(USER_POINTS_RECORDS_KEY, records)
    } catch (e) {
      console.error('save points failed', e)
    }
  },

  /** 用户注册/登录时发放注册奖励 1000 积分（仅首次） */
  grantRegistrationReward() {
    try {
      if (wx.getStorageSync(REGISTRATION_REWARD_GIVEN_KEY)) return
      this.addPointsRecord('income', '用户注册奖励', 1000)
      wx.setStorageSync(REGISTRATION_REWARD_GIVEN_KEY, true)
    } catch (e) {
      console.error('grant registration reward failed', e)
    }
  },

  /** 获取用户保存的日记篇数（从 diary_pages 读取） */
  getDiaryCount() {
    try {
      const raw = wx.getStorageSync(DIARY_PAGES_KEY)
      const stored = raw && typeof raw === 'string' ? JSON.parse(raw) : raw
      const pages = stored?.pages
      return Array.isArray(pages) ? pages.length : 0
    } catch (e) {
      return 0
    }
  },

  /** 游客浏览（未登录）时保存前需登录：若为游客则弹窗引导，返回 false；否则返回 true 可继续保存 */
  requireGuestLoginForSave() {
    if (!this.globalData.isGuestMode) return true
    wx.showModal({
      title: '登录提示',
      content: '保存内容需要先登录/注册，是否前往登录？',
      confirmText: '去登录',
      cancelText: '取消',
      success: (res) => {
        if (res.confirm) {
          wx.navigateTo({ url: '/pages/login/login?fromSave=1' })
        }
      }
    })
    return false
  }
});
