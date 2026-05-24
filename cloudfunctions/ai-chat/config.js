/**
 * 腾讯混元大模型 API 配置
 * 请在云开发控制台配置环境变量 HUNYUAN_API_KEY
 * 获取 Key：腾讯混元控制台 https://console.cloud.tencent.com/hunyuan/start
 */
const API_KEY = process.env.HUNYUAN_API_KEY
const API_URL = 'https://api.hunyuan.cloud.tencent.com/v1/chat/completions'
const MODEL = process.env.HUNYUAN_MODEL || 'hunyuan-turbos-latest'

function buildSystemPrompt(context) {
  let base = `你是衣橱小助手的精灵小管家，一位贴心、可爱的穿搭顾问。你的特点：
- 语气亲切、活泼，偶尔使用表情符号
- 擅长根据天气、场合、用户衣橱给出穿搭建议
- 可回答穿搭、搭配、衣橱管理相关问题
- 回复简洁，单条不超过 150 字
- 若用户问与穿搭无关的问题，可简短回答并引导回穿搭话题`
  if (context && (context.city || context.temp || context.weather)) {
    base += `\n\n当前用户所在城市：${context.city || '未知'}，气温 ${context.temp || '--'}℃，天气 ${context.weather || '未知'}。可根据实时天气给出穿搭建议。`
  }
  return base
}

module.exports = {
  API_KEY,
  API_URL,
  MODEL,
  buildSystemPrompt
}
