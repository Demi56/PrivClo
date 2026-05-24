# 天气 API 接入说明（云函数版）

小程序已通过**云函数**集成和风天气 API，云函数内生成 JWT 并调用和风天气，前端仅需调用云函数即可。

## 一、前置条件

1. **开通云开发**：在微信开发者工具中，点击「云开发」按钮开通云开发环境
2. **创建云环境**：若尚未创建，按提示创建环境并记录环境 ID

## 二、云函数配置

云函数 `cloudfunctions/weather` 已包含以下配置（`config.js`）：

| 配置项 | 值 |
|--------|-----|
| API Host | https://mv3md9t3ju.re.qweatherapi.com |
| 项目 ID | 2NKPCWYAPJ |
| 凭据 ID | T5H2XKPKE3 |
| JWT 有效期 | 15 分钟 |

私钥**必须**在云开发控制台 → 云函数 → weather → 配置 → 环境变量 中设置 `WEATHER_PRIVATE_KEY`（Ed25519 私钥完整内容，含 `-----BEGIN PRIVATE KEY-----` 和 `-----END PRIVATE KEY-----`）。

## 三、部署步骤

1. **安装依赖**：在 `cloudfunctions/weather` 目录下执行
   ```bash
   npm install
   ```

2. **上传云函数**：在微信开发者工具中，右键 `cloudfunctions/weather` → 「上传并部署：云端安装依赖」

3. **配置私钥**：云开发控制台 → 云函数 → weather → 配置 → 环境变量，新增 `WEATHER_PRIVATE_KEY`，值为 Ed25519 私钥完整内容

4. **验证**：在小程序中点击天气胶囊或切换城市，应能正常获取天气

## 四、云函数接口

**调用方式**：`wx.cloud.callFunction({ name: 'weather', data: { location, type } })`

**参数**：
- `location`：经纬度 `"116.41,39.92"` 或城市名 `"北京"`
- `type`：`"coords"`（经纬度）或 `"city"`（城市名），可省略（根据 location 自动判断）

**返回**：
```json
{
  "errMsg": "",
  "data": {
    "city": "北京",
    "temp": "12",
    "weather": "晴",
    "weatherIcon": "sun",
    "humidity": "45",
    "windSpeed": "8",
    "windDir": "西南风",
    "feelsLike": "10"
  }
}
```

## 五、故障排查

- **「请开通云开发」**：在开发者工具中开通云开发并创建环境
- **「获取天气失败」**：检查云函数是否上传成功，查看云函数日志
- **401 未授权**：检查私钥、项目 ID、凭据 ID 是否与和风天气控制台一致
