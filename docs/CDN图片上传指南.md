# CDN 图片上传指南

已将主包图片改为支持 CDN 网络地址。按以下步骤完成配置后，可大幅减小主包体积。

## 一、上传图片到云存储

### 方案 A：微信云开发（推荐，与小程序同生态）

1. **开通云开发**
   - 微信开发者工具 → 云开发 → 开通
   - 创建环境（如 `privclo-prod`）

2. **上传 images 目录**
   - 云开发控制台 → 云存储 → 上传文件
   - 将本地 `images/` 目录下所有文件上传到云存储
   - 建议路径：`images/role/avatar-female.png`、`images/model/model-female.png` 等，保持与本地目录结构一致

3. **获取 CDN 域名**
   - 云存储 → 设置 → 获取默认 CDN 域名（如 `https://xxx.tcb.qcloud.la`）
   - 或自定义域名

### 方案 B：腾讯云 COS / 阿里云 OSS / 七牛云

1. 创建存储桶（Bucket）
2. 将 `images/` 目录上传，保持目录结构
3. 开启 CDN 加速，获取访问域名
4. 确保文件可公开读取（或配置鉴权）

### 方案 C：自有服务器 / 静态托管

将 `images/` 部署到可公网访问的静态资源服务器，确保路径与本地一致。

---

## 二、配置 CDN 地址

编辑 `config/cdn.js`：

```javascript
const USE_CDN = true
const CDN_BASE = 'https://你的CDN域名/privclo/images/'  // 末尾带 /，且包含 images
```

**路径说明**：`CDN_BASE` 后直接拼接相对路径，例如：
- `role/avatar-female.png` → `https://xxx/privclo/images/role/avatar-female.png`
- `model/model-female.png` → `https://xxx/privclo/images/model/model-female.png`

---

## 三、配置微信小程序 downloadFile 域名（必做）

1. 登录 [微信公众平台](https://mp.weixin.qq.com)
2. 开发管理 → 开发设置 → 服务器域名
3. 在 **downloadFile 合法域名** 中点击「修改」
4. 添加域名：`https://636c-cloud1-0g2w40mm2e9e5623-1404894323.tcb.qcloud.la`（或仅 `636c-cloud1-0g2w40mm2e9e5623-1404894323.tcb.qcloud.la`，按平台要求填写）
5. 保存并等待生效（通常几分钟内）

---

## 四、排除主包 images 目录（可选）

**启用 CDN 并确认图片可正常访问后**，可在 `project.config.json` 的 `packOptions.ignore` 中添加：

```json
{ "type": "folder", "value": "images" }
```

这样主包将不再包含 `images/` 目录，可显著减小主包体积。**注意**：添加前请确保 CDN 已配置且可访问，否则图片将无法加载。

---

## 五、积分商城 points-store 图片（404 时必做）

若积分商城图片报 404，需将 `points-store` 目录上传到云存储：

1. **云存储路径**：`images/points-store/`（与 CDN_BASE 对应）
2. **目录结构**：
   - `images/points-store/skin/1.png` ~ `8.png`
   - `images/points-store/sticker/1.png`、`2.png`
   - `images/points-store/theme/1.png`、`2.png`
   - `images/points-store/capacity/1.png`
   - `images/points-store/role/1.png` ~ `6.png`
   - `images/points-store/bg/1.jpeg` ~ `10.jpeg`

3. **若上传到根目录**：将 `points-store` 直接放在云存储根目录时，在 `config/cdn.js` 中设置：
   ```javascript
   const CDN_POINTS_STORE_BASE = 'https://636c-cloud1-0g2w40mm2e9e5623-1404894323.tcb.qcloud.la/'
   ```

---

## 六、验证

1. 将 `config/cdn.js` 中 `USE_CDN` 设为 `true`，`CDN_BASE` 填为实际域名
2. 重新编译并预览
3. 检查各页面图片是否正常加载
4. 在微信开发者工具中查看主包大小是否明显减小

---

## 七、回退到本地图片

如需恢复使用本地图片，将 `config/cdn.js` 中 `USE_CDN` 设为 `false`，并移除 `project.config.json` 中 `images` 的 ignore 配置。
