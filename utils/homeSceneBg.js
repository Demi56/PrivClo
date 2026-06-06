const { getImageUrl } = require('../config/cdn.js')

const INDOOR_SCENE_STORAGE_KEY = 'privclo_indoor_scene_id'
const OUTDOOR_SCENE_STORAGE_KEY = 'privclo_outdoor_scene_id'
const DEFAULT_INDOOR_SCENE_ID = 'indoor-3'
const DEFAULT_OUTDOOR_SCENE_ID = 'outdoor-2'

const SCENE_DEFINITIONS = [
  { id: 'indoor-3', type: 'indoor', name: '卡通客厅', file: 'bg/3.jpeg' },
  { id: 'indoor-5', type: 'indoor', name: '线条客厅', file: 'bg/5.jpeg' },
  { id: 'outdoor-1', type: 'outdoor', name: '城市建筑', file: 'bg/1.jpeg' },
  { id: 'outdoor-2', type: 'outdoor', name: '公园小路', file: 'bg/2.jpeg' },
  { id: 'outdoor-4', type: 'outdoor', name: '深秋公园', file: 'bg/4.jpeg' },
  { id: 'outdoor-6', type: 'outdoor', name: '夕阳公园', file: 'bg/6.jpeg' },
  { id: 'outdoor-7', type: 'outdoor', name: '抽象海滩', file: 'bg/7.jpeg' },
  { id: 'outdoor-8', type: 'outdoor', name: '森之光', file: 'bg/8.jpeg' },
  { id: 'outdoor-9', type: 'outdoor', name: '卡通森林', file: 'bg/9.jpeg' },
  { id: 'outdoor-10', type: 'outdoor', name: '静谧沙滩', file: 'bg/10.jpeg' }
]

function toSceneItem(def) {
  if (!def) return null
  return {
    id: def.id,
    name: def.name,
    image: getImageUrl('/images/points-store/' + def.file)
  }
}

function getSceneList(type) {
  return SCENE_DEFINITIONS
    .filter(function (item) { return item.type === type })
    .map(toSceneItem)
}

function getSceneById(id) {
  const def = SCENE_DEFINITIONS.find(function (item) { return item.id === id })
  return toSceneItem(def)
}

function getDefaultSceneId(type) {
  return type === 'indoor' ? DEFAULT_INDOOR_SCENE_ID : DEFAULT_OUTDOOR_SCENE_ID
}

function getStorageKey(type) {
  return type === 'indoor' ? INDOOR_SCENE_STORAGE_KEY : OUTDOOR_SCENE_STORAGE_KEY
}

function loadSceneId(type) {
  const fallback = getDefaultSceneId(type)
  try {
    const saved = wx.getStorageSync(getStorageKey(type))
    if (saved && getSceneById(saved)) return saved
  } catch (e) {}
  return fallback
}

function saveSceneId(type, id) {
  try {
    wx.setStorageSync(getStorageKey(type), id)
  } catch (e) {}
}

function resolveScene(type, id) {
  return getSceneById(id) || getSceneById(getDefaultSceneId(type))
}

module.exports = {
  INDOOR_SCENE_STORAGE_KEY,
  OUTDOOR_SCENE_STORAGE_KEY,
  getSceneList,
  getSceneById,
  getDefaultSceneId,
  loadSceneId,
  saveSceneId,
  resolveScene
}
