/**
 * 身体锚点配置 - 专业换装渲染
 * 坐标基于参考画布 REFERENCE_WIDTH x REFERENCE_HEIGHT (375x720)
 * 与 clothingPositions 保持一致
 */

const REF_W = 375
const REF_H = 720

/** 画布水平中心，衣物需与模特主体对齐 */
const CENTER_X = REF_W / 2

/**
 * 身体锚点与分区配置
 * x 使用画布中心，y 与各槽位垂直中心对齐（与 clothingPositions 归一化一致）
 * @typedef {{ x: number, y: number }} Point
 * @typedef {{ upperBodyPolygon: Point[], attachPoints: Record<string, Point> }} GenderAnchors
 */
const bodyAnchors = {
  female: {
    upperBodyPolygon: [
      { x: 45, y: 95 },
      { x: 188, y: 90 },
      { x: 330, y: 95 },
      { x: 338, y: 240 },
      { x: 188, y: 240 }
    ],
    attachPoints: {
      inner: { x: CENTER_X, y: 170 },
      top: { x: CENTER_X, y: 170 },
      bottom: { x: CENTER_X, y: 432 },
      suit: { x: CENTER_X, y: 259 },
      dress: { x: CENTER_X, y: 259 },
      shoes: { x: CENTER_X, y: 648 }
    }
  },
  male: {
    upperBodyPolygon: [
      { x: 48, y: 100 },
      { x: 188, y: 94 },
      { x: 330, y: 100 },
      { x: 338, y: 250 },
      { x: 188, y: 250 }
    ],
    attachPoints: {
      inner: { x: CENTER_X, y: 176 },
      top: { x: CENTER_X, y: 176 },
      bottom: { x: CENTER_X, y: 439 },
      suit: { x: CENTER_X, y: 259 },
      dress: { x: CENTER_X, y: 259 },
      shoes: { x: CENTER_X, y: 648 }
    }
  }
}

/**
 * 获取附着点（像素坐标）
 * @param {string} slotKey - inner | top | bottom | shoes | suit
 * @param {string} gender - female | male
 * @param {number} canvasW
 * @param {number} canvasH
 * @param {{ x: number, y: number, w: number, h: number }} [modelRect] - 模特实际绘制区域（contain 时可能小于画布），传入则坐标基于模特区域
 * @returns {{ x: number, y: number }}
 */
function getAttachPoint(slotKey, gender, canvasW, canvasH, modelRect) {
  const g = gender === 'male' ? 'male' : 'female'
  const config = bodyAnchors[g]
  if (!config) return { x: canvasW / 2, y: canvasH / 2 }
  const key = slotKey === 'dress' ? 'suit' : slotKey
  const pt = config.attachPoints[key] || config.attachPoints.top
  const refX = (pt.x / REF_W)
  const refY = (pt.y / REF_H)
  if (modelRect && modelRect.w > 0 && modelRect.h > 0) {
    return {
      x: modelRect.x + refX * modelRect.w,
      y: modelRect.y + refY * modelRect.h
    }
  }
  return {
    x: refX * canvasW,
    y: refY * canvasH
  }
}

/**
 * 获取上半身多边形（像素坐标）
 */
function getUpperBodyPolygon(gender, canvasW, canvasH) {
  const g = gender === 'male' ? 'male' : 'female'
  const poly = bodyAnchors[g]?.upperBodyPolygon || []
  return poly.map((p) => ({
    x: (p.x / REF_W) * canvasW,
    y: (p.y / REF_H) * canvasH
  }))
}

/**
 * 衣物微调配置：每件衣物可独立设置 x/y 偏移与缩放
 * key 为衣物 URL 的 hash 或文件名，default 为兜底
 */
const clothingAdjustments = {
  default: { x: 0, y: 0, scale: 1.0, skewX: 0, skewY: 0 },
  top: { x: 0, y: 0, scale: 1.05 },
  bottom: { x: 0, y: 0, scale: 1.12 },
  shoes: { x: 0, y: 2, scale: 1.15 }
}

/**
 * 根据 URL 获取衣物微调参数
 * @param {string} url - 衣物图片 URL
 * @param {string} slotKey - 槽位键
 */
function getClothingAdjustment(url, slotKey) {
  if (!url) return clothingAdjustments.default
  const key = url.replace(/^.*\//, '').replace(/\.[^.]+$/, '')
  const bySlot = clothingAdjustments[slotKey]
  const byUrl = clothingAdjustments[key]
  return Object.assign(
    {},
    clothingAdjustments.default,
    bySlot || {},
    byUrl || {}
  )
}

module.exports = {
  REF_W,
  REF_H,
  bodyAnchors,
  clothingAdjustments,
  getAttachPoint,
  getUpperBodyPolygon,
  getClothingAdjustment
}
