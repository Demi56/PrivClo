/**
 * 3D 试穿挂点：预制 GLB 人模上的衣物平面（局部坐标，单位米）
 * 与 bodyAnchors / clothingPositions 语义对应，后续可改为 GLB 内空节点名绑定
 */
const { normalizeTryonGender } = require('./clothingPositions.js')
const { extractTryonTextures } = require('./wardrobeItem.js')

/** @type {Record<string, { front: object, back: object, renderOrder: number }>} */
const FEMALE = {
  inner: {
    renderOrder: 10,
    front: { position: '0 1.32 0.06', rotation: '0 0 0', scale: '0.48 0.58 1' },
    back: { position: '0 1.32 -0.06', rotation: '0 180 0', scale: '0.48 0.58 1' }
  },
  top: {
    renderOrder: 60,
    front: { position: '0 1.38 0.08', rotation: '0 0 0', scale: '0.58 0.68 1' },
    back: { position: '0 1.38 -0.08', rotation: '0 180 0', scale: '0.58 0.68 1' }
  },
  bottom: {
    renderOrder: 30,
    front: { position: '0 0.92 0.07', rotation: '0 0 0', scale: '0.52 0.72 1' },
    back: { position: '0 0.92 -0.07', rotation: '0 180 0', scale: '0.52 0.72 1' }
  },
  suit: {
    renderOrder: 50,
    front: { position: '0 1.15 0.08', rotation: '0 0 0', scale: '0.56 1.05 1' },
    back: { position: '0 1.15 -0.08', rotation: '0 180 0', scale: '0.56 1.05 1' }
  },
  shoes: {
    renderOrder: 70,
    front: { position: '0 0.12 0.05', rotation: '0 0 0', scale: '0.42 0.18 1' },
    back: { position: '0 0.12 -0.05', rotation: '0 180 0', scale: '0.42 0.18 1' }
  }
}

const MALE = {
  inner: {
    renderOrder: 10,
    front: { position: '0 1.34 0.06', rotation: '0 0 0', scale: '0.52 0.56 1' },
    back: { position: '0 1.34 -0.06', rotation: '0 180 0', scale: '0.52 0.56 1' }
  },
  top: {
    renderOrder: 60,
    front: { position: '0 1.40 0.08', rotation: '0 0 0', scale: '0.62 0.66 1' },
    back: { position: '0 1.40 -0.08', rotation: '0 180 0', scale: '0.62 0.66 1' }
  },
  bottom: {
    renderOrder: 30,
    front: { position: '0 0.90 0.07', rotation: '0 0 0', scale: '0.54 0.70 1' },
    back: { position: '0 0.90 -0.07', rotation: '0 180 0', scale: '0.54 0.70 1' }
  },
  suit: {
    renderOrder: 50,
    front: { position: '0 1.12 0.08', rotation: '0 0 0', scale: '0.58 1.02 1' },
    back: { position: '0 1.12 -0.08', rotation: '0 180 0', scale: '0.58 1.02 1' }
  },
  shoes: {
    renderOrder: 70,
    front: { position: '0 0.10 0.05', rotation: '0 0 0', scale: '0.44 0.20 1' },
    back: { position: '0 0.10 -0.05', rotation: '0 180 0', scale: '0.44 0.20 1' }
  }
}

function getAnchorsForGender(gender) {
  return normalizeTryonGender(gender) === 'male' ? MALE : FEMALE
}

function getActiveSlotKeys(outfit) {
  const o = outfit || {}
  const suitTex = extractTryonTextures(o.suit)
  if (suitTex && suitTex.front) return ['inner', 'suit', 'shoes']
  return ['inner', 'top', 'bottom', 'shoes']
}

module.exports = {
  getAnchorsForGender,
  getActiveSlotKeys
}
