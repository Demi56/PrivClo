const FEEDBACK_STORAGE_KEY = 'privclo_user_feedback_v1'

Page({
  data: {
    statusBarHeight: 20,
    content: '',
    contact: '',
    submitting: false
  },

  onLoad() {
    try {
      const sys = wx.getSystemInfoSync()
      this.setData({ statusBarHeight: sys.statusBarHeight || 20 })
    } catch (e) {
      this.setData({ statusBarHeight: 20 })
    }
  },

  onBack() {
    wx.navigateBack()
  },

  onContentInput(e) {
    this.setData({ content: e.detail.value })
  },

  onContactInput(e) {
    this.setData({ contact: e.detail.value })
  },

  onCopyEmail() {
    wx.setClipboardData({
      data: 'service@privclo.com',
      success: () => wx.showToast({ title: '邮箱已复制', icon: 'success' })
    })
  },

  onSubmit() {
    const content = (this.data.content || '').trim()
    if (!content) {
      wx.showToast({ title: '请填写反馈内容', icon: 'none' })
      return
    }
    if (this.data.submitting) return
    this.setData({ submitting: true })
    try {
      const raw = wx.getStorageSync(FEEDBACK_STORAGE_KEY)
      const list = raw && typeof raw === 'string' ? JSON.parse(raw) : (Array.isArray(raw) ? raw : [])
      list.unshift({
        content,
        contact: (this.data.contact || '').trim(),
        ts: Date.now()
      })
      wx.setStorageSync(FEEDBACK_STORAGE_KEY, JSON.stringify(list.slice(0, 50)))
      this.setData({ content: '', contact: '', submitting: false })
      wx.showToast({ title: '感谢反馈', icon: 'success' })
    } catch (e) {
      this.setData({ submitting: false })
      wx.showToast({ title: '提交失败，请重试', icon: 'none' })
    }
  }
})
