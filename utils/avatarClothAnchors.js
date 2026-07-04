/**
 * v2 人模挂点：位置对齐 shell_top，尺寸按 clothingPositions 槽位比例
 *
 * xr-frame plane 默认在 XZ 水平面，rotation=-90 0 0 后：
 * - scale.x → 肩宽
 * - scale.z → 竖直高度（scale.y 只影响厚度，改高度无效）
 */
const { getSlotsForGender, normalizeTryonGender } = require('./clothingPositions.js')

const AVATAR_TEST_BOUNDS = {
  feetY: 0.01,
  headY: 1.72,
  bodyWidth: 0.82,
  shellTop: {
    centerY: 1.17,
    centerZ: 0.05
  }
}

const TOP_OVERLAY_WIDTH_SCALE = 0.70
/** 上衣平面竖直高度（米，scale.z） */
const TOP_OVERLAY_HEIGHT_METERS = 0.6
/** @deprecated 仅兼容导出；高度以 TOP_OVERLAY_HEIGHT_METERS 为准 */
const TOP_OVERLAY_HEIGHT_SCALE = 0.34
/** 上沿距头顶留白（米），避免遮脸 */
const TOP_EDGE_HEAD_GAP = 0.14
const TOP_OVERLAY_SIZE_SCALE = TOP_OVERLAY_WIDTH_SCALE
const DEPTH_FRONT = 0.06
const DEPTH_BACK = -0.06

function fmt3(x, y, z) {
  return x.toFixed(4) + ' ' + y.toFixed(4) + ' ' + z.toFixed(4)
}

function normalizeBounds(bounds) {
  const b = bounds || {}
  const feetY = b.feetY != null ? b.feetY : AVATAR_TEST_BOUNDS.feetY
  const headY = b.headY != null ? b.headY : AVATAR_TEST_BOUNDS.headY
  const bodyWidth = b.bodyWidth != null ? b.bodyWidth : AVATAR_TEST_BOUNDS.bodyWidth
  const height = Math.max(headY - feetY, 0.5)
  return { feetY: feetY, headY: headY, bodyWidth: bodyWidth, height: height }
}

/** 竖直高度写在 scale.z */
function buildFrontPlaneScale(scaleW, scaleH) {
  return fmt3(scaleW, 1, Math.abs(scaleH))
}

function buildBackPlaneScale(scaleW, scaleH) {
  return fmt3(scaleW, 1, Math.abs(scaleH))
}

function computeOverlayScales(slot, bounds) {
  const b = normalizeBounds(bounds)
  return {
    scaleW: slot.w * b.bodyWidth * TOP_OVERLAY_WIDTH_SCALE,
    scaleH: TOP_OVERLAY_HEIGHT_METERS
  }
}

function computeTopOverlayCenterY(slot, bounds, scaleH) {
  const b = normalizeBounds(bounds)
  const anchorNormY = slot.y + slot.h * 0.58
  const fromSlot = b.headY - anchorNormY * b.height
  const maxTopY = b.headY - TOP_EDGE_HEAD_GAP
  const fromHeadGap = maxTopY - scaleH * 0.5
  return Math.min(fromSlot, fromHeadGap)
}

function buildTopOverlayAnchor(shellTop, slot, bounds) {
  const scales = computeOverlayScales(slot, bounds)
  const frontScale = buildFrontPlaneScale(scales.scaleW, scales.scaleH)
  const backScale = buildBackPlaneScale(scales.scaleW, scales.scaleH)
  const centerY = computeTopOverlayCenterY(slot, bounds, scales.scaleH)
  const centerZ = shellTop && shellTop.centerZ != null
    ? shellTop.centerZ
    : AVATAR_TEST_BOUNDS.shellTop.centerZ

  return {
    renderOrder: slot.z || 60,
    front: {
      position: fmt3(0, centerY, centerZ + DEPTH_FRONT),
      rotation: '-90 0 0',
      scale: frontScale
    },
    back: {
      position: fmt3(0, centerY, centerZ + DEPTH_BACK),
      rotation: '90 0 180',
      scale: backScale
    }
  }
}

function slotRectToAnchor(slot, bounds) {
  return buildTopOverlayAnchor(null, slot, bounds)
}

function getAvatarAnchorForSlot(gender, slotKey, bounds) {
  const slots = getSlotsForGender(normalizeTryonGender(gender))
  const slot = slots[slotKey]
  if (!slot) return null

  if (slotKey === 'top') {
    const b = bounds || {}
    const shell = b.shellTop || AVATAR_TEST_BOUNDS.shellTop
    return buildTopOverlayAnchor(shell, slot, bounds)
  }

  const scales = computeOverlayScales(slot, bounds)
  const centerY = computeTopOverlayCenterY(slot, bounds, scales.scaleH)
  const frontScale = buildFrontPlaneScale(scales.scaleW, scales.scaleH)
  const backScale = buildBackPlaneScale(scales.scaleW, scales.scaleH)

  return {
    renderOrder: slot.z || 60,
    front: {
      position: fmt3(0, centerY, DEPTH_FRONT),
      rotation: '-90 0 0',
      scale: frontScale
    },
    back: {
      position: fmt3(0, centerY, DEPTH_BACK),
      rotation: '90 0 180',
      scale: backScale
    }
  }
}

module.exports = {
  AVATAR_TEST_BOUNDS,
  TOP_OVERLAY_WIDTH_SCALE,
  TOP_OVERLAY_HEIGHT_METERS,
  TOP_OVERLAY_HEIGHT_SCALE,
  TOP_OVERLAY_SIZE_SCALE,
  TOP_EDGE_HEAD_GAP,
  getAvatarAnchorForSlot,
  slotRectToAnchor,
  buildTopOverlayAnchor
}
