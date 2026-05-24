/**
 * 手机号 / 邮箱格式校验与归一化（客户端）
 */

function normalizeAccount(raw) {
  if (raw == null) return ''
  var s = String(raw).trim()
  if (s.indexOf('@') >= 0) return s.toLowerCase()
  return s.replace(/\s/g, '')
}

function isEmailLike(s) {
  return String(s).indexOf('@') >= 0
}

/** 中国大陆手机号 11 位，1 开头 */
function validatePhone(phone) {
  var p = normalizeAccount(phone)
  if (!p) return { ok: false, message: '请输入手机号' }
  if (!/^1\d{10}$/.test(p)) return { ok: false, message: '请输入正确的 11 位手机号' }
  return { ok: true, normalized: p }
}

/** 常用邮箱格式（宽松） */
function validateEmail(email) {
  var e = normalizeAccount(email)
  if (!e) return { ok: false, message: '请输入邮箱' }
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e)) return { ok: false, message: '邮箱格式不正确' }
  if (e.length > 120) return { ok: false, message: '邮箱过长' }
  return { ok: true, normalized: e }
}

/**
 * 根据输入判断类型并校验（占位为手机号或邮箱）
 */
function validateAccount(input) {
  var raw = normalizeAccount(input)
  if (!raw) return { ok: false, message: '请输入手机号或邮箱' }
  if (isEmailLike(raw)) return validateEmail(raw)
  return validatePhone(raw)
}

function validatePassword(password, isRegister) {
  var pwd = password == null ? '' : String(password)
  if (!pwd) return { ok: false, message: '请输入密码' }
  if (pwd.length < 6) return { ok: false, message: '密码至少 6 位' }
  if (isRegister && pwd.length > 64) return { ok: false, message: '密码过长' }
  return { ok: true }
}

module.exports = {
  normalizeAccount,
  isEmailLike,
  validatePhone,
  validateEmail,
  validateAccount,
  validatePassword
}
