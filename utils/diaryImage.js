const { getImageUrl } = require('./image.js')
const {
  DIARY_BOOK_CLOUD_FILE_ID,
  DIARY_BOOK_IMAGE_PATH,
  DIARY_BOOK_CDN_VERSION
} = require('../config/diary.js')

function getDiaryBookImageUrl() {
  if (DIARY_BOOK_CLOUD_FILE_ID) return DIARY_BOOK_CLOUD_FILE_ID
  return `${getImageUrl(DIARY_BOOK_IMAGE_PATH)}?v=${DIARY_BOOK_CDN_VERSION}`
}

function getDiaryBookCdnUrl() {
  return `${getImageUrl(DIARY_BOOK_IMAGE_PATH)}?v=${DIARY_BOOK_CDN_VERSION}`
}

module.exports = {
  getDiaryBookImageUrl,
  getDiaryBookCdnUrl
}
