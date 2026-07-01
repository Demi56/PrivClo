const {
  DEFAULT_DIARY_SKIN_INDEX,
  getSkinIndexByProductId
} = require('../config/pointsStore.js')
const {
  getDiarySkinImageUrl,
  getDiarySkinCdnUrl,
  getDiarySkinCloudFileId,
  resolveDiarySkinTempUrls
} = require('./pointsStoreImage.js')

const ACTIVE_DIARY_SKIN_KEY = 'privclo_diary_active_skin'

function getActiveDiarySkinIndex() {
  try {
    const n = Number(wx.getStorageSync(ACTIVE_DIARY_SKIN_KEY))
    if (n >= 1 && n <= 7) return n
  } catch (e) {}
  return DEFAULT_DIARY_SKIN_INDEX
}

function setActiveDiarySkinIndex(skinIndex) {
  const n = Number(skinIndex)
  if (!n || n < 1 || n > 7) return
  try {
    wx.setStorageSync(ACTIVE_DIARY_SKIN_KEY, n)
  } catch (e) {
    console.error('save active diary skin failed', e)
  }
}

function setActiveDiarySkinByProductId(productId) {
  const idx = getSkinIndexByProductId(productId)
  if (idx) setActiveDiarySkinIndex(idx)
}

function getActiveDiarySkinImageUrl() {
  return getDiarySkinImageUrl(getActiveDiarySkinIndex())
}

function getActiveDiarySkinCdnUrl(skinIndex) {
  const idx = skinIndex || getActiveDiarySkinIndex()
  return getDiarySkinCdnUrl(idx)
}

function refreshActiveDiarySkinImageUrl() {
  const index = getActiveDiarySkinIndex()
  const fileId = getDiarySkinCloudFileId(index)
  if (!fileId || !wx.cloud || typeof wx.cloud.getTempFileURL !== 'function') {
    return Promise.resolve(getActiveDiarySkinImageUrl())
  }
  return resolveDiarySkinTempUrls().then((urlMap) => {
    const tempUrl = fileId && urlMap[fileId] ? urlMap[fileId] : ''
    return tempUrl || getActiveDiarySkinImageUrl()
  })
}

module.exports = {
  ACTIVE_DIARY_SKIN_KEY,
  getActiveDiarySkinIndex,
  setActiveDiarySkinIndex,
  setActiveDiarySkinByProductId,
  getActiveDiarySkinImageUrl,
  getActiveDiarySkinCdnUrl,
  refreshActiveDiarySkinImageUrl
}
