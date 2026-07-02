/**
 * 经纬度格式化与和风 Geo 结果解析（提升天气胶囊城市名精度）
 */

function formatCoordLocation(lat, lng) {
  const la = Number(lat)
  const ln = Number(lng)
  if (!Number.isFinite(la) || !Number.isFinite(ln)) return ''
  return ln.toFixed(4) + ',' + la.toFixed(4)
}

/**
 * 从和风 city/lookup 单条结果解析展示用城市名
 * 优先区/县级名称，避免县级市被误显示为上级地级市（如昆山→苏州）
 */
function resolveCityDisplayName(geoItem) {
  if (!geoItem || typeof geoItem !== 'object') return '未知'
  const name = String(geoItem.name || '').trim()
  const adm2 = String(geoItem.adm2 || '').trim()
  const adm1 = String(geoItem.adm1 || '').trim()

  if (!name) return adm2 || adm1 || '未知'
  if (adm2 && name !== adm2) return name
  return name || adm2 || adm1 || '未知'
}

function pickBestGeoLocation(locations, lat, lng) {
  if (!locations || !locations.length) return null
  if (locations.length === 1) return locations[0]
  if (!Number.isFinite(Number(lat)) || !Number.isFinite(Number(lng))) {
    return locations[0]
  }
  const targetLat = Number(lat)
  const targetLng = Number(lng)
  let best = locations[0]
  let bestDist = Infinity
  for (let i = 0; i < locations.length; i++) {
    const item = locations[i]
    const itemLat = Number(item.lat)
    const itemLng = Number(item.lon != null ? item.lon : item.lng)
    if (!Number.isFinite(itemLat) || !Number.isFinite(itemLng)) continue
    const dLat = itemLat - targetLat
    const dLng = itemLng - targetLng
    const dist = dLat * dLat + dLng * dLng
    if (dist < bestDist) {
      bestDist = dist
      best = item
    }
  }
  return best
}

module.exports = {
  formatCoordLocation,
  resolveCityDisplayName,
  pickBestGeoLocation
}
