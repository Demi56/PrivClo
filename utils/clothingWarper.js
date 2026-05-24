/**
 * 衣物变形工具 - 使衣物贴合身体曲线
 * 采用仿射变换（缩放+平移+剪切），性能优先
 */

const { getContainSize } = require('./imageHelper.js')

/**
 * 计算衣物绘制参数：基于附着点、槽位、微调
 * @param {number} imgW - 图片宽度
 * @param {number} imgH - 图片高度
 * @param {{ x: number, y: number, w: number, h: number }} slotPx - 槽位像素矩形
 * @param {{ x: number, y: number }} attachPoint - 附着点（像素）
 * @param {{ x?: number, y?: number, scale?: number, skewX?: number, skewY?: number }} adjustment - 微调
 * @returns {{ drawX: number, drawY: number, drawW: number, drawH: number, skewX: number, skewY: number }}
 */
function computeClothingDrawParams(imgW, imgH, slotPx, attachPoint, adjustment) {
  const adj = adjustment || {}
  const contain = getContainSize(imgW, imgH, slotPx.w, slotPx.h)
  let drawW = contain.drawW * (adj.scale ?? 1)
  let drawH = contain.drawH * (adj.scale ?? 1)
  // 以附着点为中心绘制（更贴合身体）
  const centerX = attachPoint.x + (adj.x ?? 0)
  const centerY = attachPoint.y + (adj.y ?? 0)
  const drawX = centerX - drawW / 2
  const drawY = centerY - drawH / 2
  return {
    drawX,
    drawY,
    drawW,
    drawH,
    skewX: adj.skewX ?? 0,
    skewY: adj.skewY ?? 0
  }
}

/**
 * 从 3 组对应点求解仿射变换矩阵
 * 源矩形 (0,0)-(1,1) 映射到目标三角形
 * @param {[number,number][]} srcPoints - 源点 [[x,y],[x,y],[x,y]]
 * @param {[number,number][]} dstPoints - 目标点
 * @returns {{ a: number, b: number, c: number, d: number, e: number, f: number }}
 */
function getAffineTransform(srcPoints, dstPoints) {
  if (!srcPoints || !dstPoints || srcPoints.length < 3 || dstPoints.length < 3) {
    return { a: 1, b: 0, c: 0, d: 1, e: 0, f: 0 }
  }
  const [[sx0, sy0], [sx1, sy1], [sx2, sy2]] = srcPoints
  const [[dx0, dy0], [dx1, dy1], [dx2, dy2]] = dstPoints
  const denom = sx0 * (sy1 - sy2) + sx1 * (sy2 - sy0) + sx2 * (sy0 - sy1)
  if (Math.abs(denom) < 1e-10) return { a: 1, b: 0, c: 0, d: 1, e: dx0, f: dy0 }
  const a = (dx0 * (sy1 - sy2) + dx1 * (sy2 - sy0) + dx2 * (sy0 - sy1)) / denom
  const c = (dx0 * (sx2 - sx1) + dx1 * (sx0 - sx2) + dx2 * (sx1 - sx0)) / denom
  const e = (dx0 * (sx1 * sy2 - sx2 * sy1) + dx1 * (sx2 * sy0 - sx0 * sy2) + dx2 * (sx0 * sy1 - sx1 * sy0)) / denom
  const b = (dy0 * (sy1 - sy2) + dy1 * (sy2 - sy0) + dy2 * (sy0 - sy1)) / denom
  const d = (dy0 * (sx2 - sx1) + dy1 * (sx0 - sx2) + dy2 * (sx1 - sx0)) / denom
  const f = (dy0 * (sx1 * sy2 - sx2 * sy1) + dy1 * (sx2 * sy0 - sx0 * sy2) + dy2 * (sx0 * sy1 - sx1 * sy0)) / denom
  return { a, b, c, d, e, f }
}

/**
 * 将衣物变形到目标四边形（仿射近似，保持平行）
 * 用于上衣/下装等需要轻微梯形变形以贴合身体
 * @param {CanvasRenderingContext2D} ctx
 * @param {HTMLImageElement} img
 * @param {number} imgW
 * @param {number} imgH
 * @param {{ x: number, y: number }[]} dstQuad - 目标四边形的四个角 [左上,右上,右下,左下]
 */
function warpToQuad(ctx, img, imgW, imgH, dstQuad) {
  if (!dstQuad || dstQuad.length < 4) return
  const [tl, tr, br, bl] = dstQuad
  const srcTri = [[0, 0], [1, 0], [0, 1]]
  const dstTri = [
    [tl.x, tl.y],
    [tr.x, tr.y],
    [bl.x, bl.y]
  ]
  const t = getAffineTransform(srcTri, dstTri)
  ctx.save()
  ctx.transform(t.a, t.b, t.c, t.d, t.e, t.f)
  ctx.drawImage(img, 0, 0, imgW, imgH, 0, 0, imgW, imgH)
  ctx.restore()
}

/**
 * 应用变换并绘制（支持可选剪切）
 * @param {CanvasRenderingContext2D} ctx
 * @param {HTMLImageElement} img
 * @param {{ drawX: number, drawY: number, drawW: number, drawH: number, skewX?: number, skewY?: number }} params
 */
function drawWithTransform(ctx, img, params) {
  const { drawX, drawY, drawW, drawH, skewX = 0, skewY = 0 } = params
  const cx = drawX + drawW / 2
  const cy = drawY + drawH / 2
  ctx.save()
  ctx.translate(cx, cy)
  if (skewX !== 0 || skewY !== 0) {
    ctx.transform(1, skewY, skewX, 1, 0, 0)
  }
  ctx.translate(-cx, -cy)
  ctx.drawImage(img, 0, 0, img.width, img.height, drawX, drawY, drawW, drawH)
  ctx.restore()
}

module.exports = {
  computeClothingDrawParams,
  getAffineTransform,
  warpToQuad,
  drawWithTransform
}
