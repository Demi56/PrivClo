const { getImageUrl } = require('./image.js')
const {
  SPRITE_CLOUD_FILE_ID,
  SPRITE_IMAGE_PATH,
  LOADING_SPRITE_IMAGE_PATH
} = require('../config/sprite.js')

/** 首页右上角 + 聊天头像 */
function getSpriteImageUrl() {
  if (SPRITE_CLOUD_FILE_ID) return SPRITE_CLOUD_FILE_ID
  return getImageUrl(SPRITE_IMAGE_PATH)
}

function getSpriteCdnUrl() {
  return getImageUrl(SPRITE_IMAGE_PATH)
}

/** 加载过渡页专用精灵图 */
function getLoadingSpriteImageUrl() {
  return getImageUrl(LOADING_SPRITE_IMAGE_PATH)
}

function getLoadingSpriteCdnUrl() {
  return getImageUrl(LOADING_SPRITE_IMAGE_PATH)
}

module.exports = {
  getSpriteImageUrl,
  getSpriteCdnUrl,
  getLoadingSpriteImageUrl,
  getLoadingSpriteCdnUrl,
  SPRITE_CLOUD_FILE_ID,
  SPRITE_IMAGE_PATH,
  LOADING_SPRITE_IMAGE_PATH
}
