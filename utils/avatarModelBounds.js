/**
 * 从 xr-frame gltf 组件读取 body / shell_top 世界 Y 与壳层尺寸
 */
const { AVATAR_TEST_BOUNDS } = require('./avatarClothAnchors.js')

const BODY_NAME_CANDIDATES = ['body', 'Body']

function readVec3(source, fallback) {
  const fb = fallback || { x: 0, y: 0, z: 0 }
  if (!source) return fb
  if (typeof source === 'string') {
    const p = source.trim().split(/\s+/).map(Number)
    return { x: p[0] || 0, y: p[1] || 0, z: p[2] || 0 }
  }
  if (Array.isArray(source)) {
    return { x: source[0] || 0, y: source[1] || 0, z: source[2] || 0 }
  }
  return {
    x: source.x != null ? source.x : fb.x,
    y: source.y != null ? source.y : fb.y,
    z: source.z != null ? source.z : fb.z
  }
}

function mergeAabb(target, min, max) {
  if (!min || !max) return target
  if (!target) {
    return {
      minX: min.x,
      minY: min.y,
      minZ: min.z,
      maxX: max.x,
      maxY: max.y,
      maxZ: max.z
    }
  }
  return {
    minX: Math.min(target.minX, min.x),
    minY: Math.min(target.minY, min.y),
    minZ: Math.min(target.minZ, min.z),
    maxX: Math.max(target.maxX, max.x),
    maxY: Math.max(target.maxY, max.y),
    maxZ: Math.max(target.maxZ, max.z)
  }
}

function readGeometryAabb(mesh) {
  if (!mesh) return null
  const geo = mesh.geometry || (mesh.el && mesh.el.geometry)
  if (!geo) return null

  if (geo.aabb) {
    const box = geo.aabb
    if (box.min && box.max) {
      return {
        min: readVec3(box.min),
        max: readVec3(box.max)
      }
    }
    if (box.minX != null) {
      return {
        min: { x: box.minX, y: box.minY, z: box.minZ },
        max: { x: box.maxX, y: box.maxY, z: box.maxZ }
      }
    }
  }

  if (typeof geo.getAABB === 'function') {
    try {
      const box = geo.getAABB()
      if (box && box.min && box.max) {
        return { min: readVec3(box.min), max: readVec3(box.max) }
      }
    } catch (err) {}
  }

  return null
}

function readTransform(mesh) {
  if (!mesh) return null
  let transform = mesh.transform
  if (!transform && mesh.el && mesh.el.getComponent) {
    try {
      transform = mesh.el.getComponent('transform')
    } catch (err) {}
  }
  if (!transform) return null

  const pos = readVec3(transform.worldPosition || transform.position)
  const scale = readVec3(transform.worldScale || transform.scale, { x: 1, y: 1, z: 1 })
  return { position: pos, scale: scale }
}

function transformLocalAabb(localBox, transform) {
  if (!localBox || !transform) return null
  const min = localBox.min
  const max = localBox.max
  const s = transform.scale
  const p = transform.position

  const corners = [
    { x: min.x * s.x + p.x, y: min.y * s.y + p.y, z: min.z * s.z + p.z },
    { x: max.x * s.x + p.x, y: min.y * s.y + p.y, z: min.z * s.z + p.z },
    { x: min.x * s.x + p.x, y: max.y * s.y + p.y, z: min.z * s.z + p.z },
    { x: max.x * s.x + p.x, y: max.y * s.y + p.y, z: max.z * s.z + p.z },
    { x: min.x * s.x + p.x, y: min.y * s.y + p.y, z: max.z * s.z + p.z },
    { x: max.x * s.x + p.x, y: min.y * s.y + p.y, z: max.z * s.z + p.z },
    { x: min.x * s.x + p.x, y: max.y * s.y + p.y, z: max.z * s.z + p.z },
    { x: max.x * s.x + p.x, y: max.y * s.y + p.y, z: max.z * s.z + p.z }
  ]

  let world = null
  corners.forEach(function (c) {
    world = mergeAabb(world, c, c)
  })
  return world
}

function collectMeshAabb(gltf, nameCandidates) {
  if (!gltf || !nameCandidates || !nameCandidates.length) return null
  let merged = null

  nameCandidates.forEach(function (name) {
    let list = []
    if (gltf.getPrimitivesByNodeName) {
      list = gltf.getPrimitivesByNodeName(name) || []
    }
    if ((!list || !list.length) && gltf.getPrimitivesByMeshName) {
      list = gltf.getPrimitivesByMeshName(name) || []
    }
    list.forEach(function (mesh) {
      const localBox = readGeometryAabb(mesh)
      const transform = readTransform(mesh)
      if (!localBox || !transform) return
      const world = transformLocalAabb(localBox, transform)
      if (!world) return
      merged = mergeAabb(
        merged,
        { x: world.minX, y: world.minY, z: world.minZ },
        { x: world.maxX, y: world.maxY, z: world.maxZ }
      )
    })
  })

  return merged
}

function aabbToBounds(aabb, fallback) {
  const fb = fallback || AVATAR_TEST_BOUNDS
  if (!aabb) return fb

  const height = Math.max(aabb.maxY - aabb.minY, 0.5)
  const width = Math.max(aabb.maxX - aabb.minX, 0.3)
  return {
    feetY: aabb.minY,
    headY: aabb.maxY,
    bodyWidth: Math.min(width, 0.95),
    height: height
  }
}

function shellAabbToShellTop(aabb, fallbackShell) {
  const fb = fallbackShell || AVATAR_TEST_BOUNDS.shellTop
  if (!aabb) return fb
  return {
    centerY: (aabb.minY + aabb.maxY) / 2,
    centerZ: (aabb.minZ + aabb.maxZ) / 2
  }
}

function measureAvatarBounds(gltf) {
  const bodyAabb = collectMeshAabb(gltf, BODY_NAME_CANDIDATES)
  const shellAabb = collectMeshAabb(gltf, ['shell_top', 'Shell_top', 'shell_Top'])
  const body = aabbToBounds(bodyAabb, AVATAR_TEST_BOUNDS)
  const shellTop = shellAabbToShellTop(shellAabb, AVATAR_TEST_BOUNDS.shellTop)

  if (!bodyAabb && !shellAabb) {
    return Object.assign({}, AVATAR_TEST_BOUNDS)
  }

  return {
    feetY: body.feetY,
    headY: body.headY,
    bodyWidth: body.bodyWidth,
    shellTop: shellTop
  }
}

module.exports = {
  measureAvatarBounds
}
