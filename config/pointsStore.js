/**
 * 积分商城资源（云存储）
 * 日记皮肤：packagePoints/images/points-store/skin/1.webp ~ 8.webp
 * 衣橱主题：packagePoints/images/points-store/theme/1.png ~ 3.png
 */
const { CLOUD_ENV_ID } = require('./cloud.js')

const CLOUD_BUCKET_SUFFIX = '1404894323'
const CLOUD_BUCKET = `636c-${CLOUD_ENV_ID}-${CLOUD_BUCKET_SUFFIX}`
const POINTS_STORE_CLOUD_ROOT = `cloud://${CLOUD_ENV_ID}.${CLOUD_BUCKET}/packagePoints/images/points-store`

const DIARY_SKIN_EXT = 'webp'

/** CDN 回退版本号（云存储替换后 bump，避免客户端缓存旧图） */
const DIARY_SKIN_CDN_VERSION = '3'

const DIARY_SKIN_COUNT = 8

/** 积分商城商品 id → 日记皮肤序号（skin/N.webp） */
const DIARY_SKIN_PRODUCT_ID_TO_INDEX = {
  '1': 1,
  '2': 2,
  '3': 3,
  '13': 4,
  '14': 5,
  '15': 6,
  '16': 7
}

const DEFAULT_DIARY_SKIN_INDEX = 1

function getSkinIndexByProductId(productId) {
  const idx = DIARY_SKIN_PRODUCT_ID_TO_INDEX[String(productId)]
  return typeof idx === 'number' && idx >= 1 ? idx : 0
}

function getProductIdBySkinIndex(skinIndex) {
  const n = Number(skinIndex)
  const entries = Object.keys(DIARY_SKIN_PRODUCT_ID_TO_INDEX)
  for (let i = 0; i < entries.length; i++) {
    const pid = entries[i]
    if (DIARY_SKIN_PRODUCT_ID_TO_INDEX[pid] === n) return pid
  }
  return ''
}

function getDiarySkinCloudFileId(index) {
  const n = Number(index)
  if (!n || n < 1 || n > DIARY_SKIN_COUNT) return ''
  return `${POINTS_STORE_CLOUD_ROOT}/skin/${n}.${DIARY_SKIN_EXT}`
}

function getDiarySkinLocalPath(index) {
  const n = Number(index)
  if (!n || n < 1 || n > DIARY_SKIN_COUNT) return ''
  return `/images/points-store/skin/${n}.${DIARY_SKIN_EXT}`
}

const WARDROBE_THEME_EXT = 'png'
const WARDROBE_THEME_COUNT = 3
const WARDROBE_THEME_CDN_VERSION = '4'

/** 衣橱主题云存储 fileID（与云控制台路径一致） */
const WARDROBE_THEME_CLOUD_FILE_IDS = {
  1: `${POINTS_STORE_CLOUD_ROOT}/theme/1.${WARDROBE_THEME_EXT}`,
  2: `${POINTS_STORE_CLOUD_ROOT}/theme/2.${WARDROBE_THEME_EXT}`,
  3: `${POINTS_STORE_CLOUD_ROOT}/theme/3.${WARDROBE_THEME_EXT}`
}

/** 积分商城商品 id → 衣橱主题序号（theme/N.png） */
const WARDROBE_THEME_PRODUCT_ID_TO_INDEX = {
  '11': 1,
  '6': 2,
  '7': 3
}

function getThemeIndexByProductId(productId) {
  const idx = WARDROBE_THEME_PRODUCT_ID_TO_INDEX[String(productId)]
  return typeof idx === 'number' && idx >= 1 ? idx : 0
}

function getWardrobeThemeCloudFileId(index) {
  const n = Number(index)
  if (!n || n < 1 || n > WARDROBE_THEME_COUNT) return ''
  return WARDROBE_THEME_CLOUD_FILE_IDS[n] || ''
}

function getWardrobeThemeLocalPath(index) {
  const n = Number(index)
  if (!n || n < 1 || n > WARDROBE_THEME_COUNT) return ''
  return `/images/points-store/theme/${n}.${WARDROBE_THEME_EXT}`
}

module.exports = {
  DIARY_SKIN_COUNT,
  DIARY_SKIN_EXT,
  DIARY_SKIN_CDN_VERSION,
  POINTS_STORE_CLOUD_ROOT,
  DIARY_SKIN_PRODUCT_ID_TO_INDEX,
  DEFAULT_DIARY_SKIN_INDEX,
  WARDROBE_THEME_EXT,
  WARDROBE_THEME_COUNT,
  WARDROBE_THEME_CDN_VERSION,
  WARDROBE_THEME_PRODUCT_ID_TO_INDEX,
  WARDROBE_THEME_CLOUD_FILE_IDS,
  getSkinIndexByProductId,
  getProductIdBySkinIndex,
  getThemeIndexByProductId,
  getDiarySkinCloudFileId,
  getDiarySkinLocalPath,
  getWardrobeThemeCloudFileId,
  getWardrobeThemeLocalPath
}
