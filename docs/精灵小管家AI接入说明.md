# 精灵小管家 AI 接入说明（云开发 AI 扩展 + 混元）

精灵小管家已接入 **云开发 AI 扩展**，通过 `chatWithAssistant` 云函数调用 **腾讯混元大模型**，使用微信小程序成长计划 1 亿 Token 免费额度。

## 一、架构概览

| 模块 | 说明 |
|------|------|
| `cloudfunctions/chatWithAssistant` | 云函数，使用 @cloudbase/node-sdk 的 AI 能力调用混元 |
| `components/chat-assistant` | 可折叠聊天组件，点击头像展开/收起 |
| `pages/model/model` | 首页，集成 chat-assistant 并传递天气、衣橱、风格数据 |

## 二、云函数 chatWithAssistant

### 2.1 依赖

- `@cloudbase/node-sdk` ^3.16.0
- `wx-server-sdk` ~2.6.3

### 2.2 部署步骤

1. 进入 `cloudfunctions/chatWithAssistant` 目录
2. 执行 `npm install`
3. 在微信开发者工具中右键 `chatWithAssistant` → 「上传并部署：云端安装依赖」

### 2.3 环境变量

| 变量名 | 说明 |
|--------|------|
| `TCB_ENV` / `ENV_ID` | 云开发环境 ID（通常自动注入，一般无需配置） |
| `HUNYUAN_API_KEY` | **403 时必配**：混元 API Key，作为云开发 AI 失败时的 HTTP 回退。获取：[腾讯混元控制台](https://console.cloud.tencent.com/hunyuan/start) |

**403 错误处理**：云函数会优先使用云开发 AI 扩展。若返回 403，将自动回退到 HTTP 调用；此时需在云开发控制台为 `chatWithAssistant` 配置 `HUNYUAN_API_KEY`。

### 2.4 性别差异化推荐

系统提示词根据用户角色差异化推荐：

| 角色 | 推荐特点 | 话术风格 |
|------|----------|----------|
| 女士/女童 | 款式多样、颜色搭配、流行元素；裙装、高跟鞋等 | 温柔细腻 ✨🌸 |
| 男士/男童 | 简约大方、实用百搭、质感；衬衫、休闲裤、运动鞋 | 简洁干练 💪 |
| 老年男性/老年女性 | 舒适度、保暖性、穿脱方便；宽松版型、柔软面料 | 温暖关怀 |

### 2.5 风格偏好个性化推荐

根据用户注册/设置时选择的穿搭风格进行个性化推荐，支持多风格组合：

| 风格 | 推荐单品 | 话术特点 |
|------|----------|----------|
| 日常休闲风 | T恤、牛仔裤、运动鞋 | 轻松随意 😊✨ |
| 法式风 | 条纹衫、高腰裤、丝巾 | 浪漫有格调 🥖✨ |
| 商务职场风 | 衬衫、西裤、皮鞋、西装 | 专业干练 |
| 运动风 | 运动服、跑鞋、卫衣 | 活力满满 ⚡💪 |
| 极简风 | 黑白灰、纯色、简洁剪裁 | 简约高级 |
| 复古风 | 喇叭裤、格纹、老爹鞋 | 怀旧有腔调 📻🎞️ |
| 街头潮酷 | 卫衣、板鞋、棒球帽 | 酷飒有态度 🔥😎 |
| 新中式 | 改良汉服、盘扣、刺绣 | 雅致有韵味 🎋🍃 |
| 汉服/JK/洛丽塔 | 对应圈层专业单品 | 懂圈层术语 👘🎀 |

风格数据来源：注册页 preference 保存至 `privclo_style_preference`；角色设置 model-profile 保存至 `modelProfile_${gender}.selectedStyles`。可在 `config.js` 中修改 `STYLE_PROMPTS`。

## 三、chat-assistant 组件

### 3.1 功能

- 可折叠：点击头像展开/收起聊天窗口
- 消息列表：展示对话记录
- 输入框 + 发送按钮
- 滚动到底部：`scroll-into-view` 自动滚动到最新消息
- 正在输入：显示「正在输入...」状态

### 3.2 使用方式

```html
<chat-assistant
  avatarUrl="{{spriteUrl}}"
  weather="{{chatWeather}}"
  wardrobe="{{chatWardrobe}}"
  profile="{{chatProfile}}"
/>
```

### 3.3 属性说明

| 属性 | 类型 | 说明 |
|------|------|------|
| avatarUrl | String | 折叠态头像 URL |
| weather | Object | `{ city, temp, weather }` 天气数据 |
| wardrobe | Object | 衣橱数据 `{ 'tops:sweater': [{ src }], ... }` |
| profile | Object | 用户风格偏好 `{ nickname, height, weight, selectedStyles, age, ... }` |
| gender | String | 性别 `'female'` / `'male'`，用于差异化推荐 |
| roleType | String | 角色类型（可选）`'male-child'` / `'female-child'` / `'elder-male'` / `'elder-female'` |
| age | Number | 年龄（可选） |

## 四、首页集成

在 `pages/model/model` 中：

1. 引入组件：`model.json` 中配置 `chat-assistant`
2. 传递数据：`chatWeather`、`chatWardrobe`、`chatProfile` 由 `updateChatContext()` 维护
3. 数据来源：
   - 天气：`city`、`temp`、`weather`（来自天气胶囊 / getWeather）
   - 衣橱：`app.getUserWardrobeItems()`
   - 风格：`app.getRoleProfile(gender)`

## 五、使用方式

1. 打开首页（model 页）
2. 点击右上角精灵头像，展开聊天窗口
3. 输入问题（如「今天穿什么？」），发送
4. 精灵会根据当前天气、衣橱和角色信息给出穿搭建议
5. 再次点击头像或遮罩可收起聊天窗口

## 六、成长计划免费额度

若已通过微信小程序成长计划领取混元 1 亿 Token 免费额度：

- 云开发 AI 扩展会使用该额度
- 可在 [云开发控制台 - AI 模块](https://tcb.cloud.tencent.com/dev#/ai) 查看用量

## 七、备选方案（HTTP API）

若云开发 AI 扩展不可用，可继续使用原有 `ai-chat` 云函数（HTTP 调用混元 API）：

- 需在云函数环境变量中配置 `HUNYUAN_API_KEY`
- 获取 Key：[腾讯混元控制台](https://console.cloud.tencent.com/hunyuan/start)
