/**
 * CDN 图片配置
 * 将主包图片上传至云存储后，设置 USE_CDN=true 并填写 CDN_BASE
 * 需在微信公众平台 - 开发管理 - 开发设置 - 服务器域名 - downloadFile合法域名 中添加 CDN 域名
 */
const USE_CDN = true
const CDN_BASE = 'https://636c-cloud1-0g2w40mm2e9e5623-1404894323.tcb.qcloud.la/images/'

/** CDN 根地址（用于 packagePoints 等子包路径） */
const CDN_ROOT = 'https://636c-cloud1-0g2w40mm2e9e5623-1404894323.tcb.qcloud.la/'

/**
 * 获取图片 URL（支持本地路径与 CDN 切换）
 * 云存储路径：主包 images/xxx；积分商城 packagePoints/images/points-store/xxx；天气日历 packageDiary/images/diary-calendar/xxx
 * @param {string} localPath - 本地路径
 * @returns {string} 实际使用的 URL
 */
function getImageUrl(localPath) {
  if (!localPath || typeof localPath !== 'string') return ''
  if (localPath.startsWith('cloud://')) return localPath
  if (!USE_CDN) return localPath
  if (localPath.startsWith('http://') || localPath.startsWith('https://')) return localPath
  if (localPath.includes('packageDiary/images/diary-calendar/')) {
    const rel = localPath.replace(/.*packageDiary\/images\/diary-calendar\//, '')
    return CDN_ROOT + 'packageDiary/images/diary-calendar/' + rel
  }
  if (localPath.includes('packageWardrobe/images/')) {
    const rel = localPath.replace(/.*packageWardrobe\/images\//, '')
    return CDN_ROOT + 'packageWardrobe/images/' + rel
  }
  if (localPath.includes('packageMemoir/images/memoir/')) {
    const rel = localPath.replace(/.*packageMemoir\/images\/memoir\//, '')
    return CDN_ROOT + 'packageMemoir/images/memoir/' + rel
  }
  const rel = localPath.replace(/.*\/images\//, '')
  if (rel.startsWith('points-store/')) {
    return CDN_ROOT + 'packagePoints/images/points-store/' + rel.replace(/^points-store\//, '')
  }
  return CDN_BASE + rel
}

/** 云存储 models/avatar-test.glb（优先，无需配置 request 合法域名） */
const AVATAR_TEST_CLOUD_FILE_ID =
  'cloud://cloud1-0g2w40mm2e9e5623.636c-cloud1-0g2w40mm2e9e5623-1404894323/models/avatar-test.glb'

/** 3D 人模 GLB（需上传至云存储 models/ 目录，并经 xr-frame-toolkit 优化、无 Draco） */
function getModel3dUrl(gender) {
  const g = gender === 'male' ? 'male' : 'female'
  const file = g === 'male' ? 'avatar-male.glb' : 'avatar-female.glb'
  if (USE_CDN) return CDN_ROOT + 'models/' + file
  return '/models/' + file
}

/** v2 试验模型：优先 cloud://，xr-frame 经 wx.cloud.downloadFile 加载本地路径 */
function getAvatarTestModelUrl() {
  if (AVATAR_TEST_CLOUD_FILE_ID) return AVATAR_TEST_CLOUD_FILE_ID
  if (USE_CDN) return CDN_ROOT + 'models/avatar-test.glb'
  return '/models/avatar-test.glb'
}

module.exports = {
  USE_CDN,
  CDN_BASE,
  CDN_ROOT,
  getImageUrl,
  getModel3dUrl,
  getAvatarTestModelUrl,
  AVATAR_TEST_CLOUD_FILE_ID
}
