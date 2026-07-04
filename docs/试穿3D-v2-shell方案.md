# 3D 试穿 v2：体表壳网格 + 标准 UV + 动态 PNG

> **状态**：**shell 模式**（`avatar-xr` 默认 `topDisplayMode="shell"`）  
> **资产要求**：`shell_top` Shrinkwrap + UV **2.3:1**，与衣橱 PNG 对齐（见第三节）  
> **兜底**：平面挂图 `topDisplayMode="overlay"`（调试/UV 未完成时）

---

## 一、整体架构

```
衣橱抠图 PNG（srcFront / srcBack）
        ↓
globalData.tryonInitialOutfit.top
        ↓
首页 avatar-xr v2（待接入）
        ↓
GLB 内 shell_top 网格 ← 动态替换 u_baseColorMap
        ↓
与 body 同场景旋转（**竖直轴**，导出后一般为 Y 轴）
```

| 层级 | 内容 |
|------|------|
| `body` | 光身人模（凹凸表面） |
| `shell_top` | 上衣壳网格（Shrinkwrap 贴合躯干，独立 UV） |
| 后续扩展 | `shell_bottom`、`shell_shoes`、`shell_suit`、`shell_inner` |

---

## 二、人模（body）规范（导出前必查）

与 v1 旧 bbox 无关，统一按**米制标准场景**制作。

### 2.1 当前新模型参数（已定）

| 项 | 要求 |
|------|------|
| 单位 | **米（Metric）**，Unit Scale = 1.0 |
| 身高 | **1.70 ~ 1.80 m** |
| 原点 | **几何中心**（头脚中点），`Ctrl+A` Apply 全部变换 |
| 朝向（Blender） | **Z 向上**，**脸朝 -Y**（与 Blender 默认 Front 视图一致） |
| 姿态 | **A-pose**，**无动画** |
| 格式 | `.glb` 单文件，**无 Draco** |
| 命名 | `avatar-female.glb` / `avatar-male.glb` |

### 2.2 Blender 坐标示意

```
        +Z（头顶方向）
         ↑
         │
         │   脸 → -Y（朝屏幕外/Front 视图方向）
         │
    ─────●───── +X
      几何中心
```

几何中心在原点时，约：

- 头顶 **Z ≈ +0.85 ~ +0.90 m**
- 脚底 **Z ≈ -0.85 ~ -0.90 m**
- 左右沿 **X**，前后沿 **Y**

### 2.3 导出到 glTF / xr-frame 的轴向

Blender 内为 **Z-up、脸 -Y**；导出 glTF 时勾选 **+Y Up**（xr-frame 使用 Y-up）：

| Blender | 导出后 glTF / xr-frame（常见映射） |
|---------|-----------------------------------|
| Z 向上 | **Y 向上** |
| 脸朝 -Y | 通常变为 **脸朝 +Z**（面向相机） |

导出后请在 [gltf.report](https://gltf.report/) 确认：人模站立、正面朝向合理。  
v2 组件 `avatarFrame.js` 将按**导出后的 GLB** 校准相机与旋转轴（**绕竖直轴旋转**）。

### 2.4 shell 制作注意

- **shell_top 必须在 A-pose 定稿后制作**（与 body 同姿态 Shrinkwrap）  
- A-pose 手臂略张开，壳需包住肩、腋下外侧，避免抬臂/旋转穿模  

---

## 三、试验阶段：只做 `shell_top`

### 3.1 壳网格是什么

- 一层**薄网格**，沿 `body` 表面形变（不是平面 Empty）
- 有**独立 UV**（整片展平为矩形）
- 小程序只换这张壳上的**贴图**，不换 mesh

### 3.2 Blender 操作流程（`shell_top`）

#### 步骤 1：复制躯干区域

1. 进入 `body` 的 Edit Mode  
2. 选中覆盖 **肩 → 腰** 的正面+侧面区域（先不必选背面）  
3. `Shift+D` 复制 → `P` Separate → Selection  
4. 新对象重命名为 **`shell_top`**

#### 步骤 2：Shrinkwrap 贴合

1. 选中 `shell_top`，添加 **Shrinkwrap** 修饰器  
   - Target：`body`  
   - Mode：**Nearest Surface Point**（或 Project，视模型而定）  
   - Offset：**0.008 ~ 0.015 m**（8~15 mm，防与身体 z-fighting）  
2. 视需要加 **Subdivision Surface**（Level 1~2）再 Shrinkwrap，让壳更顺  
3. `Ctrl+A` → Apply 修饰器（导出前必须 Apply）

#### 步骤 3：标准 UV（与 2D 槽位对齐）

上衣槽位比例见 `utils/clothingPositions.js`：

| 性别 | 槽位 | 归一化 w×h | 宽高比 |
|------|------|------------|--------|
| female | top | 0.92 × 0.40 | **2.30 : 1** |
| male | top | 0.92 × 0.40 | **2.30 : 1** |

UV 操作：

1. `shell_top` → Edit Mode → 全选  
2. U → **Smart UV Project**（或 Mark Seam 后 Unwrap）  
3. 在 UV Editor 中把 island **整幅放进 [0,1]×[0,1]**  
4. 调整 island 形状，使 **UV 宽高比 ≈ 2.3 : 1**（与衣橱上衣 PNG 一致）  
5. 确认：**PNG 顶部 = UV 的 V 大的一端**（与 2D 试穿「头在上」一致）

> 衣橱录入的上衣抠图，建议按 **宽:高 = 23:10** 裁剪或留透明边，与 UV 模板一致。

#### 步骤 4：背面（试验期二选一）

| 方案 | 做法 | 试验期建议 |
|------|------|------------|
| A | 再复制一份 `shell_top_back`，法线朝后，单独 UV | 要测旋转到背面时用 |
| B | 壳做稍厚 + 双面材质，背面贴 `srcBack` | 实现简单，先试 B |

试验阶段推荐 **方案 B**：壳稍加厚，正反面各一张 PNG。

#### 步骤 5：层级与命名

```
AvatarRoot          ← 可选空物体根
├── body
└── shell_top       ← 与 body 同级，或挂在 AvatarRoot 下
```

**必须遵守的命名**（代码按名查找）：

| Mesh 对象名 | 用途 |
|-------------|------|
| `body` | 光身 |
| `shell_top` | 上衣壳（试验） |

不要留名为 `Cube` 的调试物体（旧代码会隐藏该节点）。

#### 步骤 6：导出 GLB

**File → Export → glTF 2.0 (.glb)**

| 选项 | 设置 |
|------|------|
| Format | glTF Binary (.glb) |
| Include | 含 `body` + `shell_top` |
| Transform | +Y Up |
| Geometry | Apply Modifiers ✓ |
| Compression | **不勾选 Draco** |

导出后：

1. 用 [gltf.report](https://gltf.report/) 检查 Scene 树含 `shell_top`  
2. 确认 `shell_top` 带 **TEXCOORD_0**（UV）  
3. 用 [xr-frame-toolkit](https://developers.weixin.qq.com/miniprogram/dev/component/xr-frame/tools/toolkit.html) 优化（仍保持无 Draco）  
4. 上传至云存储 `models/avatar-female.glb`（或 male）

---

## 四、部署与小程序侧（试验）

### 4.1 上传

- 路径：`CDN_ROOT + 'models/avatar-female.glb'`（见 `config/cdn.js`）  
- 微信公众平台 → downloadFile 合法域名包含 CDN  
- 基础库 **≥ 2.32.0**，真机调试

### 4.2 数据流（已实现，无需改）

1. 衣橱分类页选上衣 → 写入 `tryonInitialOutfit.top`  
2. 点「实时试穿」→ `commitTryonToHome()` → `reLaunchMain` 回首页  
3. 首页 `onShow` → `homeTryonOutfit` → 传给 3D 组件

### 4.3 渲染逻辑（v2：`avatar-xr` + `avatar-test.glb`）

**默认 shell 模式**（`topDisplayMode="shell"`，可不传）：

```
加载 models/avatar-test.glb
  → 显示 body
  → 若 outfit.top 有图：
       shell_top 换 u_baseColorMap（脚本 loadAsset + setTexture）
  → 否则隐藏 shell_top
  → 绕竖直轴旋转
```

**平面挂图兜底**（仅 UV 未就绪时调试）：

```xml
<avatar-xr topDisplayMode="overlay" ... />
```

组件：`components/avatar-xr/`  
模型 URL：`config/cdn.js` → `getAvatarTestModelUrl()`  
UV 宽高比常量：`utils/avatarModelSpec.js` → `TOP_UV_ASPECT`（≈ **2.30**）

**不再使用**：`tryon-xr`、`tryon3dAnchors.js` 平面挂点（除 overlay 兜底外）。

---

## 五、验收清单（`shell_top` 试验）

### Blender / 资产

- [ ] `shell_top` 贴肩、胸、腰，无明显悬空或插入身体  
- [ ] Shrinkwrap Offset 合适（约 8~15 mm），无 z-fighting  
- [ ] UV island 宽高比 **≈ 2.3:1**（与 `TOP_UV_ASPECT` / 槽位 top 一致）  
- [ ] **PNG 顶部 = UV 的 V 大端**（Blender 里试贴一张带「↑」标记的测试图）  
- [ ] 领口/肩线/下摆与 UV 矩形四边大致对齐（避免只「染色」、看不出款式）  
- [ ] 脸朝 **-Y**（Blender）、**Z 向上**；导出 **+Y Up**  
- [ ] **A-pose**，与 body 同姿态制作 `shell_top`  
- [ ] 上传云存储后替换 `models/avatar-test.glb`，真机验证  

### 小程序真机

- [ ] GLB 加载成功，body 正常显示  
- [ ] 控制台：`[avatar-xr] shell texture ready` → `[avatar-xr] shell_top applied`  
- [ ] 衣橱选上衣 → 实时试穿 → 回首页，**款式**随 `shell_top` 曲面显示（非胸前纸板）  
- [ ] 贴图不严重拉伸、不整片「换色」  
- [ ] 手指旋转 360°，壳与 body 同步  
- [ ] 无 top 时 `shell_top` 隐藏    

### 常见问题

| 现象 | 处理 |
|------|------|
| 只变色、看不出款式 | **重做 shell_top UV**（2.3:1 + 标记图对齐）；勿用 overlay 当最终方案 |
| 贴图上下颠倒 | 调整 UV island V 方向或 Blender 试贴验证；shell 模式**不要**用 `flipImageForXr` |
| 贴图拉伸 | 改 UV island 宽高比或 PNG 裁剪为 23:10 |
| 与身体闪烁 | 增大 Shrinkwrap Offset |
| 侧面穿模 | 壳在侧缝加段数或略增大 Offset |
| 背面空白 | 接 `srcBack` 或加 `shell_top_back` |
| 找不到 mesh | 检查对象名是否 exactly `shell_top` |

---

## 六、后续扩展顺序

1. **shell_top** 试验通过  
2. `shell_bottom`（同上流程，槽位比 0.84:0.48）  
3. `shell_shoes`（0.76:0.18）  
4. `shell_suit`（隐藏 top+bottom）  
5. `shell_inner`  
6. 新建 `components/avatar-xr/`，替换首页 `tryon-xr`  
7. 删除 v1：`tryon-xr`、`tryon3dModelFrame.js`、`tryon3dAnchors.js`

---

## 七、槽位 UV 比例速查（扩展时用）

| 槽位 | female w×h | 宽高比 |
|------|------------|--------|
| inner | 0.76×0.26 | 2.92:1 |
| top | 0.92×0.40 | **2.30:1** |
| bottom | 0.84×0.48 | 1.75:1 |
| shoes | 0.76×0.18 | 4.22:1 |
| suit | 0.96×0.72 | 1.33:1 |

数据来源：`utils/clothingPositions.js` → `SLOTS`

---

## 八、相关文件

| 文件 | 说明 |
|------|------|
| `docs/试穿3D-v2-shell方案.md` | 本文（v2 主文档） |
| `docs/试穿3D方案.md` | v1 已作废，仅作历史参考 |
| `utils/clothingPositions.js` | 2D/UV 槽位比例 |
| `utils/tryonOutfitHelpers.js` | outfit 数据与 `commitTryonToHome` |
| `config/cdn.js` | `getModel3dUrl(gender)` |
| `utils/avatarModelSpec.js` | v2 人模与 shell 命名常量 |
| `models/README.md` | 模型部署说明 |
