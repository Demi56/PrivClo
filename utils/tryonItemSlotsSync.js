/**
 * 首页与衣橱「实时试穿」区共用的单品格同步（globalData.tryonItemSlots）
 */
const DEFAULT_MIN_SLOTS = 6

function normalizeTryonItemSlots(slots, minSlots) {
  const minLen = typeof minSlots === 'number' ? minSlots : DEFAULT_MIN_SLOTS
  const list = Array.isArray(slots) ? slots.slice() : []
  const filled = list.filter(function (s) { return !!s })
  const length = Math.max(minLen, filled.length)
  return filled.concat(Array(Math.max(0, length - filled.length)).fill(''))
}

function getFilledItems(slots) {
  return (Array.isArray(slots) ? slots : []).filter(function (s) { return !!s })
}

function getTryonItemSlotsFromApp(app) {
  app = app || getApp()
  if (!app.globalData) app.globalData = {}
  const normalized = normalizeTryonItemSlots(app.globalData.tryonItemSlots)
  app.globalData.tryonItemSlots = normalized
  return normalized.slice()
}

function setTryonItemSlotsToApp(slots, app) {
  app = app || getApp()
  if (!app.globalData) app.globalData = {}
  const normalized = normalizeTryonItemSlots(slots)
  app.globalData.tryonItemSlots = normalized
  app.globalData.tryonItemSlotsRevision = (app.globalData.tryonItemSlotsRevision || 0) + 1
  return normalized.slice()
}

function addTryonItemSrc(slots, src) {
  if (!src) return normalizeTryonItemSlots(slots)
  const next = normalizeTryonItemSlots(slots).slice()
  const emptyIdx = next.findIndex(function (s) { return !s })
  if (emptyIdx >= 0) next[emptyIdx] = src
  else next.push(src)
  return normalizeTryonItemSlots(next)
}

function removeTryonItemAt(slots, index) {
  const next = normalizeTryonItemSlots(slots).slice()
  if (index < 0 || index >= next.length) {
    return { slots: normalizeTryonItemSlots(next), removedSrc: '' }
  }
  const removedSrc = next[index] || ''
  next[index] = ''
  return { slots: normalizeTryonItemSlots(next), removedSrc: removedSrc }
}

function removeTryonItemBySrc(slots, src) {
  if (!src) return { slots: normalizeTryonItemSlots(slots), removed: false, removedSrc: '' }
  const next = normalizeTryonItemSlots(slots).slice()
  const idx = next.indexOf(src)
  if (idx < 0) return { slots: next, removed: false, removedSrc: '' }
  next[idx] = ''
  return {
    slots: normalizeTryonItemSlots(next),
    removed: true,
    removedSrc: src
  }
}

module.exports = {
  DEFAULT_MIN_SLOTS,
  normalizeTryonItemSlots,
  getFilledItems,
  getTryonItemSlotsFromApp,
  setTryonItemSlotsToApp,
  addTryonItemSrc,
  removeTryonItemAt,
  removeTryonItemBySrc
}
