/** 微信风格聊天时间标注 */
const TIME_GAP_MS = 5 * 60 * 1000

function pad2(n) {
  return n < 10 ? '0' + n : '' + n
}

function parseMessageTime(msg) {
  if (!msg) return Date.now()
  if (msg.time != null && Number.isFinite(Number(msg.time))) return Number(msg.time)
  const id = String(msg.id || '')
  const matched = id.match(/^[uae](\d+)$/)
  if (matched) return parseInt(matched[1], 10)
  return Date.now()
}

function formatWeChatTime(ts) {
  const date = new Date(ts)
  const now = new Date()
  const y = date.getFullYear()
  const m = date.getMonth()
  const d = date.getDate()
  const timeStr = pad2(date.getHours()) + ':' + pad2(date.getMinutes())

  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime()
  const msgDayStart = new Date(y, m, d).getTime()
  const dayDiff = Math.floor((todayStart - msgDayStart) / 86400000)

  if (dayDiff === 0) return timeStr
  if (dayDiff === 1) return '昨天 ' + timeStr
  if (y === now.getFullYear()) return (m + 1) + '月' + d + '日 ' + timeStr
  return y + '年' + (m + 1) + '月' + d + '日 ' + timeStr
}

function shouldShowTimeLabel(messages, index) {
  if (!messages || index <= 0) return true
  const cur = parseMessageTime(messages[index])
  const prev = parseMessageTime(messages[index - 1])
  return cur - prev >= TIME_GAP_MS
}

function decorateMessagesWithTimeLabels(messages) {
  if (!Array.isArray(messages)) return []
  const normalized = messages.map((msg) => ({
    ...msg,
    time: parseMessageTime(msg)
  }))
  return normalized.map((msg, index) => ({
    ...msg,
    showTimeLabel: shouldShowTimeLabel(normalized, index),
    timeLabel: formatWeChatTime(msg.time)
  }))
}

module.exports = {
  TIME_GAP_MS,
  parseMessageTime,
  formatWeChatTime,
  shouldShowTimeLabel,
  decorateMessagesWithTimeLabels
}
