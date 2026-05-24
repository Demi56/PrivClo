# 实时试穿模特底图

**当前默认（与云存储 `images/model/` 一致）**

- `fitting-female.webp` — 女性  
- `fitting-male.webp` — 男性  

路径由 `utils/clothingPositions.js` 的 `getModelImagePath` 定义。

**CDN**：`config/cdn.js` 中 `USE_CDN=true` 时，需把云存储文件上传到与 `CDN_BASE` 一致的 `images/model/` 下，并在微信公众平台配置 **downloadFile 合法域名**，否则网络图无法写入 Canvas。

**仅本地**：可将 `USE_CDN` 设为 `false`，使用上述本地 PNG 路径。
