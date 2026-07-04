const { SHELL_MESH_NAMES } = require('./avatarModelSpec.js')

const SHELL_TOP_TEX_ID = 'shell-top-tex'

const TOP_NAME_CANDIDATES = ['shell_top', 'Shell_top', 'shell_Top']

function flattenMeshList(list) {
  if (!list || !list.length) return []
  const first = list[0]
  if (first && first.primitives && Array.isArray(first.primitives)) {
    const out = []
    list.forEach(function (entry) {
      if (entry && entry.primitives) {
        entry.primitives.forEach(function (mesh) {
          if (mesh) out.push(mesh)
        })
      }
    })
    return out
  }
  return list
}

function normalizeTextureValue(asset) {
  if (!asset) return null
  let v = asset.value != null ? asset.value : asset
  if (v && v.texture) v = v.texture
  else if (v && v.value != null && typeof v.value !== 'string') v = v.value
  return v
}

function getTextureForMaterial(scene, assetId) {
  if (!scene || !scene.assets || !scene.assets.getAsset) return null
  return scene.assets.getAsset('texture', assetId)
}

function isTextureAssetReady(scene, assetId) {
  return !!getTextureForMaterial(scene, assetId)
}

function resolveLoadAssetResult(ret) {
  if (!ret) return Promise.resolve(null)
  if (typeof ret.then === 'function') {
    return ret.then(normalizeTextureValue)
  }
  if (ret.promise && typeof ret.promise.then === 'function') {
    return ret.promise.then(function () {
      return normalizeTextureValue(ret)
    })
  }
  return Promise.resolve(normalizeTextureValue(ret))
}

function getSceneTextureAsset(scene, assetId) {
  if (!scene || !scene.assets || !scene.assets.getAsset) return null
  return normalizeTextureValue(scene.assets.getAsset('texture', assetId))
}

function waitSceneTextureAsset(scene, assetId) {
  if (!scene || !scene.assets) return Promise.resolve(null)
  if (scene.assets.getAssetWithState) {
    const ret = scene.assets.getAssetWithState('texture', assetId)
    const tex = normalizeTextureValue(ret && ret.value)
    if (tex) return Promise.resolve(tex)
    if (ret && ret.promise && typeof ret.promise.then === 'function') {
      return ret.promise.then(function () {
        return getSceneTextureAsset(scene, assetId)
      })
    }
  }
  return Promise.resolve(getSceneTextureAsset(scene, assetId))
}

function waitSceneTextureAssetReady(scene, assetId) {
  return waitSceneTextureAsset(scene, assetId).then(function () {
    return isTextureAssetReady(scene, assetId)
  })
}

/**
 * 脚本加载纹理（避免 wx:if 动态 xr-asset-load，该方式在 xr-frame 中不可靠）
 * @param {object} [options]
 * @param {string} [options.cachedSrc] 当前 assetId 已绑定的 src，换图时需先 release
 * @returns {Promise<boolean>}
 */
function loadSceneTextureAsset(scene, assetId, src, options) {
  const opts = options || {}
  const cachedSrc = opts.cachedSrc || ''

  if (!scene || !scene.assets || !src) {
    return Promise.resolve(false)
  }

  if (cachedSrc === src) {
    return waitSceneTextureAssetReady(scene, assetId)
  }

  if (cachedSrc && cachedSrc !== src && scene.assets.releaseAsset) {
    try {
      scene.assets.releaseAsset('texture', assetId)
    } catch (e) {}
  }

  if (!scene.assets.loadAsset) {
    return waitSceneTextureAssetReady(scene, assetId)
  }

  let ret
  try {
    ret = scene.assets.loadAsset({
      type: 'texture',
      assetId: assetId,
      src: src
    })
  } catch (err) {
    if (isAssetAlreadyLoadedError(err)) {
      return waitSceneTextureAssetReady(scene, assetId)
    }
    return Promise.reject(err)
  }

  return resolveLoadAssetResult(ret).then(function () {
    return isTextureAssetReady(scene, assetId)
  }).catch(function (err) {
    if (isAssetAlreadyLoadedError(err)) {
      return isTextureAssetReady(scene, assetId)
    }
    throw err
  })
}

function isAssetAlreadyLoadedError(err) {
  const msg = err && (err.message || err.errMsg || String(err))
  return msg.indexOf('already been loaded') >= 0
}

function getShellNodeName(shellKey) {
  return SHELL_MESH_NAMES[shellKey] || shellKey
}

function getShellPrimitives(gltf, shellKey) {
  if (!gltf) return []
  const names = shellKey === 'top'
    ? TOP_NAME_CANDIDATES
    : [getShellNodeName(shellKey)]

  for (let i = 0; i < names.length; i++) {
    let list = []
    if (gltf.getPrimitivesByNodeName) {
      list = gltf.getPrimitivesByNodeName(names[i]) || []
    }
    if ((!list || !list.length) && gltf.getPrimitivesByMeshName) {
      list = flattenMeshList(gltf.getPrimitivesByMeshName(names[i]) || [])
    }
    if (list && list.length) return list
  }

  if (shellKey !== 'top' || !gltf.meshes) return []
  return gltf.meshes.filter(function (mesh) {
    const name = String((mesh && mesh.name) || '').toLowerCase()
    return name.indexOf('shell') >= 0 && name.indexOf('top') >= 0
  })
}

function setPrimitiveVisible(mesh, visible) {
  if (!mesh) return
  if (typeof mesh.setData === 'function') {
    mesh.setData({ visible: !!visible })
  }
  if (mesh.visible !== undefined) mesh.visible = !!visible
  if (mesh.el && mesh.el.visible !== undefined) mesh.el.visible = !!visible
}

function setShellNodeVisible(gltf, shellKey, visible) {
  if (!gltf) return false
  const meshes = getShellPrimitives(gltf, shellKey)
  if (!meshes.length) return false
  meshes.forEach(function (mesh) {
    setPrimitiveVisible(mesh, visible)
  })
  return true
}

function configureShellMaterial(mesh) {
  if (!mesh || !mesh.material) return
  if (mesh.material.setVector) {
    try {
      mesh.material.setVector('u_baseColorFactor', '1 1 1 1')
    } catch (e) {}
  }
  if (mesh.material.setRenderState) {
    try {
      mesh.material.setRenderState('cullOn', false)
      mesh.material.setRenderState('alphaMode', 'BLEND')
      mesh.material.setRenderState('depthTestWrite', false)
      mesh.material.setRenderState('renderQueue', 3000)
    } catch (e) {}
  }
}

function applyTextureToShell(gltf, shellKey, scene, textureAssetId) {
  if (!scene || !textureAssetId) return false
  if (!isTextureAssetReady(scene, textureAssetId)) return false

  const tex = getTextureForMaterial(scene, textureAssetId)
  if (!tex) return false

  const meshes = getShellPrimitives(gltf, shellKey)
  if (!meshes.length) return false

  let applied = false
  meshes.forEach(function (mesh) {
    if (!mesh || !mesh.material || !mesh.material.setTexture) return
    try {
      mesh.material.setTexture('u_baseColorMap', tex)
      configureShellMaterial(mesh)
      applied = true
    } catch (e) {
      console.warn('[avatar-xr] setTexture failed', e)
    }
  })
  return applied
}

module.exports = {
  SHELL_TOP_TEX_ID,
  normalizeTextureValue,
  getSceneTextureAsset,
  isTextureAssetReady,
  loadSceneTextureAsset,
  getShellPrimitives,
  setShellNodeVisible,
  applyTextureToShell
}
