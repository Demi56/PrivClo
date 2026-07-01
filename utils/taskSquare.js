const DAILY_MAX = 100
const PROGRESS_KEY = 'privclo_task_progress'
const TODAY_POINTS_KEY = 'privclo_today_points'
const DAILY_ACTIONS_KEY = 'privclo_task_daily_actions'
const SIGN_STREAK_KEY = 'privclo_sign_streak'
const INVITE_COUNT_KEY = 'privclo_invite_success_count'

const DAILY_TASKS = [
  { id: 'sign', name: '每日签到', desc: '点击签到按钮领取积分', reward: 10, limit: 1, unit: '次', remark: '连续签到7天额外+50' },
  { id: 'weather', name: '天气穿搭推荐', desc: '使用AI推荐并保存一套穿搭', reward: 20, limit: 1, unit: '次', remark: '每日1次' },
  { id: 'diary', name: '保存穿搭日记', desc: '保存图文穿搭记录', reward: 30, limit: 1, unit: '次', remark: '每日1次' },
  { id: 'clothes', name: '添加衣物', desc: '向衣橱添加衣物', reward: 10, limit: 5, unit: '件', remark: '每日最多50积分' },
  { id: 'share', name: '分享小程序', desc: '分享到微信群或好友', reward: 30, limit: 1, unit: '次', remark: '仅首次有效' }
]

const NOVICE_TASKS = [
  { id: 'profile', name: '完善资料', desc: '填写性别、年龄、风格偏好', reward: 100 },
  { id: 'first-clothes', name: '首次添加衣物', desc: '向衣橱添加第1件衣服', reward: 50 },
  { id: 'first-ai', name: '首次使用AI推荐', desc: '完成首次天气穿搭推荐并保存', reward: 80 },
  { id: 'first-diary', name: '首次保存日记', desc: '保存第1篇穿搭日记', reward: 100 },
  { id: 'bind-phone', name: '绑定手机号', desc: '完成手机号码绑定', reward: 50 }
]

const ACHIEVE_TASKS = [
  { id: 'wardrobe-20', name: '衣橱达人', desc: '衣橱衣物数量达到20件', reward: 200 },
  { id: 'diary-10', name: '日记达人', desc: '累计保存10篇穿搭日记', reward: 300 },
  { id: 'sign-7', name: '连续签到7天', desc: '连续签到满7天', reward: 50, extra: '额外' },
  { id: 'sign-30', name: '连续签到30天', desc: '连续签到满30天', reward: 200, extra: '限定徽章' },
  { id: 'invite-1', name: '邀请第1位好友', desc: '成功邀请1位好友注册', reward: 1000 },
  { id: 'invite-3', name: '邀请3位好友', desc: '累计邀请3位好友', reward: 500, extra: '限定头像框' }
]

const LIMITED_TASKS = [
  { id: 'festival', name: '节日限定', desc: '节日期间保存指定主题日记', reward: '200~500', validity: '7天左右' },
  { id: 'brand', name: '品牌合作', desc: '参与合作品牌话题', reward: '100~300', validity: '不定期' },
  { id: 'survey', name: '问卷调研', desc: '填写用户调研问卷', reward: '100', validity: '不定期' },
  { id: 'version', name: '版本更新', desc: '体验新功能并反馈', reward: '100~200', validity: '保存后7天' }
]

const GO_URLS = {
  weather: '/pages/model/model',
  diary: '/pages/diary/diary',
  clothes: '/pages/wardrobe/wardrobe',
  profile: '/packageSettings/pages/outfit-preferences/outfit-preferences',
  'first-clothes': '/pages/wardrobe/wardrobe',
  'first-ai': '/pages/model/model',
  'first-diary': '/pages/diary/diary',
  'bind-phone': '/packageSettings/pages/account-security/account-security',
  'wardrobe-20': '/pages/wardrobe/wardrobe',
  'diary-10': '/pages/diary/diary',
  'invite-1': '/packagePoints/pages/invite/invite',
  'invite-3': '/packagePoints/pages/invite/invite'
}

function getTodayKey() {
  return new Date().toDateString()
}

function getYesterdayKey() {
  const d = new Date()
  d.setDate(d.getDate() - 1)
  return d.toDateString()
}

function loadProgress() {
  try {
    const raw = wx.getStorageSync(PROGRESS_KEY)
    if (!raw || typeof raw !== 'object') {
      return { dailyDate: '', daily: {}, novice: {}, achieve: {} }
    }
    return {
      dailyDate: raw.dailyDate || '',
      daily: raw.daily && typeof raw.daily === 'object' ? raw.daily : {},
      novice: raw.novice && typeof raw.novice === 'object' ? raw.novice : {},
      achieve: raw.achieve && typeof raw.achieve === 'object' ? raw.achieve : {}
    }
  } catch (e) {
    return { dailyDate: '', daily: {}, novice: {}, achieve: {} }
  }
}

function saveProgress(progress) {
  try {
    wx.setStorageSync(PROGRESS_KEY, progress)
  } catch (e) {
    console.error('save task progress failed', e)
  }
}

function getDailyClaims() {
  const progress = loadProgress()
  const today = getTodayKey()
  if (progress.dailyDate !== today) return {}
  return progress.daily || {}
}

function setDailyClaim(taskId, count) {
  const progress = loadProgress()
  const today = getTodayKey()
  if (progress.dailyDate !== today) {
    progress.dailyDate = today
    progress.daily = {}
  }
  progress.daily[taskId] = count
  saveProgress(progress)
}

function isNoviceClaimed(taskId) {
  const progress = loadProgress()
  return !!(progress.novice && progress.novice[taskId])
}

function setNoviceClaimed(taskId) {
  const progress = loadProgress()
  if (!progress.novice) progress.novice = {}
  progress.novice[taskId] = true
  saveProgress(progress)
}

function isAchieveClaimed(taskId) {
  const progress = loadProgress()
  return !!(progress.achieve && progress.achieve[taskId])
}

function setAchieveClaimed(taskId) {
  const progress = loadProgress()
  if (!progress.achieve) progress.achieve = {}
  progress.achieve[taskId] = true
  saveProgress(progress)
}

function loadDailyActions() {
  try {
    const raw = wx.getStorageSync(DAILY_ACTIONS_KEY)
    if (!raw || typeof raw !== 'object' || raw.date !== getTodayKey()) {
      return { date: getTodayKey(), counts: {} }
    }
    return {
      date: raw.date,
      counts: raw.counts && typeof raw.counts === 'object' ? raw.counts : {}
    }
  } catch (e) {
    return { date: getTodayKey(), counts: {} }
  }
}

function saveDailyActions(data) {
  try {
    wx.setStorageSync(DAILY_ACTIONS_KEY, data)
  } catch (e) {
    console.error('save daily actions failed', e)
  }
}

function recordDailyAction(actionId) {
  const id = String(actionId || '')
  if (!id) return
  const data = loadDailyActions()
  const counts = data.counts || {}
  counts[id] = (typeof counts[id] === 'number' ? counts[id] : 0) + 1
  data.counts = counts
  saveDailyActions(data)
}

function getDailyActionCount(actionId) {
  const data = loadDailyActions()
  const n = data.counts[actionId]
  return typeof n === 'number' && n > 0 ? n : 0
}

function loadSignStreak() {
  try {
    const raw = wx.getStorageSync(SIGN_STREAK_KEY)
    if (!raw || typeof raw !== 'object') return { lastDate: '', count: 0 }
    return {
      lastDate: raw.lastDate || '',
      count: typeof raw.count === 'number' && raw.count > 0 ? raw.count : 0
    }
  } catch (e) {
    return { lastDate: '', count: 0 }
  }
}

function saveSignStreak(streak) {
  try {
    wx.setStorageSync(SIGN_STREAK_KEY, streak)
  } catch (e) {
    console.error('save sign streak failed', e)
  }
}

function getTodayPoints() {
  try {
    const raw = wx.getStorageSync(TODAY_POINTS_KEY)
    if (!raw || typeof raw !== 'object') return 0
    if (raw.date !== getTodayKey()) return 0
    return typeof raw.points === 'number' ? raw.points : 0
  } catch (e) {
    return 0
  }
}

function addTodayPoints(points) {
  const today = getTodayKey()
  let raw = {}
  try {
    raw = wx.getStorageSync(TODAY_POINTS_KEY)
  } catch (e) {}
  if (!raw || typeof raw !== 'object' || raw.date !== today) {
    raw = { date: today, points: 0 }
  }
  const next = Math.min(DAILY_MAX, (raw.points || 0) + points)
  raw.points = next
  try {
    wx.setStorageSync(TODAY_POINTS_KEY, raw)
  } catch (e) {
    console.error('save today points failed', e)
  }
  return next
}

function countWardrobeItems(app) {
  const items = app.getUserWardrobeItems ? app.getUserWardrobeItems() : {}
  let count = 0
  if (items && typeof items === 'object') {
    Object.keys(items).forEach((key) => {
      const arr = items[key]
      if (Array.isArray(arr)) count += arr.length
    })
  }
  return count
}

function getInviteSuccessCount() {
  try {
    const n = wx.getStorageSync(INVITE_COUNT_KEY)
    return typeof n === 'number' && n >= 0 ? n : 0
  } catch (e) {
    return 0
  }
}

function isProfileComplete(app) {
  const gender = app.getUserGender && app.getUserGender()
  const prefs = app.getOutfitPreferences ? app.getOutfitPreferences() : {}
  const styles = app.getStylePreference ? app.getStylePreference(gender || 'female') : []
  const hasAge = prefs.age != null && prefs.age !== ''
  const hasStyle = (Array.isArray(prefs.styleTags) && prefs.styleTags.length > 0)
    || (Array.isArray(styles) && styles.length > 0)
  return !!gender && hasAge && hasStyle
}

function hasFirstAiDone(app) {
  if ((app.getStyledCount && app.getStyledCount()) > 0) return true
  const favorites = app.getFavoriteOutfits ? app.getFavoriteOutfits() : []
  return Array.isArray(favorites) && favorites.length > 0
}

function checkNoviceComplete(taskId, app) {
  switch (taskId) {
    case 'profile':
      return isProfileComplete(app)
    case 'first-clothes':
      return countWardrobeItems(app) >= 1
    case 'first-ai':
      return hasFirstAiDone(app)
    case 'first-diary':
      return (app.getDiaryCount && app.getDiaryCount()) >= 1
    case 'bind-phone':
      return !!(app.getUserPhone && app.getUserPhone())
    default:
      return false
  }
}

function checkAchieveComplete(taskId, app) {
  switch (taskId) {
    case 'wardrobe-20':
      return countWardrobeItems(app) >= 20
    case 'diary-10':
      return (app.getDiaryCount && app.getDiaryCount()) >= 10
    case 'sign-7':
      return loadSignStreak().count >= 7
    case 'sign-30':
      return loadSignStreak().count >= 30
    case 'invite-1':
      return getInviteSuccessCount() >= 1
    case 'invite-3':
      return getInviteSuccessCount() >= 3
    default:
      return false
  }
}

function awardPoints(app, activity, points) {
  const remaining = DAILY_MAX - getTodayPoints()
  if (points > 0 && remaining <= 0) {
    return { ok: false, points: 0, message: '今日任务积分已达上限' }
  }
  const award = points > 0 ? Math.min(points, remaining) : points
  if (award <= 0) {
    return { ok: false, points: 0, message: '今日任务积分已达上限' }
  }
  if (app.addPointsRecord) {
    app.addPointsRecord('income', activity, award)
  }
  addTodayPoints(award)
  return { ok: true, points: award, message: '' }
}

function performSignIn() {
  const today = getTodayKey()
  const claims = getDailyClaims()
  if ((claims.sign || 0) >= 1) {
    return { ok: false, message: '今日已签到' }
  }
  const streak = loadSignStreak()
  let count = 1
  if (streak.lastDate === getYesterdayKey()) {
    count = (streak.count || 0) + 1
  } else if (streak.lastDate === today) {
    return { ok: false, message: '今日已签到' }
  }
  saveSignStreak({ lastDate: today, count })
  setDailyClaim('sign', 1)
  return { ok: true, streak: count }
}

function resolveDailyTaskUi(task, app) {
  const claims = getDailyClaims()
  const claimed = typeof claims[task.id] === 'number' ? claims[task.id] : 0
  const limit = task.limit || 1
  const done = task.id === 'sign'
    ? (claimed >= 1 ? 1 : 0)
    : Math.min(getDailyActionCount(task.id), limit)
  const claimable = task.id === 'sign'
    ? (claimed >= 1 ? 0 : 1)
    : Math.max(0, Math.min(done, limit) - claimed)

  let btnLabel = '领取'
  let btnDisabled = false
  let btnAction = 'claim'
  let progressText = task.remark || ''

  if (task.id === 'sign') {
    if (claimed >= 1) {
      btnLabel = '已签到'
      btnDisabled = true
      btnAction = 'none'
    } else {
      btnLabel = '签到'
      btnAction = 'claim'
    }
    const streak = loadSignStreak()
    if (streak.count > 0) {
      progressText = '已连续签到' + streak.count + '天'
    }
  } else if (claimed >= limit) {
    btnLabel = '已领完'
    btnDisabled = true
    btnAction = 'none'
    progressText = '今日 ' + limit + '/' + limit + task.unit
  } else if (claimable > 0) {
    btnLabel = '领取'
    btnAction = 'claim'
    progressText = '可领取 ' + claimable + ' 次（已完成 ' + done + '/' + limit + task.unit + '）'
  } else if (done < limit) {
    btnLabel = '去完成'
    btnAction = 'go'
    progressText = '进度 ' + done + '/' + limit + task.unit
  } else {
    btnLabel = '已领完'
    btnDisabled = true
    btnAction = 'none'
  }

  return {
    ...task,
    done,
    claimed,
    claimable,
    btnLabel,
    btnDisabled,
    btnAction,
    progressText,
    goUrl: GO_URLS[task.id] || ''
  }
}

function resolveNoviceTaskUi(task, app) {
  const claimed = isNoviceClaimed(task.id)
  const complete = checkNoviceComplete(task.id, app)
  let btnLabel = '领取'
  let btnDisabled = false
  let btnAction = 'claim'

  if (claimed) {
    btnLabel = '已领取'
    btnDisabled = true
    btnAction = 'none'
  } else if (!complete) {
    btnLabel = '去完成'
    btnAction = 'go'
  }

  return {
    ...task,
    btnLabel,
    btnDisabled,
    btnAction,
    progressText: complete ? '任务已完成' : task.desc,
    goUrl: GO_URLS[task.id] || ''
  }
}

function resolveAchieveTaskUi(task, app) {
  const claimed = isAchieveClaimed(task.id)
  const complete = checkAchieveComplete(task.id, app)
  let btnLabel = '领取'
  let btnDisabled = false
  let btnAction = 'claim'
  let progressText = task.extra || ''

  if (claimed) {
    btnLabel = '已领取'
    btnDisabled = true
    btnAction = 'none'
  } else if (!complete) {
    btnLabel = '去完成'
    btnAction = 'go'
    if (task.id === 'wardrobe-20') {
      progressText = '当前 ' + countWardrobeItems(app) + '/20 件'
    } else if (task.id === 'diary-10') {
      progressText = '当前 ' + (app.getDiaryCount ? app.getDiaryCount() : 0) + '/10 篇'
    } else if (task.id === 'sign-7' || task.id === 'sign-30') {
      progressText = '当前连续签到 ' + loadSignStreak().count + ' 天'
    } else if (task.id === 'invite-1' || task.id === 'invite-3') {
      const need = task.id === 'invite-1' ? 1 : 3
      progressText = '已邀请 ' + getInviteSuccessCount() + '/' + need + ' 人'
    }
  }

  return {
    ...task,
    btnLabel,
    btnDisabled,
    btnAction,
    progressText,
    goUrl: GO_URLS[task.id] || ''
  }
}

function resolveLimitedTaskUi(task) {
  return {
    ...task,
    btnLabel: '暂未开放',
    btnDisabled: true,
    btnAction: 'none',
    progressText: '有效期：' + (task.validity || '')
  }
}

function buildPageTaskData(app) {
  const todayPoints = getTodayPoints()
  const dailyTasks = DAILY_TASKS.map((task) => resolveDailyTaskUi(task, app))
  const noviceTasks = NOVICE_TASKS.map((task) => resolveNoviceTaskUi(task, app))
  const achieveTasks = ACHIEVE_TASKS.map((task) => resolveAchieveTaskUi(task, app))
  const limitedTasks = LIMITED_TASKS.map((task) => resolveLimitedTaskUi(task))
  const dailyAllDone = todayPoints >= DAILY_MAX
  const totalPoints = app.globalData.isGuestMode ? 0 : ((app.getPoints && app.getPoints()) || 0)

  return {
    totalPoints,
    todayPoints,
    dailyMax: DAILY_MAX,
    dailyAllDone,
    dailyTasks,
    noviceTasks,
    achieveTasks,
    limitedTasks
  }
}

function claimTask(taskId, type, app) {
  const id = String(taskId || '')
  if (!id || !type) return { success: false, message: '任务无效' }
  if (type === 'limited') return { success: false, message: '暂未开放' }
  if (app.globalData.isGuestMode) return { success: false, message: '请先登录/注册' }

  if (type === 'daily') {
    const task = DAILY_TASKS.find((item) => item.id === id)
    if (!task) return { success: false, message: '任务不存在' }

    if (id === 'sign') {
      const signResult = performSignIn()
      if (!signResult.ok) return { success: false, message: signResult.message }
      const award = awardPoints(app, '每日签到', task.reward)
      if (!award.ok) return { success: false, message: award.message }
      return { success: true, points: award.points, message: '签到成功' }
    }

    const ui = resolveDailyTaskUi(task, app)
    if (ui.claimable <= 0) {
      return { success: false, message: ui.btnLabel === '去完成' ? '请先完成任务' : '今日已领完' }
    }

    const award = awardPoints(app, '每日任务-' + task.name, task.reward)
    if (!award.ok) return { success: false, message: award.message }

    const claims = getDailyClaims()
    const claimed = typeof claims[id] === 'number' ? claims[id] : 0
    setDailyClaim(id, claimed + 1)
    return { success: true, points: award.points, message: '领取成功' }
  }

  if (type === 'novice') {
    const task = NOVICE_TASKS.find((item) => item.id === id)
    if (!task) return { success: false, message: '任务不存在' }
    if (isNoviceClaimed(id)) return { success: false, message: '已领取' }
    if (!checkNoviceComplete(id, app)) return { success: false, message: '请先完成任务' }

    if (app.addPointsRecord) {
      app.addPointsRecord('income', '新手任务-' + task.name, task.reward)
    }
    setNoviceClaimed(id)
    return { success: true, points: task.reward, message: '领取成功' }
  }

  if (type === 'achieve') {
    const task = ACHIEVE_TASKS.find((item) => item.id === id)
    if (!task) return { success: false, message: '任务不存在' }
    if (isAchieveClaimed(id)) return { success: false, message: '已领取' }
    if (!checkAchieveComplete(id, app)) return { success: false, message: '请先完成任务' }

    if (app.addPointsRecord) {
      app.addPointsRecord('income', '成就任务-' + task.name, task.reward)
    }
    setAchieveClaimed(id)
    return { success: true, points: task.reward, message: '领取成功' }
  }

  return { success: false, message: '任务类型无效' }
}

function getGoTaskUrl(taskId, type) {
  return GO_URLS[String(taskId)] || ''
}

module.exports = {
  DAILY_MAX,
  DAILY_TASKS,
  NOVICE_TASKS,
  ACHIEVE_TASKS,
  LIMITED_TASKS,
  buildPageTaskData,
  claimTask,
  recordDailyAction,
  getGoTaskUrl,
  getTodayPoints,
  getDailyActionCount
}
