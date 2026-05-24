/**
 * 本地账号注册 / 登录（密码仅作哈希存放，无服务端时的演示方案）
 * 正式上线请改为云函数 + 数据库 + HTTPS，并接入短信/邮箱验证码。
 */
var STORAGE_KEY = 'privclo_local_password_accounts_v1'

function djbHash(str) {
  var h = 5381
  var i
  for (i = 0; i < str.length; i++) {
    h = ((h << 5) + h) + str.charCodeAt(i)
    h = h | 0
  }
  return 'p' + (h >>> 0).toString(16)
}

function hashPassword(normalizedAccount, password) {
  return djbHash(password + '\u0000' + normalizedAccount + '\u001ePrivCloLocal')
}

function readStore() {
  try {
    var raw = wx.getStorageSync(STORAGE_KEY)
    if (raw && typeof raw === 'object' && Array.isArray(raw.entries)) return raw
  } catch (e) {}
  return { version: 1, entries: [] }
}

function writeStore(store) {
  try {
    wx.setStorageSync(STORAGE_KEY, store)
    return true
  } catch (e) {
    console.error('localAccountStore write failed', e)
    return false
  }
}

function findEntry(normalized) {
  var store = readStore()
  var i
  for (i = 0; i < store.entries.length; i++) {
    if (store.entries[i].account === normalized) return store.entries[i]
  }
  return null
}

/**
 * @returns {{ ok: boolean, code?: string, message?: string }}
 */
function register(normalizedAccount, password, identityType) {
  if (findEntry(normalizedAccount)) {
    return { ok: false, code: 'exists', message: '该账号已注册，请直接登录' }
  }
  var store = readStore()
  store.entries.push({
    account: normalizedAccount,
    identityType: identityType || 'unknown',
    pwdHash: hashPassword(normalizedAccount, password)
  })
  if (!writeStore(store)) {
    return { ok: false, code: 'io', message: '保存失败，请重试' }
  }
  return { ok: true }
}

/**
 * @returns {{ ok: boolean, code?: string, message?: string }}
 */
function login(normalizedAccount, password) {
  var ent = findEntry(normalizedAccount)
  if (!ent) {
    return { ok: false, code: 'not_found', message: '账号未注册，请先快速注册' }
  }
  if (ent.pwdHash !== hashPassword(normalizedAccount, password)) {
    return { ok: false, code: 'bad_password', message: '密码错误' }
  }
  return { ok: true }
}

module.exports = {
  STORAGE_KEY: STORAGE_KEY,
  hashPassword: hashPassword,
  register: register,
  login: login,
  findEntry: findEntry
}
