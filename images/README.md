# 图片资源说明

## 精灵图

### 首页右上角 + 聊天头像（`config/sprite.js`）

- 云存储：`SPRITE_CLOUD_FILE_ID` → `images/sprite.webp`
- CDN 回退：`/images/sprite.webp`

### 加载过渡页（独立，不随首页变动）

- 路径：`/images/loading-sprite.png`（与首页 `sprite.webp` 分离）
- 配置项：`LOADING_SPRITE_IMAGE_PATH`
