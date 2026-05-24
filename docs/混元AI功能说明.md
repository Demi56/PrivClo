# 混元 AI 功能实施说明

## 一、方案分析与补漏

### 1.1 API 兼容性
- **混元视觉**：微信云开发 `cloud.extend.AI` 需开通多模态能力，模型名 `hunyuan-vision-1.5-thinking` 或 `hunyuan-vision`
- **混元图文**：`generateOutfitCard` 使用 `hunyuan-image`，若未开通则自动降级为「原图+文本」展示
- **混元大模型**：沿用现有 `chatWithAssistant` 的 `hunyuan` / `hunyuan-2.0-instruct` 配置

### 1.2 数据流
- **用户画像**：来自本地存储（`getUserGender`、`getStylePreference`、`getOutfitPreferences` 等），由前端汇总后传入云函数
- **衣橱数据**：`aggregateForRecommend()` 从 `getUserWardrobeItems()` 构建推荐用列表
- **天气**：复用 `cloudfunctions/weather`（和风天气）

### 1.3 补漏点
- 街拍分析：视觉模型需传入 `content` 数组 `[{ type: 'text' }, { type: 'image_url', image_url: { url } }]`
- 穿搭卡片：图像生成可选，失败时返回 `fallback: true`，前端展示原图 + 单品列表
- 日记保存：使用 `diary_pages` 的 `type: 'outfit_inspiration'` 扩展字段

---

## 二、已生成文件清单

### 云函数
| 文件 | 说明 |
|------|------|
| `cloudfunctions/analyzeOutfit/index.js` | 街拍分析：视觉模型识别衣物 |
| `cloudfunctions/analyzeOutfit/package.json` | 超时 30s，内存 256MB |
| `cloudfunctions/generateOutfitCard/index.js` | 穿搭卡片生成（可选，有降级） |
| `cloudfunctions/generateOutfitCard/package.json` | 超时 60s，内存 512MB |
| `cloudfunctions/smartRecommend/index.js` | 智能推荐：用户画像 + 天气 + 衣橱 |
| `cloudfunctions/smartRecommend/package.json` | 超时 30s，内存 256MB |
| `cloudfunctions/getUserProfile/index.js` | 用户画像结构化（客户端传参） |
| `cloudfunctions/getUserProfile/package.json` | 超时 10s，内存 128MB |

### 工具与组件
| 文件 | 说明 |
|------|------|
| `utils/userProfileBuilder.js` | 用户画像与衣橱数据构建 |
| `components/recommend-card/` | 推荐卡片展示组件 |

### 页面
| 文件 | 说明 |
|------|------|
| `pages/street-to-outfit/*` | 街拍转穿搭 |
| `pages/recommend/*` | 智能穿搭推荐 |

### 入口
- 我的页新增「街拍转穿搭」「智能推荐」双卡，点击进入对应页面

---

## 三、开通与配置

1. **云开发控制台**：确认已开通并部署上述云函数  
2. **AI 能力**：在微信小程序后台 → 云开发 → 扩展能力 中开通混元相关能力  
3. **天气**：确认 `cloudfunctions/weather/config.js` 中已配置和风天气密钥  
4. **深度合成**：若需正式发布，需提交深度合成服务类目备案  

---

## 四、实施优先级（对应需求）

| 阶段 | 功能 | 状态 |
|------|------|------|
| P0 | 智能推荐（用户画像+天气） | ✅ 已实现 |
| P0 | 街拍衣物识别 | ✅ 已实现 |
| P1 | 穿搭卡片生成 | ✅ 已实现（有降级） |
| P1 | 推荐话术个性化 | ✅ 已实现 |
| P2 | 多图融合 | 未实现，可后续扩展 |
