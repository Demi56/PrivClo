function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value))
}

function normalizeHex(hex) {
  if (!hex || typeof hex !== 'string') return ''
  let value = hex.trim()
  if (value.charAt(0) !== '#') value = '#' + value
  if (value.length === 4) {
    value = '#' + value.charAt(1) + value.charAt(1) + value.charAt(2) + value.charAt(2) + value.charAt(3) + value.charAt(3)
  }
  return /^#[0-9a-fA-F]{6}$/.test(value) ? value.toLowerCase() : ''
}

function hexToRgb(hex) {
  const normalized = normalizeHex(hex)
  if (!normalized) return null
  return {
    r: parseInt(normalized.slice(1, 3), 16),
    g: parseInt(normalized.slice(3, 5), 16),
    b: parseInt(normalized.slice(5, 7), 16)
  }
}

function rgbToHex(r, g, b) {
  const toPart = function (n) {
    const part = clamp(Math.round(n), 0, 255).toString(16)
    return part.length === 1 ? '0' + part : part
  }
  return ('#' + toPart(r) + toPart(g) + toPart(b)).toLowerCase()
}

function rgbToHsv(r, g, b) {
  const rn = clamp(r, 0, 255) / 255
  const gn = clamp(g, 0, 255) / 255
  const bn = clamp(b, 0, 255) / 255
  const max = Math.max(rn, gn, bn)
  const min = Math.min(rn, gn, bn)
  const delta = max - min
  let h = 0
  if (delta !== 0) {
    if (max === rn) h = 60 * (((gn - bn) / delta) % 6)
    else if (max === gn) h = 60 * ((bn - rn) / delta + 2)
    else h = 60 * ((rn - gn) / delta + 4)
  }
  if (h < 0) h += 360
  const s = max === 0 ? 0 : (delta / max) * 100
  const v = max * 100
  return {
    h: Math.round(h),
    s: Math.round(s),
    v: Math.round(v)
  }
}

function hsvToRgb(h, s, v) {
  const hue = ((h % 360) + 360) % 360
  const sat = clamp(s, 0, 100) / 100
  const val = clamp(v, 0, 100) / 100
  const c = val * sat
  const x = c * (1 - Math.abs((hue / 60) % 2 - 1))
  const m = val - c
  let r = 0
  let g = 0
  let b = 0
  if (hue < 60) {
    r = c; g = x; b = 0
  } else if (hue < 120) {
    r = x; g = c; b = 0
  } else if (hue < 180) {
    r = 0; g = c; b = x
  } else if (hue < 240) {
    r = 0; g = x; b = c
  } else if (hue < 300) {
    r = x; g = 0; b = c
  } else {
    r = c; g = 0; b = x
  }
  return {
    r: Math.round((r + m) * 255),
    g: Math.round((g + m) * 255),
    b: Math.round((b + m) * 255)
  }
}

function hexToHsv(hex) {
  const rgb = hexToRgb(hex)
  if (!rgb) return { h: 0, s: 0, v: 100 }
  return rgbToHsv(rgb.r, rgb.g, rgb.b)
}

function hsvToHex(h, s, v) {
  const rgb = hsvToRgb(h, s, v)
  return rgbToHex(rgb.r, rgb.g, rgb.b)
}

function drawSvPanel(ctx, width, height, hue) {
  if (!ctx || !width || !height) return
  const pure = hsvToRgb(hue, 100, 100)
  const pureHex = rgbToHex(pure.r, pure.g, pure.b)
  ctx.clearRect(0, 0, width, height)
  const gradientH = ctx.createLinearGradient(0, 0, width, 0)
  gradientH.addColorStop(0, '#FFFFFF')
  gradientH.addColorStop(1, pureHex)
  ctx.fillStyle = gradientH
  ctx.fillRect(0, 0, width, height)
  const gradientV = ctx.createLinearGradient(0, 0, 0, height)
  gradientV.addColorStop(0, 'rgba(0, 0, 0, 0)')
  gradientV.addColorStop(1, 'rgba(0, 0, 0, 1)')
  ctx.fillStyle = gradientV
  ctx.fillRect(0, 0, width, height)
}

module.exports = {
  clamp,
  normalizeHex,
  hexToRgb,
  rgbToHex,
  rgbToHsv,
  hsvToRgb,
  hexToHsv,
  hsvToHex,
  drawSvPanel
}
