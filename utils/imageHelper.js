/**
 * 图片辅助工具 - 用于试穿等场景保持宽高比、居中绘制
 */

/**
 * 获取图片信息（含宽高）
 * @param {string} src - 图片路径（本地或网络）
 * @returns {Promise<{ path: string, width: number, height: number }>}
 */
function getImageInfo(src) {
  return new Promise((resolve, reject) => {
    if (!src || typeof src !== 'string') {
      reject(new Error('invalid src'))
      return
    }
    wx.getImageInfo({
      src: src.trim(),
      success: (res) =>
        resolve({
          path: res.path,
          width: res.width || 0,
          height: res.height || 0
        }),
      fail: (err) => reject(err || new Error('getImageInfo fail'))
    })
  })
}

/**
 * object-fit: contain - 保持宽高比缩放至容器内，居中
 * @param {number} imgW - 图片原始宽度
 * @param {number} imgH - 图片原始高度
 * @param {number} containerW - 容器宽度
 * @param {number} containerH - 容器高度
 * @returns {{ drawW: number, drawH: number, offsetX: number, offsetY: number }}
 */
function getContainSize(imgW, imgH, containerW, containerH) {
  if (!imgW || !imgH) {
    return {
      drawW: containerW || 0,
      drawH: containerH || 0,
      offsetX: 0,
      offsetY: 0
    }
  }
  const cw = containerW || 0
  const ch = containerH || 0
  if (!cw || !ch) {
    return { drawW: imgW, drawH: imgH, offsetX: 0, offsetY: 0 }
  }
  const scale = Math.min(cw / imgW, ch / imgH)
  const drawW = imgW * scale
  const drawH = imgH * scale
  const offsetX = (cw - drawW) / 2
  const offsetY = (ch - drawH) / 2
  return { drawW, drawH, offsetX, offsetY }
}

module.exports = {
  getImageInfo,
  getContainSize
}
