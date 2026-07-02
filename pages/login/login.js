// 登录页
const { openUserAgreement, openPrivacyPolicy } = require('../../utils/legalPages.js')
const { getSystemMetrics } = require('../../utils/systemInfo.js')
const { backAfterAuth } = require('../../utils/safeNavigate.js')
const {
  validateAccount,
  validatePassword
} = require('../../utils/accountValidators.js')
const localAccountStore = require('../../utils/localAccountStore.js')

const ACCOUNT_DISPLAY_KEY = 'privclo_password_account_display'

function maskStars(length) {
  const n = Math.min(Math.max(parseInt(length, 10) || 0, 0), 64)
  if (n <= 0) return ''
  return new Array(n + 1).join('*')
}

Page({
  data: {
    statusBarHeight: 20,
    showPwd: false,
    showPwd2: false,
    fromSave: false,
    isRegisterMode: false,
    account: '',
    password: '',
    passwordMaskStars: '',
    confirmPassword: '',
    confirmMaskStars: '',
    submitting: false
  },

  onLoad(options) {
    const fromSave = options.fromSave === '1' || options.fromSave === true
    try {
      const sys = getSystemMetrics()
      this.setData({ statusBarHeight: sys.statusBarHeight || 20, fromSave: !!fromSave })
    } catch (e) {
      this.setData({ statusBarHeight: 20, fromSave: !!fromSave })
    }
  },

  togglePwd(e) {
    if (e && typeof e.stopPropagation === 'function') e.stopPropagation()
    const next = !this.data.showPwd
    this.setData({ showPwd: next })
    try {
      wx.vibrateShort({ type: 'light' })
    } catch (err) {}
  },

  togglePwd2(e) {
    if (e && typeof e.stopPropagation === 'function') e.stopPropagation()
    const next = !this.data.showPwd2
    this.setData({ showPwd2: next })
    try {
      wx.vibrateShort({ type: 'light' })
    } catch (err) {}
  },

  onAccountInput(e) {
    this.setData({ account: e.detail.value })
  },

  onPasswordInput(e) {
    const v = String(e.detail.value != null ? e.detail.value : '').slice(0, 64)
    this.setData({ password: v, passwordMaskStars: maskStars(v.length) })
  },

  onConfirmPasswordInput(e) {
    const v = String(e.detail.value != null ? e.detail.value : '').slice(0, 64)
    this.setData({ confirmPassword: v, confirmMaskStars: maskStars(v.length) })
  },

  /** 切换注册 / 登录 */
  setRegisterMode(isRegister) {
    const reg = !!isRegister
    const pwd = String(this.data.password || '')
    const cp = reg ? String(this.data.confirmPassword || '') : ''
    this.setData({
      isRegisterMode: reg,
      confirmPassword: reg ? cp : '',
      confirmMaskStars: reg ? maskStars(cp.length) : '',
      showPwd2: false,
      showPwd: false,
      passwordMaskStars: maskStars(pwd.length)
    })
  },

  onRegister() {
    this.setRegisterMode(!this.data.isRegisterMode)
  },

  onLogin() {
    if (this.data.submitting) return
    const accRes = validateAccount(this.data.account)
    if (!accRes.ok) {
      wx.showToast({ title: accRes.message, icon: 'none' })
      return
    }
    const pwdRes = validatePassword(this.data.password, this.data.isRegisterMode)
    if (!pwdRes.ok) {
      wx.showToast({ title: pwdRes.message, icon: 'none' })
      return
    }

    if (this.data.isRegisterMode) {
      const c = this.data.confirmPassword
      if (!c || String(c) !== String(this.data.password)) {
        wx.showToast({ title: '两次输入的密码不一致', icon: 'none' })
        return
      }
      this.doRegister(accRes.normalized, accRes.normalized.indexOf('@') >= 0 ? 'email' : 'phone')
      return
    }

    this.doPasswordLogin(accRes.normalized)
  },

  doRegister(normalized, identityType) {
    this.setData({ submitting: true })
    wx.showLoading({ title: '注册中', mask: true })
    const res = localAccountStore.register(normalized, this.data.password, identityType)
    wx.hideLoading()
    this.setData({ submitting: false })
    if (!res.ok) {
      wx.showToast({ title: res.message || '注册失败', icon: 'none' })
      return
    }
    const app = getApp()
    app.globalData.isGuestMode = false
    try {
      wx.setStorageSync(ACCOUNT_DISPLAY_KEY, normalized)
    } catch (e) {}
    if (app.grantRegistrationReward) app.grantRegistrationReward()
    wx.showToast({ title: '注册成功', icon: 'success', duration: 1200 })
    setTimeout(() => this.afterAuthSuccess(), 600)
  },

  doPasswordLogin(normalized) {
    this.setData({ submitting: true })
    wx.showLoading({ title: '登录中', mask: true })
    const res = localAccountStore.login(normalized, this.data.password)
    wx.hideLoading()
    this.setData({ submitting: false })
    if (!res.ok) {
      wx.showToast({ title: res.message || '登录失败', icon: 'none' })
      return
    }
    const app = getApp()
    app.globalData.isGuestMode = false
    try {
      wx.setStorageSync(ACCOUNT_DISPLAY_KEY, normalized)
    } catch (e) {}
    wx.showToast({ title: '登录成功', icon: 'success', duration: 1200 })
    setTimeout(() => this.afterAuthSuccess(), 600)
  },

  afterAuthSuccess() {
    const app = getApp()
    if (app.markUserLoggedIn) app.markUserLoggedIn()
    backAfterAuth(this.data.fromSave)
  },

  onAgreement() {
    openUserAgreement()
  },

  onPrivacy() {
    openPrivacyPolicy()
  },

  onWechatLogin() {
    const url = this.data.fromSave ? '/pages/wechatauth/wechatauth?fromSave=1' : '/pages/wechatauth/wechatauth'
    wx.navigateTo({ url })
  },

  onForgotPwd() {
    wx.showModal({
      title: '找回密码',
      content: '本地注册账号可重新使用新邮箱注册，或使用下方「微信登录」。正式上线后将支持手机验证码或邮件重置。',
      showCancel: true,
      confirmText: '知道了'
    })
  }
})
