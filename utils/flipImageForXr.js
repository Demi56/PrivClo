/**
 * xr-frame 竖直 plane 采样时 V 轴与 PNG 相反，加载前垂直翻转图片
 */
const flipCache = Object.create(null)

function flipImageVertical(src) {
  if (!src || typeof src !== 'string') return Promise.resolve(src || '')
  if (flipCache[src]) return Promise.resolve(flipCache[src])

  return new Promise(function (resolve) {
    wx.getImageInfo({
      src: src,
      success: function (info) {
        const w = info.width
        const h = info.height
        if (!w || !h || !wx.createOffscreenCanvas) {
          resolve(src)
          return
        }
        try {
          const canvas = wx.createOffscreenCanvas({ type: '2d', width: w, height: h })
          const ctx = canvas.getContext('2d')
          ctx.translate(0, h)
          ctx.scale(1, -1)
          const img = canvas.createImage()
          img.onload = function () {
            ctx.drawImage(img, 0, 0, w, h)
            wx.canvasToTempFilePath({
              canvas: canvas,
              success: function (res) {
                const out = res.tempFilePath || src
                flipCache[src] = out
                resolve(out)
              },
              fail: function () {
                resolve(src)
              }
            })
          }
          img.onerror = function () {
            resolve(src)
          }
          img.src = info.path || src
        } catch (err) {
          resolve(src)
        }
      },
      fail: function () {
        resolve(src)
      }
    })
  })
}

module.exports = {
  flipImageVertical
}
