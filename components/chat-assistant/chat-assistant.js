/**
 * 精灵小管家 - 可折叠聊天助手组件
 * 调用 chatWithAssistant 云函数，使用云开发 AI 扩展混元模型
 */
const { getImageUrl } = require('../../utils/image.js')

Component({
  properties: {
    // 精灵头像 URL（折叠态 + 助手消息气泡前）
    avatarUrl: { type: String, value: '' },
    // 用户头像 URL（用户消息气泡前）
    userAvatarUrl: { type: String, value: '' },
    // 天气数据 { city, temp, weather }
    weather: { type: Object, value: {} },
    // 衣橱数据 { 'tops:sweater': [{ src }], ... }
    wardrobe: { type: Object, value: {} },
    // 用户风格偏好 { nickname, height, weight, selectedStyles, age, ... }
    profile: { type: Object, value: {} },
    // 角色信息：性别 'female'/'male'
    gender: { type: String, value: '' },
    // 角色类型（可选）：'male-child'/'female-child'/'elder-male'/'elder-female'，用于 男童/女童/老年 差异化推荐
    roleType: { type: String, value: '' },
    // 年龄（可选）
    age: { type: Number, value: null },
    // 由父级控制展开（页面级浮层模式），为 true 时始终展示面板，关闭时触发 close 事件
    expanded: { type: Boolean, value: false }
  },

  data: {
    internalExpanded: false,
    messages: [],
    inputText: '',
    loading: false,
    scrollToId: '',
    inputFocus: false,
    unreadCount: 0,
    spriteAvatar: '',
    userAvatar: ''
  },

  observers: {
    'avatarUrl, userAvatarUrl': function (avatarUrl, userAvatarUrl) {
      const updates = {}
      if (avatarUrl) updates.spriteAvatar = avatarUrl
      else updates.spriteAvatar = getImageUrl('/images/sprite.png')
      if (userAvatarUrl) updates.userAvatar = userAvatarUrl
      else updates.userAvatar = getImageUrl('/images/role/avatar-female.png')
      this.setData(updates)
    }
  },

  lifetimes: {
    attached() {
      const avatarUrl = this.properties.avatarUrl
      const userAvatarUrl = this.properties.userAvatarUrl
      this.setData({
        spriteAvatar: avatarUrl || getImageUrl('/images/sprite.png'),
        userAvatar: userAvatarUrl || getImageUrl('/images/role/avatar-female.png')
      })
    }
  },

  methods: {
    onToggleExpand() {
      if (this.properties.expanded) {
        this.triggerEvent('close')
        return
      }
      const v = !this.data.internalExpanded
      this.setData({
        internalExpanded: v,
        unreadCount: v ? 0 : this.data.unreadCount
      })
    },

    onInput(e) {
      this.setData({ inputText: (e.detail && e.detail.value) || '' })
    },

    onScrollToLower() {
      this.triggerEvent('scrolltolower')
    },

    onFeedbackUp(e) {
      const id = e.currentTarget.dataset.id
      if (!id) return
      const msg = this.data.messages.find(m => m.id === id)
      const messages = this.data.messages.map(m => (m.id === id ? { ...m, feedback: 'up' } : m))
      this.setData({ messages })
      getApp().saveChatFeedback(id, msg?.userMsg || '', msg?.content || '', 'up')
    },

    onFeedbackDown(e) {
      const id = e.currentTarget.dataset.id
      if (!id) return
      const msg = this.data.messages.find(m => m.id === id)
      const messages = this.data.messages.map(m => (m.id === id ? { ...m, feedback: 'down' } : m))
      this.setData({ messages })
      getApp().saveChatFeedback(id, msg?.userMsg || '', msg?.content || '', 'down')
    },

    async onSend() {
      const input = (this.data.inputText || '').trim()
      if (!input || this.data.loading) return

      const userMsg = { id: 'u' + Date.now(), role: 'user', content: input }
      const newMessages = [...this.data.messages, userMsg]
      this.setData({
        inputText: '',
        messages: newMessages,
        loading: true,
        scrollToId: 'msg-' + userMsg.id
      })

      const history = newMessages.map(m => ({ role: m.role, content: m.content }))
      const profile = this.properties.profile || {}
      const weather = this.properties.weather || {}
      const outfitPrefs = (profile && profile.outfitPreferences) || getApp().getOutfitPreferences()
      const context = {
        city: weather.city,
        temp: weather.temp,
        weather: weather.weather,
        forecast: weather.forecast || [],
        wardrobe: this.properties.wardrobe,
        profile,
        outfitPreferences: outfitPrefs,
        gender: this.properties.gender || profile.gender,
        roleType: this.properties.roleType || profile.roleType,
        age: this.properties.age ?? profile.age,
        stylePreference: profile.selectedStyles || []
      }

      const timeoutPromise = new Promise((_, reject) => {
        setTimeout(() => reject(new Error('timeout')), 10000)
      })
      const callPromise = wx.cloud.callFunction({
        name: 'chatWithAssistant',
        data: { messages: history, context }
      })

      try {
        const res = await Promise.race([callPromise, timeoutPromise])
        const result = res.result || {}
        const reply = (result.data && result.data.reply) || result.reply
        const errMsg = result.errMsg
        const content = reply || errMsg || '小助手信号不太好，稍等一下哦～ 😅'
        const lastUser = newMessages.filter(m => m.role === 'user').pop()
        const assistantMsg = { id: 'a' + Date.now(), role: 'assistant', content, userMsg: lastUser ? lastUser.content : '' }
        if (result.data && result.data.extractedPreferences) {
          getApp().mergeOutfitPreferencesFromChat(result.data.extractedPreferences)
        }
        this.setData({
          messages: [...newMessages, assistantMsg],
          loading: false,
          scrollToId: 'msg-' + assistantMsg.id
        })
      } catch (err) {
        console.error('发送失败', err)
        const errorMsg = err.message === 'timeout'
          ? '思考时间有点长，再试一次吧～ 🤔'
          : '小助手信号不太好，稍等一下哦～ 😅'
        const lastUser = newMessages.filter(m => m.role === 'user').pop()
        const assistantMsg = { id: 'e' + Date.now(), role: 'assistant', content: errorMsg, userMsg: lastUser ? lastUser.content : '' }
        this.setData({
          messages: [...newMessages, assistantMsg],
          loading: false,
          scrollToId: 'msg-' + assistantMsg.id
        })
      }
    }
  }
})
