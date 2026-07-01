const { getImageUrl } = require('./image.js')
const {
  getDiarySkinCloudFileId,
  getDiarySkinLocalPath,
  DIARY_SKIN_CDN_VERSION,
  DIARY_SKIN_COUNT,
  getWardrobeThemeCloudFileId,
  getWardrobeThemeLocalPath,
  WARDROBE_THEME_CDN_VERSION,
  WARDROBE_THEME_COUNT
} = require('../config/pointsStore.js')

function withWardrobeThemeVersion(url) {
  if (!url) return ''
  if (url.indexOf('http://') !== 0 && url.indexOf('https://') !== 0) return url
  const sep = url.indexOf('?') >= 0 ? '&' : '?'
  return url + sep + 'v=' + WARDROBE_THEME_CDN_VERSION
}

function getDiarySkinImageUrl(index) {
  const cloudId = getDiarySkinCloudFileId(index)
  if (cloudId) return cloudId
  const localPath = getDiarySkinLocalPath(index)
  if (!localPath) return ''
  return `${getImageUrl(localPath)}?v=${DIARY_SKIN_CDN_VERSION}`
}

function getDiarySkinCdnUrl(index) {
  const localPath = getDiarySkinLocalPath(index)
  if (!localPath) return ''
  return `${getImageUrl(localPath)}?v=${DIARY_SKIN_CDN_VERSION}`
}

/** 批量解析云存储临时链接（替换云文件后获取最新图） */
function resolveDiarySkinTempUrls() {
  if (!wx.cloud || typeof wx.cloud.getTempFileURL !== 'function') {
    return Promise.resolve({})
  }
  const fileList = []
  for (let i = 1; i <= DIARY_SKIN_COUNT; i++) {
    const id = getDiarySkinCloudFileId(i)
    if (id) fileList.push(id)
  }
  if (!fileList.length) return Promise.resolve({})

  return new Promise((resolve) => {
    wx.cloud.getTempFileURL({
      fileList,
      success(res) {
        const map = {}
        ;(res.fileList || []).forEach((item) => {
          if (item && item.fileID && item.status === 0 && item.tempFileURL) {
            map[item.fileID] = item.tempFileURL
          }
        })
        resolve(map)
      },
      fail() {
        resolve({})
      }
    })
  })
}

function getWardrobeThemeImageUrl(index) {
  return getWardrobeThemeCloudFileId(index) || ''
}

function getWardrobeThemeCdnUrl(index) {
  const localPath = getWardrobeThemeLocalPath(index)
  if (!localPath) return ''
  return `${getImageUrl(localPath)}?v=${WARDROBE_THEME_CDN_VERSION}`
}

function resolveWardrobeThemeTempUrls() {
  if (!wx.cloud || typeof wx.cloud.getTempFileURL !== 'function') {
    return Promise.resolve({})
  }
  const fileList = []
  for (let i = 1; i <= WARDROBE_THEME_COUNT; i++) {
    const id = getWardrobeThemeCloudFileId(i)
    if (id) fileList.push(id)
  }
  if (!fileList.length) return Promise.resolve({})

  return new Promise((resolve) => {
    wx.cloud.getTempFileURL({
      fileList,
      success(res) {
        const map = {}
        ;(res.fileList || []).forEach((item) => {
          if (item && item.fileID && item.status === 0 && item.tempFileURL) {
            map[item.fileID] = withWardrobeThemeVersion(item.tempFileURL)
          }
        })
        resolve(map)
      },
      fail() {
        resolve({})
      }
    })
  })
}

/** 解析单个衣橱主题的云存储临时链接（仅 https，不回退 CDN） */
function resolveWardrobeThemeTempUrl(index) {
  const fileId = getWardrobeThemeCloudFileId(index)
  if (!fileId || !wx.cloud || typeof wx.cloud.getTempFileURL !== 'function') {
    return Promise.resolve('')
  }
  return new Promise((resolve) => {
    wx.cloud.getTempFileURL({
      fileList: [fileId],
      success(res) {
        const item = (res.fileList || [])[0]
        if (item && item.fileID === fileId && item.status === 0 && item.tempFileURL) {
          resolve(withWardrobeThemeVersion(item.tempFileURL))
          return
        }
        resolve('')
      },
      fail() {
        resolve('')
      }
    })
  })
}

module.exports = {
  getDiarySkinImageUrl,
  getDiarySkinCdnUrl,
  resolveDiarySkinTempUrls,
  getDiarySkinCloudFileId,
  getWardrobeThemeImageUrl,
  getWardrobeThemeCdnUrl,
  resolveWardrobeThemeTempUrls,
  resolveWardrobeThemeTempUrl,
  getWardrobeThemeCloudFileId,
  withWardrobeThemeVersion
}
