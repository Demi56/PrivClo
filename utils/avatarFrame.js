/**
 * v2 首页 3D 人模场景参数（1.75m、几何中心在原点、glTF Y-up）
 */
const AVATAR_HEIGHT = 1.75
const HALF_HEIGHT = AVATAR_HEIGHT / 2
const FEET_Y = -HALF_HEIGHT
const HEAD_Y = HALF_HEIGHT
const CAMERA_DISTANCE = 3.25
const CAMERA_ZOOM_MIN = 0.65
const CAMERA_ZOOM_MAX = 2.0
const CAMERA_ZOOM_DEFAULT = 1
/** 略低于几何中心，给头顶留取景余量 */
const LOOK_BODY_FRAC = 0.46
/** 在场景内下移人模，避免渲染到画布顶边被裁 */
const MODEL_ROOT_Y = -0.12

function fmt3(x, y, z) {
  return x.toFixed(3) + ' ' + y.toFixed(3) + ' ' + z.toFixed(3)
}

function clampCameraZoom(zoom) {
  const z = Number(zoom) || CAMERA_ZOOM_DEFAULT
  return Math.min(CAMERA_ZOOM_MAX, Math.max(CAMERA_ZOOM_MIN, z))
}

function getAvatarFrame(options) {
  const opts = options || {}
  const sceneOffsetX = Number(opts.sceneOffsetX) || 0
  const cameraZoom = clampCameraZoom(opts.cameraZoom)
  const lookY = FEET_Y + AVATAR_HEIGHT * LOOK_BODY_FRAC
  const camY = lookY + 0.06
  const camDist = CAMERA_DISTANCE / cameraZoom
  return {
    spinPivot: fmt3(sceneOffsetX, 0, 0),
    lookTarget: fmt3(sceneOffsetX, lookY, 0),
    cameraPosition: fmt3(sceneOffsetX, camY, camDist),
    modelRootPosition: fmt3(0, MODEL_ROOT_Y, 0),
    modelRootScale: '1 1 1'
  }
}

module.exports = {
  AVATAR_HEIGHT,
  FEET_Y,
  HEAD_Y,
  CAMERA_DISTANCE,
  CAMERA_ZOOM_MIN,
  CAMERA_ZOOM_MAX,
  CAMERA_ZOOM_DEFAULT,
  clampCameraZoom,
  getAvatarFrame
}
