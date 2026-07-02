/**
 * 经纬度格式化与和风 Geo 结果解析（云函数副本）
 */

function formatCoordLocation(lat, lng) {
  const la = Number(lat)
  const ln = Number(lng)
  if (!Number.isFinite(la) || !Number.isFinite(ln)) return ''
  return ln.toFixed(4) + ',' + la.toFixed(4)
}

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

function parseCoordPair(location) {
  if (!location || typeof location !== 'string') return null
  const parts = location.split(',')
  if (parts.length !== 2) return null
  const lng = Number(parts[0])
  const lat = Number(parts[1])
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null
  return { lat, lng }
}

module.exports = {
  formatCoordLocation,
  resolveCityDisplayName,
  pickBestGeoLocation,
  parseCoordPair
}
