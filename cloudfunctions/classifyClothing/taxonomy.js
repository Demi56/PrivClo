/** 与 utils/wardrobeTaxonomy.js 保持同步（云函数侧副本） */
const CATEGORY_TABS = [
  { id: 'tops', name: '上衣' },
  { id: 'bottoms', name: '下装' },
  { id: 'sets', name: '套装' },
  { id: 'inner', name: '内搭' },
  { id: 'shoes', name: '鞋子' },
  { id: 'accessories', name: '其他配饰' }
]

const SUB_CATEGORIES = {
  tops: [
    { id: 'tshirt', name: 'T恤' }, { id: 'shirt', name: '衬衫' }, { id: 'sweatshirt', name: '卫衣' },
    { id: 'sweater', name: '毛衣' }, { id: 'knitwear', name: '针织衫' }, { id: 'blazer', name: '西装外套' },
    { id: 'jacket', name: '夹克' }, { id: 'vest', name: '马甲' }, { id: 'trenchcoat', name: '风衣' },
    { id: 'overcoat', name: '大衣' }, { id: 'downcoat', name: '羽绒服' }
  ],
  bottoms: [
    { id: 'jeans', name: '牛仔裤' }, { id: 'sportspants', name: '运动裤' }, { id: 'shorts', name: '短裤' },
    { id: 'dresspants', name: '西裤' }, { id: 'skirt', name: '半身裙' }
  ],
  sets: [
    { id: 'dresses', name: '连衣裙' }, { id: 'casual', name: '连体牛仔' }, { id: 'homewear', name: '家居服' },
    { id: 'businessset', name: '商务套装' }, { id: 'sportset', name: '运动套装' }
  ],
  inner: [
    { id: 'baseshirt', name: '打底衫' }, { id: 'underwear', name: '内裤' }, { id: 'socks', name: '袜子' },
    { id: 'bra', name: '文胸' }, { id: 'camisole', name: '吊带' }, { id: 'tanktop', name: '打底背心' },
    { id: 'thermal', name: '保暖衣裤' }
  ],
  shoes: [
    { id: 'casual', name: '休闲鞋' }, { id: 'sports', name: '运动鞋' }, { id: 'business', name: '商务鞋' },
    { id: 'heels', name: '高跟鞋' }, { id: 'sandals', name: '凉鞋' }, { id: 'slippers', name: '拖鞋' },
    { id: 'boots', name: '靴子' }, { id: 'functionalshoes', name: '功能鞋' }
  ],
  accessories: [
    { id: 'hats', name: '帽子' }, { id: 'bags', name: '包包' }, { id: 'jewelry', name: '首饰' },
    { id: 'glasses', name: '眼镜' }, { id: 'watch', name: '手表' }, { id: 'hair', name: '发饰' },
    { id: 'scarf', name: '围巾' }, { id: 'gloves', name: '手套' }, { id: 'belt', name: '腰带' }
  ]
}

const TYPE_ALIASES = {
  上衣: 'tops', 上装: 'tops', 外套: 'tops', 外衣: 'tops',
  下装: 'bottoms', 裤子: 'bottoms', 裤装: 'bottoms',
  套装: 'sets', 连衣裙: 'sets', 裙: 'sets', 连体: 'sets',
  内搭: 'inner', 内衣: 'inner',
  鞋子: 'shoes', 鞋: 'shoes', 鞋履: 'shoes',
  配饰: 'accessories', 其他配饰: 'accessories', 配件: 'accessories'
}

const TYPE_ID_ALIASES = {
  top: 'tops', tops: 'tops', upper: 'tops', outerwear: 'tops', coat: 'tops', shirt: 'tops',
  bottom: 'bottoms', bottoms: 'bottoms', pants: 'bottoms', trouser: 'bottoms', trousers: 'bottoms',
  set: 'sets', sets: 'sets', dress: 'sets', jumpsuit: 'sets', onepiece: 'sets',
  inner: 'inner', innerwear: 'inner', underwear: 'inner',
  shoe: 'shoes', shoes: 'shoes', footwear: 'shoes', sneaker: 'shoes',
  accessory: 'accessories', accessories: 'accessories', bag: 'accessories', hat: 'accessories'
}

const CATEGORY_NAME_ALIASES = {
  t恤: 'T恤', tee: 'T恤', tshirt: 'T恤',
  牛仔: '牛仔裤', 牛仔裤: '牛仔裤', jeans: '牛仔裤',
  卫衣: '卫衣', hoodies: '卫衣', sweatshirt: '卫衣',
  衬衫: '衬衫', 毛衣: '毛衣', 针织: '针织衫', 针织衫: '针织衫',
  夹克: '夹克', 外套: '夹克', 风衣: '风衣', 大衣: '大衣', 羽绒服: '羽绒服',
  运动裤: '运动裤', 西裤: '西裤', 短裤: '短裤', 半裙: '半身裙', 半身裙: '半身裙', 裙子: '半身裙',
  连衣裙: '连衣裙', 连体牛仔: '连体牛仔', 家居服: '家居服',
  休闲鞋: '休闲鞋', 运动鞋: '运动鞋', 高跟鞋: '高跟鞋', 靴子: '靴子',
  帽子: '帽子', 包包: '包包', 围巾: '围巾'
}

function getSubCategories(typeId) {
  return SUB_CATEGORIES[typeId] || []
}

function normalizeText(s) {
  return String(s || '').trim().toLowerCase().replace(/\s+/g, '')
}

function normalizeTypeId(typeId) {
  const raw = String(typeId || '').trim()
  if (!raw) return ''
  if (SUB_CATEGORIES[raw]) return raw
  const norm = normalizeText(raw)
  if (SUB_CATEGORIES[norm]) return norm
  return TYPE_ID_ALIASES[norm] || TYPE_ID_ALIASES[raw] || ''
}

function normalizeCategoryName(name) {
  const raw = String(name || '').trim()
  if (!raw) return ''
  const norm = normalizeText(raw)
  return CATEGORY_NAME_ALIASES[norm] || CATEGORY_NAME_ALIASES[raw] || raw
}

function findTypeByIdOrName(typeId, typeName) {
  const normalizedId = normalizeTypeId(typeId)
  if (normalizedId && SUB_CATEGORIES[normalizedId]) {
    const tab = CATEGORY_TABS.find((t) => t.id === normalizedId)
    return { typeId: normalizedId, typeName: tab ? tab.name : typeName || normalizedId }
  }
  const name = String(typeName || typeId || '').trim()
  if (!name) return null
  const hit = CATEGORY_TABS.find((t) => t.name === name || t.id === name)
  if (hit) return { typeId: hit.id, typeName: hit.name }
  const aliasId = TYPE_ALIASES[name]
  if (aliasId) {
    const tab = CATEGORY_TABS.find((t) => t.id === aliasId)
    return tab ? { typeId: tab.id, typeName: tab.name } : null
  }
  const normName = normalizeText(name)
  const aliasByNorm = TYPE_ID_ALIASES[normName]
  if (aliasByNorm) {
    const tab = CATEGORY_TABS.find((t) => t.id === aliasByNorm)
    return tab ? { typeId: tab.id, typeName: tab.name } : null
  }
  return null
}

function findCategoryInType(typeId, categoryId, categoryName) {
  const subs = getSubCategories(typeId)
  if (!subs.length) return null

  const normCatId = normalizeText(categoryId)
  if (categoryId) {
    const byId = subs.find((s) => s.id === categoryId || normalizeText(s.id) === normCatId)
    if (byId) return byId
  }

  const name = normalizeCategoryName(categoryName || categoryId)
  if (!name) return subs[0]

  const exact = subs.find((s) => s.name === name)
  if (exact) return exact

  const norm = normalizeText(name)
  const fuzzy = subs.find((s) => {
    const n = normalizeText(s.name)
    return n === norm || n.includes(norm) || norm.includes(n)
  })
  if (fuzzy) return fuzzy

  return subs[0]
}

function findByCategoryNameGlobally(categoryName) {
  const name = normalizeCategoryName(categoryName)
  if (!name) return null
  const norm = normalizeText(name)

  for (const tab of CATEGORY_TABS) {
    const subs = getSubCategories(tab.id)
    for (const sub of subs) {
      const subNorm = normalizeText(sub.name)
      if (sub.name === name || subNorm === norm || subNorm.includes(norm) || norm.includes(subNorm)) {
        return {
          typeId: tab.id,
          typeName: tab.name,
          categoryId: sub.id,
          categoryName: sub.name
        }
      }
    }
  }
  return null
}

function buildClassificationResult(typeHit, catHit, raw) {
  return {
    typeId: typeHit.typeId,
    typeName: typeHit.typeName,
    categoryId: catHit.id,
    categoryName: catHit.name,
    summary: (raw && raw.summary) ? String(raw.summary).trim() : '',
    confidence: typeof raw?.confidence === 'number' ? raw.confidence : null
  }
}

function resolveClassification(raw) {
  if (!raw || typeof raw !== 'object') return null

  const globalHit = findByCategoryNameGlobally(raw.categoryName || raw.categoryId)
  if (globalHit) {
    return {
      typeId: globalHit.typeId,
      typeName: globalHit.typeName,
      categoryId: globalHit.categoryId,
      categoryName: globalHit.categoryName,
      summary: raw.summary ? String(raw.summary).trim() : '',
      confidence: typeof raw.confidence === 'number' ? raw.confidence : null
    }
  }

  const typeHit = findTypeByIdOrName(raw.typeId, raw.typeName)
  if (!typeHit) return null

  const catHit = findCategoryInType(typeHit.typeId, raw.categoryId, raw.categoryName)
  if (!catHit) return null

  return buildClassificationResult(typeHit, catHit, raw)
}

const PADDING_BY_TYPE = {
  shoes: { paddingLayout: '35x35', centerLayout: 1 },
  accessories: { paddingLayout: '35x35', centerLayout: 1 },
  inner: { paddingLayout: '15x15', centerLayout: 1 },
  sets: { paddingLayout: '25x25', centerLayout: 1 },
  bottoms: { paddingLayout: '20x20', centerLayout: 1 },
  tops: { paddingLayout: '20x20', centerLayout: 1 }
}

function normalizePhotoScene(v) {
  const s = String(v || '').trim().toLowerCase()
  if (['flat_lay', 'flat', 'flatlay'].includes(s)) return 'flat_lay'
  if (['hanging', 'hanger'].includes(s)) return 'hanging'
  if (['worn', 'on_body', 'onbody'].includes(s)) return 'worn'
  if (['mixed', 'complex'].includes(s)) return 'mixed'
  return 'unknown'
}

function normalizeBackgroundLevel(v) {
  const s = String(v || '').trim().toLowerCase()
  if (['clean', 'simple', 'plain'].includes(s)) return 'clean'
  if (['complex', 'busy', 'cluttered'].includes(s)) return 'complex'
  if (['moderate', 'normal'].includes(s)) return 'moderate'
  return 'moderate'
}

function normalizeMattingEngine(v) {
  const s = String(v || '').trim().toLowerCase()
  if (s === 'goods' || s === 'goodsmatting') return 'goods'
  if (s === 'general' || s === 'aipicmatting' || s === 'pic') return 'general'
  return ''
}

function getMattingEngineRecommendation(typeId, sceneInfo) {
  const photoScene = normalizePhotoScene(sceneInfo && sceneInfo.photoScene)
  const backgroundLevel = normalizeBackgroundLevel(sceneInfo && sceneInfo.backgroundLevel)
  const aiEngine = normalizeMattingEngine(sceneInfo && sceneInfo.mattingEngine)

  if (aiEngine) {
    return {
      recommendedEngine: aiEngine,
      preEnhance: backgroundLevel === 'complex',
      photoScene,
      backgroundLevel
    }
  }

  if (photoScene === 'flat_lay' && (typeId === 'shoes' || typeId === 'accessories')) {
    return { recommendedEngine: 'goods', preEnhance: false, photoScene, backgroundLevel }
  }
  if (photoScene === 'flat_lay' && backgroundLevel === 'clean') {
    return { recommendedEngine: 'goods', preEnhance: false, photoScene, backgroundLevel }
  }
  if (photoScene === 'hanging' || photoScene === 'worn' || photoScene === 'mixed') {
    return { recommendedEngine: 'general', preEnhance: backgroundLevel !== 'clean', photoScene, backgroundLevel }
  }
  if (backgroundLevel === 'complex') {
    return { recommendedEngine: 'general', preEnhance: true, photoScene, backgroundLevel }
  }
  return { recommendedEngine: 'general', preEnhance: backgroundLevel === 'moderate', photoScene, backgroundLevel }
}

function getMattingOptions(typeId, sceneInfo) {
  const base = PADDING_BY_TYPE[typeId] || { paddingLayout: '20x20', centerLayout: 1 }
  const rec = getMattingEngineRecommendation(typeId, sceneInfo)
  const dualEngine = rec.backgroundLevel === 'complex' || rec.photoScene === 'mixed'
  return {
    ...base,
    engine: 'auto',
    recommendedEngine: rec.recommendedEngine,
    preEnhance: rec.preEnhance,
    photoScene: rec.photoScene,
    backgroundLevel: rec.backgroundLevel,
    dualEngine
  }
}

function shouldUseDualEngine(mattingOptions) {
  if (!mattingOptions) return false
  if (mattingOptions.dualEngine === true) return true
  return mattingOptions.backgroundLevel === 'complex' || mattingOptions.photoScene === 'mixed'
}

function buildTaxonomyPromptText() {
  const lines = ['可选类型与品类（typeId/categoryId 必须从下列英文 id 中选择，categoryName 用中文）：']
  CATEGORY_TABS.forEach((tab) => {
    const subs = getSubCategories(tab.id)
    lines.push(`${tab.id}（${tab.name}）：${subs.map((s) => `${s.id}=${s.name}`).join('、')}`)
  })
  return lines.join('\n')
}

module.exports = {
  resolveClassification,
  getMattingOptions,
  getMattingEngineRecommendation,
  shouldUseDualEngine,
  buildTaxonomyPromptText
}
