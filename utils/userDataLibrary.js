/**
 * 精灵小管家全量资料学习库
 * 聚合小程序内用户本地数据，供对话查询与模型记忆
 */

const TYPE_LABELS = {
  tops: '上装',
  bottoms: '下装',
  sets: '套装',
  inner: '内搭',
  shoes: '鞋履',
  accessories: '配饰'
}

const DIARY_SKIN_NAMES = {
  1: '蓝海梦境',
  2: '幽绿秘境',
  3: '魔法星图',
  4: '元气万花筒',
  5: '霓虹赛博',
  6: '粉黛独角兽',
  7: '樱之恋曲',
  8: '樱之恋曲'
}

const PRODUCT_NAMES = {
  '1': '日记皮肤-蓝海梦境',
  '2': '日记皮肤-幽绿秘境',
  '3': '日记皮肤-魔法星图',
  '4': '贴纸包-毕业季',
  '5': '贴纸包-新春',
  '6': '衣橱主题-复古墨绿',
  '7': '衣橱主题-棕色原木',
  '8': '衣橱容量+20',
  '11': '衣橱主题-经典奶油',
  '13': '日记皮肤-元气万花筒',
  '14': '日记皮肤-霓虹赛博',
  '15': '日记皮肤-粉黛独角兽',
  '16': '日记皮肤-樱之恋曲'
}

function maskPhone(phone) {
  const p = phone && String(phone).trim()
  if (!/^1\d{10}$/.test(p)) return ''
  return p.slice(0, 3) + '****' + p.slice(7)
}

function truncateText(text, maxLen) {
  const s = text != null ? String(text).replace(/\s+/g, ' ').trim() : ''
  if (!s) return ''
  return s.length <= maxLen ? s : s.slice(0, maxLen) + '…'
}

function loadDiaryPages() {
  try {
    const raw = wx.getStorageSync('diary_pages')
    const stored = raw && typeof raw === 'string' ? JSON.parse(raw) : raw
    return Array.isArray(stored?.pages) ? stored.pages : []
  } catch (e) {
    return []
  }
}

function loadRedeemedProductIds() {
  try {
    const raw = wx.getStorageSync('privclo_points_store_redeemed')
    return Array.isArray(raw) ? raw.map(String) : []
  } catch (e) {
    return []
  }
}

function loadSignStreak() {
  try {
    const raw = wx.getStorageSync('privclo_sign_streak')
    if (!raw || typeof raw !== 'object') return 0
    return typeof raw.count === 'number' && raw.count > 0 ? raw.count : 0
  } catch (e) {
    return 0
  }
}

function summarizeWardrobe(app) {
  const items = app.getUserWardrobeItems ? app.getUserWardrobeItems() : {}
  const ws = require('./wardrobeSubCategories.js')
  const lines = []
  let total = 0
  Object.keys(items || {}).forEach((key) => {
    const arr = items[key]
    if (!Array.isArray(arr) || arr.length === 0) return
    const [typeId, subId] = key.split(':')
    const typeLabel = TYPE_LABELS[typeId] || typeId
    let subName = subId
    try {
      const subs = ws.getSubCategories(typeId)
      const hit = Array.isArray(subs) ? subs.find((s) => s.id === subId) : null
      if (hit && hit.name) subName = hit.name
    } catch (e) {}
    total += arr.length
    lines.push(`${typeLabel}-${subName} ${arr.length}件`)
  })
  return { total, lines }
}

function summarizeFavoriteOutfits(app) {
  const list = app.getFavoriteOutfits ? app.getFavoriteOutfits() : []
  return (list || []).slice(-12).reverse().map((item) => ({
    date: item.date || '',
    title: item.title || '',
    tags: Array.isArray(item.tags) ? item.tags : [],
    season: item.season || '',
    scene: item.scene || '',
    style: item.style || ''
  }))
}

function summarizeDiaryPages(pages) {
  const list = pages || []
  return {
    total: list.length,
    recent: list.slice(-8).reverse().map((page, idx) => ({
      pageNo: list.length - idx,
      content: truncateText(page.content, 120),
      hasPhoto: !!(page.photo && String(page.photo).trim()),
      stickerCount: Array.isArray(page.stickers) ? page.stickers.length : 0
    }))
  }
}

function summarizePoints(app) {
  const total = app.getPoints ? app.getPoints() : 0
  const records = app.getPointsRecords ? app.getPointsRecords() : []
  let todayPoints = 0
  try {
    const taskSquare = require('./taskSquare.js')
    todayPoints = taskSquare.getTodayPoints ? taskSquare.getTodayPoints() : 0
  } catch (e) {}
  return {
    total,
    todayPoints,
    recentRecords: (records || []).slice(0, 8).map((r) => ({
      type: r.type || '',
      activity: r.activity || '',
      points: r.points,
      time: r.time || ''
    }))
  }
}

function summarizePersonalization(app) {
  let wardrobeTheme = '经典奶油'
  let diarySkin = '蓝海梦境'
  let solidBgColor = ''
  try {
    const themeMod = require('./wardrobeTheme.js')
    const theme = themeMod.getThemeById(themeMod.getActiveWardrobeThemeId())
    if (theme && theme.name) wardrobeTheme = theme.name
  } catch (e) {}
  try {
    const skinMod = require('./diarySkin.js')
    const idx = skinMod.getActiveDiarySkinIndex()
    diarySkin = DIARY_SKIN_NAMES[idx] || ('皮肤' + idx)
  } catch (e) {}
  try {
    const c = wx.getStorageSync('privclo_solid_bg_color')
    if (c) solidBgColor = String(c)
  } catch (e) {}
  return { wardrobeTheme, diarySkin, solidBgColor }
}

function summarizeNotificationSettings(app) {
  const s = app.getNotificationSettings ? app.getNotificationSettings() : {}
  const labels = []
  if (s.enabled === false) labels.push('总开关关')
  else labels.push('总开关开')
  if (s.outfitRecommend !== false) labels.push('穿搭推荐通知开')
  if (s.weatherAlert !== false) labels.push('天气提醒开')
  if (s.diaryReminder !== false) labels.push('日记提醒开')
  if (s.pointsActivity !== false) labels.push('积分活动通知开')
  return labels
}

/**
 * @param {Object} app
 * @param {{ gender?: string, weather?: Object }} [opts]
 */
function buildUserDataLibrary(app, opts) {
  const o = opts || {}
  const gender = (o.gender && String(o.gender).trim())
    || (app.getUserGender ? app.getUserGender() : 'female')
  const g = gender === 'male' ? 'male' : 'female'
  const loggedIn = app.isUserLoggedIn ? app.isUserLoggedIn() : false
  const displayName = app.getRoleDisplayName ? app.getRoleDisplayName(g) : ''
  const phone = app.getUserPhone ? app.getUserPhone() : ''
  const wardrobe = summarizeWardrobe(app)
  const diaryPages = loadDiaryPages()
  const redeemedIds = loadRedeemedProductIds()
  let inviteCount = 0
  try {
    const n = wx.getStorageSync('privclo_invite_success_count')
    inviteCount = typeof n === 'number' && n >= 0 ? n : 0
  } catch (e) {}

  let homeWeather = o.weather || null
  if (!homeWeather) {
    try {
      const hw = wx.getStorageSync('privclo_home_weather')
      if (hw && typeof hw === 'object') homeWeather = hw
    } catch (e) {}
  }

  return {
    syncedAt: Date.now(),
    account: {
      loggedIn,
      guestMode: !loggedIn,
      displayName,
      gender: g,
      genderLabel: g === 'male' ? '男' : '女',
      phoneMasked: maskPhone(phone),
      phoneBound: !!phone
    },
    stats: {
      points: app.getPoints ? app.getPoints() : 0,
      styledCount: app.getStyledCount ? app.getStyledCount() : 0,
      diaryCount: app.getDiaryCount ? app.getDiaryCount() : diaryPages.length,
      favoriteOutfitCount: (app.getFavoriteOutfits ? app.getFavoriteOutfits() : []).length,
      wardrobeItemCount: wardrobe.total,
      chatHistoryCount: (app.getChatHistory ? app.getChatHistory() : []).length
    },
    wardrobe,
    favoriteOutfits: summarizeFavoriteOutfits(app),
    diary: summarizeDiaryPages(diaryPages),
    points: summarizePoints(app),
    tasks: {
      todayPoints: summarizePoints(app).todayPoints,
      signStreak: loadSignStreak(),
      inviteSuccessCount: inviteCount
    },
    personalization: summarizePersonalization(app),
    redeemedProducts: redeemedIds.map((id) => PRODUCT_NAMES[id] || ('商品' + id)),
    notificationSettings: summarizeNotificationSettings(app),
    homeWeather: homeWeather ? {
      city: homeWeather.city || '',
      temp: homeWeather.temp,
      weather: homeWeather.weather || ''
    } : null,
    customTypes: app.getCustomTypes ? app.getCustomTypes() : []
  }
}

function formatUserDataLibraryForPrompt(library) {
  if (!library || typeof library !== 'object') return ''
  const acc = library.account || {}
  if (acc.guestMode || acc.loggedIn === false) {
    return [
      '【小程序全量资料库 · 游客模式】',
      '当前用户为游客浏览，未登录/注册，个人资料不与账号绑定，以下私有数据不向小管家开放。',
      '【游客资料查询规则】当用户询问积分、衣橱、日记、收藏穿搭、任务、信息录入、身高体重、穿搭偏好、手机号、账号资料等任何个人信息时：',
      '1. 禁止读取、列举或编造上述具体数据（即使本地可能有临时浏览数据）',
      '2. 温柔说明：「登录/注册后才可以查看和保存你的专属资料哦～」',
      '3. 引导操作：前往「我的」页 → 点击头像或「去登录」→ 完成微信授权登录',
      '4. 登录后可再问同样问题，小管家就能帮你查资料啦 ✨',
      '若用户仅问天气穿搭、通用搭配建议（不涉及个人私有数据），可正常回答。'
    ].join('\n')
  }

  const lines = []
  lines.push('【小程序全量资料库】')
  lines.push('以下为用户在本小程序内的本地资料摘要。用户询问积分、衣橱、日记、收藏穿搭、任务、皮肤主题等任何个人数据时，请直接根据本节内容回答；禁止说「无法查询」「没有权限读取页面数据」。若某项为空或未填写，请如实说明并给出完善入口。')

  lines.push(`【账号】已登录；昵称/角色名：${acc.displayName || '未设置'}；性别：${acc.genderLabel || '未知'}；手机：${acc.phoneBound ? acc.phoneMasked : '未绑定'}`)

  const st = library.stats || {}
  lines.push(`【数据概览】积分 ${st.points || 0}；累计穿搭 ${st.styledCount || 0} 次；日记 ${st.diaryCount || 0} 页；收藏穿搭 ${st.favoriteOutfitCount || 0} 套；衣橱 ${st.wardrobeItemCount || 0} 件`)

  const pts = library.points || {}
  if (pts.recentRecords && pts.recentRecords.length) {
    const rec = pts.recentRecords.slice(0, 5).map((r) => `${r.time || ''} ${r.activity || ''} ${r.points > 0 ? '+' : ''}${r.points}`).join('；')
    lines.push(`【积分明细（最近）】今日已获得 ${pts.todayPoints || 0} 分；最近记录：${rec}`)
  } else {
    lines.push(`【积分】当前 ${pts.total || 0} 分；今日已获得 ${pts.todayPoints || 0} 分`)
  }

  const tasks = library.tasks || {}
  lines.push(`【任务广场】连续签到 ${tasks.signStreak || 0} 天；成功邀请 ${tasks.inviteSuccessCount || 0} 人`)

  const w = library.wardrobe || {}
  if (w.total > 0 && w.lines && w.lines.length) {
    lines.push(`【衣橱明细】共 ${w.total} 件：${w.lines.slice(0, 24).join('、')}${w.lines.length > 24 ? '等' : ''}`)
  } else {
    lines.push('【衣橱明细】暂无录入单品，可引导用户前往「衣橱」添加')
  }

  const favs = library.favoriteOutfits || []
  if (favs.length) {
    const desc = favs.slice(0, 8).map((f) => {
      const tags = (f.tags && f.tags.length) ? f.tags.join('/') : [f.season, f.scene, f.style].filter(Boolean).join('/')
      return `${f.date || '未知日期'} ${tags || '收藏穿搭'}${f.title ? '「' + f.title + '」' : ''}`
    }).join('；')
    lines.push(`【收藏穿搭】${desc}`)
  } else {
    lines.push('【收藏穿搭】暂无收藏')
  }

  const diary = library.diary || {}
  if (diary.total > 0 && diary.recent && diary.recent.length) {
    const pages = diary.recent.slice(0, 5).map((p) => {
      const extra = []
      if (p.hasPhoto) extra.push('含照片')
      if (p.stickerCount) extra.push(p.stickerCount + '个贴纸')
      const tail = extra.length ? `（${extra.join('，')}）` : ''
      return `第${p.pageNo}页${p.content ? '：' + p.content : '（无文字）'}${tail}`
    }).join('；')
    lines.push(`【穿搭日记】共 ${diary.total} 页；最近内容：${pages}`)
  } else {
    lines.push('【穿搭日记】暂无保存内容')
  }

  const pz = library.personalization || {}
  const pzParts = [
    pz.diarySkin ? `日记皮肤：${pz.diarySkin}` : '',
    pz.wardrobeTheme ? `衣橱主题：${pz.wardrobeTheme}` : '',
    pz.solidBgColor ? `纯色背景：${pz.solidBgColor}` : ''
  ].filter(Boolean)
  if (pzParts.length) lines.push(`【个性化设置】${pzParts.join('；')}`)

  const redeemed = library.redeemedProducts || []
  if (redeemed.length) lines.push(`【积分商城已兑换】${redeemed.join('、')}`)

  const notify = library.notificationSettings || []
  if (notify.length) lines.push(`【通知设置】${notify.join('；')}`)

  const hw = library.homeWeather
  if (hw && hw.city) {
    lines.push(`【首页定位天气】${hw.city} ${hw.temp != null ? hw.temp + '℃' : ''} ${hw.weather || ''}`.trim())
  }

  const custom = library.customTypes || []
  if (custom.length) lines.push(`【自定义衣橱分类】${custom.map((t) => t.name || t.id || '').filter(Boolean).join('、')}`)

  return lines.join('\n')
}

module.exports = {
  buildUserDataLibrary,
  formatUserDataLibraryForPrompt
}
