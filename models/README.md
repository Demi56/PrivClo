# 3D 模型文件

请将经 **xr-frame-toolkit** 预处理的人模 GLB 放入云存储或本地目录。

## 文件要求

- **格式**：`.glb`（单文件，**禁用 Draco 压缩**）
- **命名**：
  - `avatar-female.glb`：女生人模
  - `avatar-male.glb`：男生人模

## 部署方式（推荐 CDN）

1. 用 [xr-frame-toolkit](https://developers.weixin.qq.com/miniprogram/dev/component/xr-frame/tools/toolkit.html) 做 GLTF 优化
2. 上传至云存储 `models/` 目录（与 `config/cdn.js` 中 `CDN_ROOT` 一致）
3. 在微信公众平台配置 **downloadFile 合法域名**（含 CDN 域名）
4. 真机调试基础库 **≥ 2.32.0**

本地开发可放入项目 `models/` 目录，并将 `config/cdn.js` 的 `USE_CDN` 设为 `false`。

## 试穿集成

- 3D 试穿组件：`components/tryon-xr/`
- 挂点配置：`utils/tryon3dAnchors.js`
- 试穿页默认 3D，失败或未支持时自动降级 2D Canvas

详见 `docs/试穿3D方案.md`。
