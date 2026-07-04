/**
 * 精灵小管家形象
 * - 首页右上角 + 聊天对话框：云存储 sprite.webp
 * - 加载过渡页：独立使用 loading-sprite（不随首页变动）
 */

/** 首页 / 聊天 */
const SPRITE_CLOUD_FILE_ID =
  'cloud://cloud1-0g2w40mm2e9e5623.636c-cloud1-0g2w40mm2e9e5623-1404894323/images/sprite.webp'

const SPRITE_IMAGE_PATH = '/images/sprite.webp'

/** 加载过渡页专用（与首页精灵分离） */
const LOADING_SPRITE_IMAGE_PATH = '/images/loading-sprite.webp'

module.exports = {
  SPRITE_CLOUD_FILE_ID,
  SPRITE_IMAGE_PATH,
  LOADING_SPRITE_IMAGE_PATH
}
