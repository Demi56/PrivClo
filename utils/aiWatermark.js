/**
 * 为图片添加 AI 标识水印（保存/分享前调用）
 * @param {Object} pageCtx 页面实例 this
 * @param {string} canvasId wxml 中 type="2d" canvas 的 id
 * @param {string} imagePath 本地图片路径
 * @param {string} label 水印文字，默认「AI生成」
 */
function applyAiWatermark(pageCtx, canvasId, imagePath, label) {
  const text = label || 'AI生成'
  return new Promise((resolve, reject) => {
    wx.getImageInfo({
      src: imagePath,
      success(info) {
        const w = info.width
        const h = info.height
        const query = wx.createSelectorQuery().in(pageCtx)
        query.select('#' + canvasId).fields({ node: true, size: true }).exec((res) => {
          if (!res || !res[0] || !res[0].node) {
            reject(new Error('水印画布未就绪'))
            return
          }
          const canvas = res[0].node
          const ctx = canvas.getContext('2d')
          let dpr = 2
          try {
            dpr = wx.getSystemInfoSync().pixelRatio || 2
          } catch (e) {}
          canvas.width = w * dpr
          canvas.height = h * dpr
          ctx.scale(dpr, dpr)
          const img = canvas.createImage()
          img.onload = () => {
            ctx.drawImage(img, 0, 0, w, h)
            const fontSize = Math.max(14, Math.floor(w * 0.034))
            const padX = fontSize * 0.55
            const padY = fontSize * 0.35
            ctx.font = '600 ' + fontSize + 'px sans-serif'
            const tw = ctx.measureText(text).width
            const boxW = tw + padX * 2
            const boxH = fontSize + padY * 2
            const margin = Math.max(12, Math.floor(w * 0.024))
            const bx = w - boxW - margin
            const by = h - boxH - margin
            ctx.fillStyle = 'rgba(255, 255, 255, 0.92)'
            ctx.fillRect(bx, by, boxW, boxH)
            ctx.fillStyle = '#0EA5E9'
            ctx.fillText(text, bx + padX, by + padY + fontSize * 0.82)
            wx.canvasToTempFilePath({
              canvas,
              fileType: 'png',
              quality: 0.92,
              success: (r) => resolve(r.tempFilePath),
              fail: reject
            })
          }
          img.onerror = () => reject(new Error('加载图片失败'))
          img.src = imagePath
        })
      },
      fail: reject
    })
  })
}

module.exports = {
  applyAiWatermark
}
