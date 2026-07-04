/**
 * 将 cloud:// 或本地路径解析为 xr-frame / Canvas 可加载的 https
 */
const { getImageUrl } = require('../config/cdn.js')

function normalizeTryonImageSrc(url) {
  const u = (url && String(url).trim()) || ''
  if (!u) return ''
  if (u.indexOf('cloud://') === 0) return u
  if (u.indexOf('http://') === 0 || u.indexOf('https://') === 0) return u
  if (u.indexOf('wxfile://') === 0) return u
  if (u.indexOf('/') === 0) return getImageUrl(u)
  return u
}

function resolveCloudUrl(url) {
  const u = normalizeTryonImageSrc(url)
  if (!u) return Promise.resolve('')
  if (u.indexOf('http://') === 0 || u.indexOf('https://') === 0) return Promise.resolve(u)
  if (u.indexOf('wxfile://') === 0) return Promise.resolve(u)
  if (u.indexOf('cloud://') !== 0) return Promise.resolve(u)
  if (!wx.cloud || !wx.cloud.getTempFileURL) return Promise.resolve('')
  return wx.cloud.getTempFileURL({ fileList: [u] })
    .then(res => {
      const list = (res && res.fileList) || []
      const hit = list.find(f => f.fileID === u)
      return (hit && hit.tempFileURL) ? hit.tempFileURL : ''
    })
    .catch(() => '')
}

function resolveCloudUrlMap(urls) {
  const list = Array.isArray(urls) ? urls.filter(Boolean) : []
  const unique = []
  list.forEach(u => {
    const s = normalizeTryonImageSrc(u)
    if (s && unique.indexOf(s) < 0) unique.push(s)
  })
  const cloudIds = unique.filter(u => u.indexOf('cloud://') === 0)
  const map = {}
  unique.forEach(u => {
    if (u.indexOf('cloud://') !== 0) map[u] = u
  })
  if (!cloudIds.length) return Promise.resolve(map)
  if (!wx.cloud || !wx.cloud.getTempFileURL) return Promise.resolve(map)
  return wx.cloud.getTempFileURL({ fileList: cloudIds })
    .then(res => {
      ;((res && res.fileList) || []).forEach(f => {
        if (f.fileID && f.tempFileURL) map[f.fileID] = f.tempFileURL
      })
      return map
    })
    .catch(() => map)
}

module.exports = {
  normalizeTryonImageSrc,
  resolveCloudUrl,
  resolveCloudUrlMap
}
