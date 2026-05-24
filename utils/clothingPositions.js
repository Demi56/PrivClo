/**
 * 实时试穿 - 槽位在画布上的绘制区域（相对参考画布归一化坐标 0~1）
 * 参考画布逻辑尺寸 REFERENCE_WIDTH x REFERENCE_HEIGHT（与组件内缩放一致）
 * 不同性别可分别微调
 */

const REFERENCE_WIDTH = 375
const REFERENCE_HEIGHT = 720

/** 与槽位归一化坐标一致的 Canvas 逻辑像素（375×720 的 2 倍，避免与错误比例 750×1334 拉伸） */
const CANVAS_LOGICAL_WIDTH = REFERENCE_WIDTH * 2
const CANVAS_LOGICAL_HEIGHT = REFERENCE_HEIGHT * 2

/**
 * 统一试穿用性别（页面 query、存储、接口可能为 male/M/男 等）
 */
function normalizeTryonGender(g) {
  if (g == null || g === '') return 'female'
  var s = String(g).trim().toLowerCase()
  if (s === 'male' || s === 'm' || s === '1' || s === 'boy' || s === '男') return 'male'
  return 'female'
}

/**
 * 模特底图路径（透明 PNG，固定站姿）
 * 云存储目录：images/model/（与 config/cdn.js CDN_BASE 对应）
 * 当前使用云存储文件：fitting-female.webp、fitting-male.webp
 */
function getModelImagePath(gender) {
  return normalizeTryonGender(gender) === 'male'
    ? '/images/model/fitting-male.webp'
    : '/images/model/fitting-female.webp'
}

/**
 * 各槽位绘制顺序（数值越大越靠上）
 * inner < bottom < suit < shoes < top
 */
const Z_ORDER = {
  inner: 10,
  bottom: 30,
  suit: 40,
  shoes: 50,
  top: 60
}

/**
 * @typedef {{ x: number, y: number, w: number, h: number, z: number }} SlotRect
 * x,y,w,h 为归一化坐标（0~1），表示衣物绘制槽位的包围盒；绘制时衣物按 object-fit: contain 居中缩放
 * @type {{ female: Record<string, SlotRect>, male: Record<string, SlotRect> }}
 */
const SLOTS = {
  female: {
    inner: { x: 0.12, y: 0.20, w: 0.76, h: 0.26, z: Z_ORDER.inner },
    top: { x: 0.04, y: 0.12, w: 0.92, h: 0.40, z: Z_ORDER.top },
    bottom: { x: 0.08, y: 0.38, w: 0.84, h: 0.48, z: Z_ORDER.bottom },
    shoes: { x: 0.12, y: 0.80, w: 0.76, h: 0.18, z: Z_ORDER.shoes },
    suit: { x: 0.02, y: 0.14, w: 0.96, h: 0.72, z: Z_ORDER.suit }
  },
  male: {
    inner: { x: 0.14, y: 0.22, w: 0.72, h: 0.24, z: Z_ORDER.inner },
    top: { x: 0.04, y: 0.14, w: 0.92, h: 0.40, z: Z_ORDER.top },
    bottom: { x: 0.08, y: 0.38, w: 0.84, h: 0.48, z: Z_ORDER.bottom },
    shoes: { x: 0.12, y: 0.80, w: 0.76, h: 0.18, z: Z_ORDER.shoes },
    suit: { x: 0.04, y: 0.16, w: 0.92, h: 0.70, z: Z_ORDER.suit }
  }
}

const SLOT_KEYS = ['inner', 'top', 'bottom', 'shoes', 'suit']

function getSlotsForGender(gender) {
  return normalizeTryonGender(gender) === 'male' ? SLOTS.male : SLOTS.female
}

/**
 * 将归一化矩形转为当前画布像素坐标
 * @param {SlotRect} norm
 * @param {number} canvasW
 * @param {number} canvasH
 */
function normToPx(norm, canvasW, canvasH) {
  return {
    x: norm.x * canvasW,
    y: norm.y * canvasH,
    w: norm.w * canvasW,
    h: norm.h * canvasH,
    z: norm.z
  }
}

/** 从衣物值提取绘制用 URL（云库 wardrobe 常用 imageUrl；Spine 为 src/base） */
function getDrawUrl(val) {
  if (!val) return ''
  if (typeof val === 'string') return val.trim()
  var o = val
  return (o.src || o.base || o.imageUrl || o.url || o.tempFileURL || '').trim()
}

/** 是否有有效衣物（字符串非空或对象有 src/base） */
function hasClothing(val) {
  return !!getDrawUrl(val)
}

/**
 * 计算本次绘制应画的槽位顺序（套装时覆盖 top+bottom，不画二者）
 * 支持旧版 src 字符串与 Spine 附件对象 { type, slot, src, base, layers? }
 */
function getDrawLayersForGender(gender, outfit) {
  const o = outfit || {}
  const slots = getSlotsForGender(gender)
  const hasSuit = hasClothing(o.suit)
  const layers = []

  if (hasSuit) {
    if (hasClothing(o.inner)) layers.push({ key: 'inner', url: getDrawUrl(o.inner) || o.inner })
    layers.push({ key: 'suit', url: getDrawUrl(o.suit) || o.suit })
  } else {
    if (hasClothing(o.inner)) layers.push({ key: 'inner', url: getDrawUrl(o.inner) || o.inner })
    if (hasClothing(o.top)) layers.push({ key: 'top', url: getDrawUrl(o.top) || o.top })
    if (hasClothing(o.bottom)) layers.push({ key: 'bottom', url: getDrawUrl(o.bottom) || o.bottom })
  }
  if (hasClothing(o.shoes)) layers.push({ key: 'shoes', url: getDrawUrl(o.shoes) || o.shoes })

  layers.sort((a, b) => (slots[a.key].z - slots[b.key].z))
  return layers
}

module.exports = {
  REFERENCE_WIDTH,
  REFERENCE_HEIGHT,
  CANVAS_LOGICAL_WIDTH,
  CANVAS_LOGICAL_HEIGHT,
  normalizeTryonGender,
  getModelImagePath,
  getSlotsForGender,
  normToPx,
  getDrawUrl,
  hasClothing,
  getDrawLayersForGender,
  SLOT_KEYS,
  Z_ORDER
}
