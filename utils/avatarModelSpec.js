/**
 * v2 人模 GLB 制作规范（与 docs/试穿3D-v2-shell方案.md 一致）
 * Blender 内坐标；导出 glTF 时勾选 +Y Up，xr-frame 场景为 Y-up。
 */
const AVATAR_MODEL_SPEC = {
  units: 'm',
  heightMin: 1.7,
  heightMax: 1.8,
  /** 头脚中点，Apply 全部变换后 world 原点 */
  origin: 'geometric_center',
  /** Blender 场景：Z 向上 */
  upAxis: 'Z',
  /** Blender 场景：正面朝向 -Y（与 Blender 默认 Front 视图一致） */
  faceAxis: '-Y',
  pose: 'A-pose',
  animation: false
}

/** GLB 内 mesh 命名（试验阶段仅 shell_top） */
const SHELL_MESH_NAMES = {
  body: 'body',
  top: 'shell_top',
  bottom: 'shell_bottom',
  suit: 'shell_suit',
  inner: 'shell_inner',
  shoes: 'shell_shoes'
}

/** 上衣 UV / PNG 宽高比（来自 clothingPositions SLOTS.top） */
const TOP_UV_ASPECT = 0.92 / 0.40
/** avatar-xr 默认上衣展示：shell | overlay */
const DEFAULT_TOP_DISPLAY_MODE = 'shell'

module.exports = {
  AVATAR_MODEL_SPEC,
  SHELL_MESH_NAMES,
  TOP_UV_ASPECT,
  DEFAULT_TOP_DISPLAY_MODE
}
