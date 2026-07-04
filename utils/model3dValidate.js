/**
 * 校验 GLB 是否可被 xr-frame 加载。
 * cloud:// 经 wx.cloud.downloadFile 转本地路径，无需 request 合法域名。
 */

var GLB_JSON_RANGE = 'bytes=0-81919'

function isCloudFileId(url) {
  return url && String(url).indexOf('cloud://') === 0
}

function isLocalModelPath(url) {
  if (!url) return false
  var s = String(url)
  return s.indexOf('wxfile://') === 0 || s.indexOf('http://tmp/') === 0 || s.indexOf('https://tmp/') === 0
}

function resolveModelSiblingUrl(modelUrl, relativeUri) {
  if (!relativeUri || typeof relativeUri !== 'string') return ''
  if (/^https?:\/\//i.test(relativeUri)) return relativeUri
  var base = String(modelUrl).replace(/[^/]+$/, '')
  return base + relativeUri
}

function parseGlbJsonFromArrayBuffer(buffer) {
  if (!buffer || buffer.byteLength < 24) throw new Error('glb_too_small')
  var view = new DataView(buffer)
  if (
    view.getUint8(0) !== 0x67 ||
    view.getUint8(1) !== 0x6c ||
    view.getUint8(2) !== 0x54 ||
    view.getUint8(3) !== 0x46
  ) {
    throw new Error('not_glb')
  }
  var jsonLen = view.getUint32(12, true)
  var jsonStart = 20
  if (jsonStart + jsonLen > buffer.byteLength) throw new Error('glb_json_truncated')
  var jsonBytes = new Uint8Array(buffer, jsonStart, jsonLen)
  var jsonStr = ''
  for (var i = 0; i < jsonBytes.length; i++) jsonStr += String.fromCharCode(jsonBytes[i])
  return JSON.parse(jsonStr)
}

function listExternalBufferUris(json) {
  var external = []
  ;(json.buffers || []).forEach(function (b) {
    if (b.uri && String(b.uri).indexOf('data:') !== 0) external.push(b.uri)
  })
  return external
}

function probeUrlExists(url) {
  return new Promise(function (resolve) {
    wx.request({
      url: url,
      method: 'HEAD',
      success: function (res) {
        if (res.statusCode === 200 || res.statusCode === 206) {
          resolve(true)
          return
        }
        wx.request({
          url: url,
          method: 'GET',
          header: { Range: 'bytes=0-0' },
          success: function (res2) {
            resolve(res2.statusCode === 200 || res2.statusCode === 206)
          },
          fail: function () {
            resolve(false)
          }
        })
      },
      fail: function () {
        wx.request({
          url: url,
          method: 'GET',
          header: { Range: 'bytes=0-0' },
          success: function (res) {
            resolve(res.statusCode === 200 || res.statusCode === 206)
          },
          fail: function () {
            resolve(false)
          }
        })
      }
    })
  })
}

function fetchGlbJsonFromHttp(modelUrl) {
  return new Promise(function (resolve, reject) {
    wx.request({
      url: modelUrl,
      method: 'GET',
      header: { Range: GLB_JSON_RANGE },
      responseType: 'arraybuffer',
      success: function (res) {
        if ((res.statusCode !== 200 && res.statusCode !== 206) || !res.data) {
          reject(new Error('http_' + res.statusCode))
          return
        }
        try {
          resolve(parseGlbJsonFromArrayBuffer(res.data))
        } catch (e) {
          reject(e)
        }
      },
      fail: reject
    })
  })
}

function fetchGlbJsonFromLocalPath(filePath) {
  return new Promise(function (resolve, reject) {
    wx.getFileSystemManager().readFile({
      filePath: filePath,
      position: 0,
      length: 81920,
      success: function (res) {
        try {
          resolve(parseGlbJsonFromArrayBuffer(res.data))
        } catch (e) {
          reject(e)
        }
      },
      fail: reject
    })
  })
}

function fetchGlbJson(modelUrl) {
  if (isLocalModelPath(modelUrl)) {
    return fetchGlbJsonFromLocalPath(modelUrl)
  }
  return fetchGlbJsonFromHttp(modelUrl)
}

function downloadCloudModel(fileId) {
  return new Promise(function (resolve, reject) {
    if (!wx.cloud || !wx.cloud.downloadFile) {
      reject(new Error('cloud_unavailable'))
      return
    }
    wx.cloud.downloadFile({
      fileID: fileId,
      success: function (res) {
        if (res && res.tempFilePath) {
          resolve(res.tempFilePath)
          return
        }
        reject(new Error('cloud_download_empty'))
      },
      fail: reject
    })
  })
}

/** 将 cloud:// / https 模型解析为 xr-frame 可用的本地或远程路径 */
function resolveModel3dForXr(modelUrl) {
  var url = String(modelUrl || '').trim()
  if (!url) {
    return Promise.resolve({ ok: false, reason: 'empty_model_url' })
  }
  if (isCloudFileId(url)) {
    return downloadCloudModel(url).then(function (localPath) {
      return { ok: true, xrSrc: localPath, source: url }
    }).catch(function (err) {
      console.warn('[model3dValidate] cloud download failed', err)
      return {
        ok: false,
        reason: 'cloud_download_failed',
        detail: err && err.errMsg ? err.errMsg : err,
        hint: '请确认云存储 models/avatar-test.glb 已上传，且小程序已 init 云开发环境'
      }
    })
  }
  return Promise.resolve({ ok: true, xrSrc: url, source: url })
}

function validateGlbJson(json, modelUrl) {
  var external = listExternalBufferUris(json)
  if (!external.length) return Promise.resolve({ ok: true })

  var uploadDir = String(modelUrl).replace(/[^/]+$/, '')
  var usesCompressedTextures = (json.extensionsUsed || []).indexOf('WX_compressed_textures') >= 0

  if (isLocalModelPath(modelUrl)) {
    return Promise.resolve({
      ok: false,
      reason: 'missing_companion_files',
      missing: external,
      uploadDir: uploadDir,
      usesCompressedTextures: usesCompressedTextures,
      hint: '本地 GLB 引用了外部 bin，请改为单文件 GLB 后重新上传'
    })
  }

  return probeUrlExists(resolveModelSiblingUrl(modelUrl, external[0])).then(function (firstOk) {
    if (firstOk) return { ok: true }
    return {
      ok: false,
      reason: 'missing_companion_files',
      missing: external,
      uploadDir: uploadDir,
      usesCompressedTextures: usesCompressedTextures,
      hint: usesCompressedTextures
        ? '请把 XR-FRAME-TOOLKIT 输出目录里的 avatar-*.glb 与全部 textures-*.bin 上传到云存储 models/；或关闭「压缩纹理」重新导出为单文件 GLB'
        : '请将 GLB 引用的外部 bin 文件与 .glb 一并上传到同一目录'
    }
  })
}

function validateModel3dUrl(modelUrl) {
  return fetchGlbJson(modelUrl).then(function (json) {
    return validateGlbJson(json, modelUrl)
  }).catch(function (err) {
    var msg = err && err.message ? err.message : String(err)
    var errMsg = err && err.errMsg ? String(err.errMsg) : ''
    if (msg.indexOf('http_') === 0) {
      if (/url not in domain list/i.test(errMsg)) {
        return { ok: true, warn: 'validate_domain_skipped', detail: errMsg }
      }
      return { ok: true, warn: 'validate_http_skipped', detail: msg }
    }
    if (msg === 'glb_json_truncated' || msg === 'not_glb' || msg === 'glb_too_small') {
      return { ok: false, reason: 'invalid_glb', detail: msg }
    }
    if (/url not in domain list/i.test(errMsg)) {
      return { ok: true, warn: 'validate_domain_skipped', detail: errMsg }
    }
    console.warn('[model3dValidate] validate skipped, xr-frame will try load', err)
    return { ok: true, warn: 'validate_network_skipped', detail: err }
  })
}

/** 云下载 + 校验，返回 xr-frame 使用的 src */
function prepareModel3dForXr(modelUrl) {
  return resolveModel3dForXr(modelUrl).then(function (resolved) {
    if (!resolved.ok || !resolved.xrSrc) return resolved
    return validateModel3dUrl(resolved.xrSrc).then(function (result) {
      if (!result.ok) {
        return {
          ok: false,
          reason: result.reason,
          missing: result.missing,
          uploadDir: result.uploadDir,
          usesCompressedTextures: result.usesCompressedTextures,
          hint: result.hint,
          detail: result.detail
        }
      }
      return {
        ok: true,
        xrSrc: resolved.xrSrc,
        source: resolved.source,
        warn: result.warn
      }
    })
  })
}

module.exports = {
  validateModel3dUrl,
  resolveModel3dForXr,
  prepareModel3dForXr,
  resolveModelSiblingUrl,
  listExternalBufferUris
}
