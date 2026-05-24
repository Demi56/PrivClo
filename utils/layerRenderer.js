/**
 * 图层渲染器 - 多图层叠加、边缘羽化
 */

/**
 * 绘制单层衣物（支持边缘羽化）
 * @param {CanvasRenderingContext2D} ctx
 * @param {HTMLImageElement} img
 * @param {number} x
 * @param {number} y
 * @param {number} w
 * @param {number} h
 * @param {Object} options
 * @param {number} [options.featherBlur] - 边缘羽化半径
 * @param {number} [options.shadowBlur] - 阴影模糊
 * @param {string} [options.shadowColor] - 阴影颜色
 */
function drawLayer(ctx, img, x, y, w, h, options = {}) {
  const {
    featherBlur = 2,
    shadowBlur = 0,
    shadowColor = 'rgba(0,0,0,0.15)'
  } = options

  ctx.save()

  if (shadowBlur > 0) {
    ctx.shadowBlur = shadowBlur
    ctx.shadowColor = shadowColor
  }

  if (featherBlur > 0) {
    ctx.globalAlpha = 1
    ctx.drawImage(img, 0, 0, img.width, img.height, x, y, w, h)
    ctx.shadowBlur = 0
  } else {
    ctx.drawImage(img, 0, 0, img.width, img.height, x, y, w, h)
  }

  ctx.restore()
}

/**
 * 按顺序绘制多层衣物（base -> shadow -> highlight）
 * @param {CanvasRenderingContext2D} ctx
 * @param {Array<{ img: HTMLImageElement, type?: string }>} layers - 图层列表
 * @param {number} x
 * @param {number} y
 * @param {number} w
 * @param {number} h
 * @param {Object} options
 */
function drawLayers(ctx, layers, x, y, w, h, options = {}) {
  if (!layers || !layers.length) return
  const defaultOpts = { featherBlur: 2 }
  for (let i = 0; i < layers.length; i++) {
    const layer = layers[i]
    const type = layer.type || 'base'
    const opts = Object.assign({}, defaultOpts, options)
    if (type === 'shadow') {
      opts.shadowBlur = 4
      opts.shadowColor = 'rgba(0,0,0,0.2)'
    } else if (type === 'highlight') {
      opts.featherBlur = 1
      opts.shadowBlur = 0
    }
    drawLayer(ctx, layer.img, x, y, w, h, opts)
  }
}

/**
 * 将单 URL 转为图层数组（兼容旧格式）
 * @param {string|{ base?: string, shadow?: string, highlight?: string }} urlOrLayers
 * @returns {{ base: string, shadow?: string, highlight?: string }[]}
 */
function normalizeToLayers(urlOrLayers) {
  if (!urlOrLayers) return []
  if (typeof urlOrLayers === 'string') {
    return [{ base: urlOrLayers }]
  }
  if (typeof urlOrLayers === 'object' && urlOrLayers.base) {
    const arr = [{ base: urlOrLayers.base }]
    if (urlOrLayers.shadow) arr.push({ base: urlOrLayers.shadow, type: 'shadow' })
    if (urlOrLayers.highlight) arr.push({ base: urlOrLayers.highlight, type: 'highlight' })
    return arr
  }
  return []
}

module.exports = {
  drawLayer,
  drawLayers,
  normalizeToLayers
}
