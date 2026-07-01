/**
 * 精灵小管家系统提示词 - 支持性别差异化 + 风格偏好个性化推荐
 * genderLabel: '女士'/'男士'/'女童'/'男童'/'老年女性'/'老年男性'
 * stylePreferences: ['日常休闲风','法式风','商务职场风',...]
 */

const STYLE_PROMPTS = {
  日常休闲风: {
    items: '推荐舒适、百搭的单品（T恤、牛仔裤、运动鞋）',
    tone: '话术轻松随意，如"今天穿得舒服最重要～"'
  },
  法式风: {
    items: '推荐优雅、慵懒的单品（条纹衫、高腰裤、丝巾）',
    tone: '话术浪漫有格调，用🥖✨表情，带点法式腔调'
  },
  商务职场风: {
    items: '推荐正式、得体的单品（衬衫、西裤、皮鞋、西装）',
    tone: '话术专业干练，注重场合得体性'
  },
  运动风: {
    items: '推荐功能性单品（运动服、跑鞋、卫衣）',
    tone: '话术活力满满，用⚡💪表情，强调舒适和活动便利'
  },
  极简风: {
    items: '推荐基础色、简洁剪裁的单品（黑白灰、纯色）',
    tone: '话术简约高级，少用表情，注重质感'
  },
  复古风: {
    items: '推荐有年代感的单品（喇叭裤、格纹、老爹鞋）',
    tone: '话术怀旧有腔调，用📻🎞️表情'
  },
  街头潮酷: {
    items: '推荐oversize、个性单品（卫衣、板鞋、棒球帽）',
    tone: '话术酷飒有态度，用🔥😎表情'
  },
  新中式: {
    items: '推荐改良汉服、盘扣、刺绣等元素',
    tone: '话术雅致有韵味，用🎋🍃表情'
  },
  汉服: {
    items: '推荐齐胸襦裙、交领襦裙、马面裙等汉服单品',
    tone: '懂圈层术语，用👘🎀表情'
  },
  JK: {
    items: '推荐水手服、西式制服、格裙等JK制服单品',
    tone: '懂圈层术语，用👘🎀表情'
  },
  洛丽塔: {
    items: '推荐cla系、甜系、哥特系等洛丽塔单品',
    tone: '懂圈层术语，用👘🎀表情'
  },
  Vintage: {
    items: '推荐古着、 vintage 风格单品',
    tone: '话术怀旧有腔调'
  },
  山系户外: {
    items: '推荐户外机能、山系风格单品',
    tone: '话术活力实用，用⛰️🌲表情'
  }
}

const GENDER_PROMPTS = {
  女士: {
    focus: '关注款式多样性、颜色搭配、流行元素',
    items: '可推荐裙装、休闲鞋、高跟鞋、连衣裙、半身裙等女性化单品',
    tone: '话术温柔细腻，多用可爱表情 ✨🌸💕'
  },
  女童: {
    focus: '关注款式多样性、颜色搭配、流行元素，兼顾舒适与活泼',
    items: '可推荐童装裙、休闲鞋、运动鞋等适合儿童的女性化单品',
    tone: '话术温柔细腻，多用可爱表情 ✨🌸'
  },
  男士: {
    focus: '关注简约大方、实用百搭、质感',
    items: '推荐衬衫、Polo衫、休闲裤、运动鞋、西装等',
    tone: '话术简洁干练，适当用 💪 等表情'
  },
  男童: {
    focus: '关注简约大方、实用百搭、舒适耐穿',
    items: '推荐童装衬衫、T恤、休闲裤、运动鞋等',
    tone: '话术简洁干练，适当用 💪'
  },
  老年女性: {
    focus: '关注舒适度、保暖性、穿脱方便',
    items: '推荐宽松版型、柔软面料、平底鞋等',
    tone: '话术温暖关怀，体现贴心'
  },
  老年男性: {
    focus: '关注舒适度、保暖性、穿脱方便',
    items: '推荐宽松版型、柔软面料、舒适鞋款等',
    tone: '话术温暖关怀，体现贴心'
  }
}

const DEFAULT_PROMPT = {
  focus: '关注实用与美观的平衡',
  items: '根据用户衣橱推荐合适单品',
  tone: '话术温暖，适当使用表情'
}

function getGenderLabel(gender, roleType) {
  if (roleType) {
    const map = { 'male-child': '男童', 'female-child': '女童', 'elder-male': '老年男性', 'elder-female': '老年女性' }
    return map[roleType] || null
  }
  return gender === 'male' ? '男士' : gender === 'female' ? '女士' : null
}

function buildStylePromptSection(styles) {
  if (!styles || !Array.isArray(styles) || styles.length === 0) return ''
  const mainStyle = styles[0]
  const mainCfg = STYLE_PROMPTS[mainStyle]
  let section = `\n【用户风格偏好】${styles.join('、')}\n`
  if (mainCfg) {
    section += `【主风格推荐】${mainCfg.items}\n【主风格话术】${mainCfg.tone}\n`
  }
  if (styles.length > 1) {
    section += `\n【多风格融合】用户选择了${styles.length}种风格，请在推荐时尽量兼顾：\n`
    styles.forEach(s => {
      const c = STYLE_PROMPTS[s]
      if (c) section += `- ${s}：${c.items}\n`
      else section += `- ${s}的特点\n`
    })
    section += '可优先找同时符合多种风格的穿搭，或分场合推荐（如"日常穿可以...，想要特别一点可以..."）\n'
  }
  return section
}

/** 根据天气类型生成提醒规则 */
function buildWeatherReminderSection() {
  return `【天气提醒】根据用户所问日期的天气，适当补充：晴天/光照强（紫外线≥5）→ 提醒防晒（防晒霜、遮阳帽、防晒衣）；雨天/雷阵雨 → 提醒携带雨具（雨伞、雨衣）；雾霾/雾 → 提醒戴好口罩；雪天 → 提醒保暖防滑。`
}

function buildOutfitPreferencesSection(outfitPreferences, isGuestMode) {
  if (isGuestMode) return ''
  if (!outfitPreferences || typeof outfitPreferences !== 'object') return ''
  const avoid = outfitPreferences.avoidItems || outfitPreferences.avoid
  const prefer = outfitPreferences.preferItems || outfitPreferences.prefer
  const avoidArr = Array.isArray(avoid) ? avoid : []
  const preferArr = Array.isArray(prefer) ? prefer : []
  const styleTags = Array.isArray(outfitPreferences.styleTags) ? outfitPreferences.styleTags : []
  const customTags = Array.isArray(outfitPreferences.customStyleTags) ? outfitPreferences.customStyleTags : []
  if (avoidArr.length === 0 && preferArr.length === 0 && styleTags.length === 0 && customTags.length === 0) return ''
  let s = '\n【用户穿搭偏好记忆】（来自「穿搭偏好」页面，请长期遵守）'
  if (avoidArr.length > 0) s += `用户明确不喜欢的单品：${avoidArr.join('、')}。请勿推荐以上单品。`
  if (preferArr.length > 0) s += `用户喜欢的单品/元素：${preferArr.join('、')}。推荐时优先考虑。`
  const extraStyles = customTags.filter(t => t && styleTags.indexOf(t) < 0)
  if (extraStyles.length > 0) {
    s += `用户自定义风格标签：${extraStyles.join('、')}。`
  }
  return s + '\n'
}

function pickBodyProfile(profile, learningLibrary) {
  const src = learningLibrary && typeof learningLibrary === 'object' ? learningLibrary : profile
  if (!src || typeof src !== 'object') return null
  return {
    nickname: src.nickname && String(src.nickname).trim(),
    height: src.height != null && src.height !== '' ? String(src.height) : '',
    weight: src.weight != null && src.weight !== '' ? String(src.weight) : '',
    bustWaistHip: src.bustWaistHip && String(src.bustWaistHip).trim()
      ? String(src.bustWaistHip).trim()
      : ''
  }
}

/** 信息录入：昵称、身高体重三围 */
function buildUserBodySection(profile, learningLibrary, isGuestMode) {
  if (isGuestMode) {
    return '\n【用户体态资料 · 游客模式】当前为游客浏览，信息录入/身材等个人资料需登录后查看与保存。用户询问身高、体重、三围、昵称等个人信息时，请勿透露具体数值，温柔引导：「登录/注册后我才能帮你查看专属资料哦～请前往「我的」页点击头像完成微信授权 ✨」\n'
  }
  const body = pickBodyProfile(profile, learningLibrary)
  if (!body) {
    return '\n【用户体态资料】用户尚未在「信息录入」填写身高、体重等资料。若用户询问，请说明未填写并引导前往「我的 → 角色管理 → 信息录入」完善。\n'
  }
  const parts = []
  if (body.nickname) parts.push(`称呼：${body.nickname}`)
  if (body.height) parts.push(`身高：${body.height}cm`)
  if (body.weight) parts.push(`体重：${body.weight}kg`)
  if (body.bustWaistHip) parts.push(`三围（胸/腰/臀）：${body.bustWaistHip}`)
  if (parts.length === 0) {
    return '\n【用户体态资料】用户尚未在「信息录入」填写身高、体重等资料。若用户询问，请说明未填写并引导前往「我的 → 角色管理 → 信息录入」完善。\n'
  }
  return `\n【用户体态资料】（来自「信息录入」，已同步至资料学习库）${parts.join('；')}。用户询问个人信息时请直接引用以上内容，勿称无法查询页面。\n`
}

function mergeStylePreference(contextStyle, profile, outfitPreferences) {
  const fromContext = Array.isArray(contextStyle) && contextStyle.length ? contextStyle : null
  if (fromContext) return fromContext
  const fromProfile = profile?.stylePreference || profile?.selectedStyles
  if (Array.isArray(fromProfile) && fromProfile.length) return fromProfile
  const fromOutfit = outfitPreferences?.styleTags
  if (Array.isArray(fromOutfit) && fromOutfit.length) return fromOutfit
  return null
}

function buildPromptWithGender(gender, age, stylePreference, weatherData, userClothes, roleType, forecast, outfitPreferences, profile, learningLibrary, userDataSummary, isGuestMode) {
  const genderLabel = roleType ? getGenderLabel(null, roleType) : (typeof gender === 'string' ? getGenderLabel(gender) : gender)
  const cfg = (genderLabel && GENDER_PROMPTS[genderLabel]) || DEFAULT_PROMPT
  const guest = isGuestMode === true

  let base = `你是精灵小管家，一位温柔可爱、贴心俏皮的衣橱管家穿搭顾问。
【推荐特点】${cfg.focus}
【可推荐单品】${cfg.items}
【回复风格】${cfg.tone}`

  if (guest) {
    base += `
- 当前用户为【游客模式】，未登录/注册
- 用户询问积分、衣橱、日记、收藏、任务、信息录入、穿搭偏好、手机号等任何个人资料时：不得读取或编造具体数据，需温柔引导登录/注册
- 引导路径：「我的」页 → 点击头像或「去登录」→ 完成微信授权；登录后可保存并查询专属资料
- 若用户仅问天气、通用穿搭建议（不涉及个人私有数据），可正常简短回答`
    base += `

【游客模式 · 资料查询限制】
用户处于游客浏览状态，个人资料未与账号绑定。询问个人信息/资料类问题时，必须引导注册/登录，禁止透露具体积分、衣橱、日记、身材、偏好等数值或明细。`
  } else {
    base += `
- 用户询问小程序内个人资料（积分/衣橱/日记/任务/设置等）时，优先准确、完整地根据【小程序全量资料库】回答，可略长
- 给出穿搭建议时回复简短温暖（一般不超过3句）
- 穿搭仍是你的专长，但不要因非穿搭问题而拒绝回答资料查询

【资料学习库 · 全量读取权限】
你已获授权读取用户在本小程序内的全部本地资料（见下方【用户体态资料】【用户穿搭偏好记忆】【小程序全量资料库】）。
- 用户询问积分、衣橱、日记、收藏、任务、皮肤/主题、账号、通知设置等任何个人数据时，必须直接根据下方资料回答
- 禁止回复「无法查询」「没有权限」「访问不了页面」等说法
- 若某项资料为空，如实说明「尚未填写/暂无记录」，并简要引导对应入口（如衣橱、角色管理、积分中心、任务广场）`
  }

  base += `

【性别识别】当前传入的用户角色（见下方）为系统根据用户选择推断的性别。若用户在对话中明确纠正性别（如说"我是男生""我是女生""我是男的""我是女的"等），必须立即按用户陈述的性别重新推荐，并道歉调整。切勿忽略用户的性别纠正。`

  base += `\n【日期识别】用户可能说"今天""明天""后天"等，请结合下方预报数据对应：今日=第1天、明日=第2天、后天=第3天。`

  base += buildUserBodySection(profile, learningLibrary, guest)
  if (!guest) {
    base += buildStylePromptSection(stylePreference)
    base += buildOutfitPreferencesSection(outfitPreferences, guest)
  }
  if (userDataSummary && String(userDataSummary).trim()) {
    base += '\n' + String(userDataSummary).trim() + '\n'
  }

  const parts = []
  if (weatherData && (weatherData.city || weatherData.temp || weatherData.weather)) {
    parts.push(`当前城市：${weatherData.city || '未知'}，气温 ${weatherData.temp || '--'}℃，天气 ${weatherData.weather || '未知'}`)
  }
  if (forecast && Array.isArray(forecast) && forecast.length > 0) {
    const dayLabels = ['今日', '明日', '后天']
    const forecastLines = forecast.slice(0, 3).map((f, i) => {
      const label = dayLabels[i] || `第${i + 1}天`
      const uv = f.uvIndex ? `，紫外线${f.uvIndex}` : ''
      return `${label}（${f.date}）：${f.textDay}，${f.tempMin}~${f.tempMax}℃${uv}`
    })
    base += `\n\n【3日预报】${forecastLines.join('；')}。请根据用户提到的日期（今天/明天/后天）选用对应天气。`
    base += `\n${buildWeatherReminderSection()}`
  }
  if (genderLabel) parts.push(`用户角色：${genderLabel}`)
  if (!guest && age) parts.push(`年龄：${age}`)
  if (!guest) {
    const body = pickBodyProfile(profile, learningLibrary)
    const nick = (body && body.nickname) || (learningLibrary && learningLibrary.nickname) || (profile && profile.nickname)
    if (nick) parts.push(`昵称：${nick}`)
    if (body && body.height) parts.push(`身高：${body.height}cm`)
    if (body && body.weight) parts.push(`体重：${body.weight}kg`)
    if (body && body.bustWaistHip) parts.push(`三围：${body.bustWaistHip}`)
    if (stylePreference && Array.isArray(stylePreference) && stylePreference.length > 0) {
      parts.push(`风格偏好：${stylePreference.join('、')}`)
    }
  } else {
    parts.push('登录状态：游客浏览（询问个人资料需引导登录）')
  }
  if (!guest && userClothes && typeof userClothes === 'object') {
    const keys = Object.keys(userClothes).filter(k => Array.isArray(userClothes[k]) && userClothes[k].length > 0)
    if (keys.length > 0) {
      const desc = keys.map(k => `${k}: ${userClothes[k].length}件`).join('；')
      parts.push(`用户衣橱：${desc}`)
    }
  }
  if (parts.length > 0) {
    base += `\n\n【当前上下文】${parts.join('。')}。${guest ? '游客模式下个人资料类问题请引导登录；通用穿搭建议可正常给出。' : '请根据以上信息给出个性化穿搭建议。'}`
  }
  return base
}

/** 兼容旧版：context 格式 */
function buildSystemPrompt(context) {
  if (!context) return buildPromptWithGender(null, null, null, null, null, null, null, null, null, null, null, false)
  const weatherData = (context.city || context.temp || context.weather)
    ? { city: context.city, temp: context.temp, weather: context.weather }
    : context.weatherData || null
  const profile = context.profile || null
  const outfitPreferences = context.outfitPreferences || profile?.outfitPreferences || null
  const learningLibrary = context.learningLibrary || profile?.learningLibrary || null
  const userDataSummary = context.userDataSummary || profile?.userDataSummary || ''
  const isGuestMode = context.isGuestMode === true
    || profile?.isGuestMode === true
    || (context.userDataLibrary && context.userDataLibrary.account && context.userDataLibrary.account.guestMode === true)
  const stylePreference = mergeStylePreference(context.stylePreference, profile, outfitPreferences)
  const age = context.age ?? profile?.age ?? learningLibrary?.age ?? outfitPreferences?.age
  const gender = context.gender || profile?.gender
  const roleType = context.roleType || profile?.roleType
  const userClothes = context.wardrobe || context.userClothes
  const forecast = context.forecast || null
  return buildPromptWithGender(gender, age, stylePreference, weatherData, userClothes, roleType, forecast, outfitPreferences, profile, learningLibrary, userDataSummary, isGuestMode)
}

module.exports = { buildSystemPrompt, buildPromptWithGender, getGenderLabel }
