# 3D 模型文件（v2）

人模与试穿壳网格放在同一 GLB 中。完整制作与试验流程见：

**[docs/试穿3D-v2-shell方案.md](../docs/试穿3D-v2-shell方案.md)**

## 新模型规范（已定）

| 项 | 要求 |
|------|------|
| 单位 | 米（Metric），Unit Scale = 1.0 |
| 身高 | **1.70 ~ 1.80 m** |
| 原点 | **几何中心**（头脚中点） |
| 朝向（Blender） | **Z 向上**，**脸朝 -Y** |
| 姿态 | **A-pose**，无动画 |
| 格式 | `.glb` 单文件，**无 Draco** |
| 命名 | `avatar-female.glb` / `avatar-male.glb` |

## GLB 内节点命名（试验阶段）

```
body          # 光身人模
shell_top     # 上衣壳（Shrinkwrap + 标准 UV）
```

## 部署

1. Blender 导出（**+Y Up**）→ [xr-frame-toolkit](https://developers.weixin.qq.com/miniprogram/dev/component/xr-frame/tools/toolkit.html) 优化  
2. [gltf.report](https://gltf.report/) 确认节点与朝向  
3. 上传云存储 `models/`（试验：`avatar-test.glb`，见 `getAvatarTestModelUrl()`）  
4. downloadFile 合法域名含 CDN；基础库 ≥ 2.32.0，真机调试  

**小程序默认**：`avatar-xr` 使用 **shell 模式**（`shell_top` 换贴图）。UV 重做完成前可临时设 `topDisplayMode="overlay"`。

代码常量见 `utils/avatarModelSpec.js`。

## 作废说明

v1 平面挂点方案（`tryon3dAnchors.js`）已废弃。
