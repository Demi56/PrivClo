/**
 * 精灵小管家 - 可折叠聊天助手组件
 * 调用 chatWithAssistant 云函数，使用云开发 AI 扩展混元模型
 */
const { getImageUrl } = require('../../utils/image.js')
const { getSpriteImageUrl } = require('../../utils/spriteImage.js')
const { decorateMessagesWithTimeLabels } = require('../../utils/chatTime.js')
const { buildAssistantProfile } = require('../../utils/assistantProfile.js')

Component({
  properties: {
    avatarUrl: { type: String, value: '' },
    userAvatarUrl: { type: String, value: '' },
    weather: { type: Object, value: {} },
    wardrobe: { type: Object, value: {} },
    profile: { type: Object, value: {} },
    gender: { type: String, value: '' },
    roleType: { type: String, value: '' },
    age: { type: Number, value: null },
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
      else updates.spriteAvatar = getSpriteImageUrl()
      if (userAvatarUrl) updates.userAvatar = userAvatarUrl
      else updates.userAvatar = getImageUrl('/images/role/avatar-female.png')
      this.setData(updates)
    },
    expanded: function (expanded) {
      if (expanded) this._scrollToLatest()
    }
  },

  lifetimes: {
    attached() {
      const avatarUrl = this.properties.avatarUrl
      const userAvatarUrl = this.properties.userAvatarUrl
      const messages = decorateMessagesWithTimeLabels(getApp().getChatHistory())
      const last = messages.length ? messages[messages.length - 1] : null
      this.setData({
        spriteAvatar: avatarUrl || getSpriteImageUrl(),
        userAvatar: userAvatarUrl || getImageUrl('/images/role/avatar-female.png'),
        messages,
        scrollToId: last ? 'msg-' + last.id : ''
      })
    }
  },

  methods: {
    _setMessages(messages, extra) {
      const decorated = decorateMessagesWithTimeLabels(messages)
      this.setData({ messages: decorated, ...(extra || {}) })
      return decorated
    },

    _persistMessages(messages) {
      getApp().saveChatHistory(messages || this.data.messages)
    },

    _scrollToLatest() {
      const messages = this.data.messages || []
      const last = messages[messages.length - 1]
      if (last && last.id) {
        this.setData({ scrollToId: 'msg-' + last.id })
      }
    },

    onOpenPanel() {
      this.setData({ internalExpanded: true, unreadCount: 0 })
      this._scrollToLatest()
    },

    onClosePanel() {
      this._persistMessages(this.data.messages)
      if (this.properties.expanded) {
        this.triggerEvent('close')
        return
      }
      this.setData({ internalExpanded: false })
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
      this._setMessages(messages)
      this._persistMessages(messages)
      getApp().saveChatFeedback(id, msg?.userMsg || '', msg?.content || '', 'up')
    },

    onFeedbackDown(e) {
      const id = e.currentTarget.dataset.id
      if (!id) return
      const msg = this.data.messages.find(m => m.id === id)
      const messages = this.data.messages.map(m => (m.id === id ? { ...m, feedback: 'down' } : m))
      this._setMessages(messages)
      this._persistMessages(messages)
      getApp().saveChatFeedback(id, msg?.userMsg || '', msg?.content || '', 'down')
    },

    async onSend() {
      const input = (this.data.inputText || '').trim()
      if (!input || this.data.loading) return

      const now = Date.now()
      const userMsg = { id: 'u' + now, role: 'user', content: input, time: now }
      const newMessages = [...this.data.messages, userMsg]
      this._setMessages(newMessages, {
        inputText: '',
        loading: true,
        scrollToId: 'msg-' + userMsg.id
      })
      this._persistMessages(newMessages)

      const history = newMessages.map(m => ({ role: m.role, content: m.content }))
      const app = getApp()
      const weather = this.properties.weather || {}
      const gender = this.properties.gender || app.getUserGender() || 'female'
      const profile = buildAssistantProfile(app, { gender, weather })
      const outfitPrefs = profile.outfitPreferences || app.getOutfitPreferences()
      const stylePreference = profile.stylePreference
        || (profile.selectedStyles && profile.selectedStyles.length ? profile.selectedStyles : null)
        || outfitPrefs.styleTags
        || []
      const context = {
        city: weather.city,
        temp: weather.temp,
        weather: weather.weather,
        forecast: weather.forecast || [],
        wardrobe: this.properties.wardrobe || app.getUserWardrobeItems(),
        profile,
        outfitPreferences: outfitPrefs,
        learningLibrary: profile.learningLibrary || null,
        userDataLibrary: profile.userDataLibrary || null,
        userDataSummary: profile.userDataSummary || '',
        isGuestMode: profile.isGuestMode === true,
        gender: profile.gender || gender,
        roleType: this.properties.roleType || profile.roleType,
        age: profile.age ?? this.properties.age,
        stylePreference
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
        const content = reply || errMsg || '精灵小管家信号不太好，稍等一下哦～ 😅'
        const lastUser = newMessages.filter(m => m.role === 'user').pop()
        const assistantMsg = {
          id: 'a' + Date.now(),
          role: 'assistant',
          content,
          userMsg: lastUser ? lastUser.content : '',
          time: Date.now()
        }
        if (result.data && result.data.extractedPreferences) {
          getApp().mergeOutfitPreferencesFromChat(result.data.extractedPreferences)
        }
        const merged = [...newMessages, assistantMsg]
        this._setMessages(merged, {
          loading: false,
          scrollToId: 'msg-' + assistantMsg.id
        })
        this._persistMessages(merged)
      } catch (err) {
        console.error('发送失败', err)
        const errorMsg = err.message === 'timeout'
          ? '思考时间有点长，再试一次吧～ 🤔'
          : '精灵小管家信号不太好，稍等一下哦～ 😅'
        const lastUser = newMessages.filter(m => m.role === 'user').pop()
        const assistantMsg = {
          id: 'e' + Date.now(),
          role: 'assistant',
          content: errorMsg,
          userMsg: lastUser ? lastUser.content : '',
          time: Date.now()
        }
        const merged = [...newMessages, assistantMsg]
        this._setMessages(merged, {
          loading: false,
          scrollToId: 'msg-' + assistantMsg.id
        })
        this._persistMessages(merged)
      }
    }
  }
})
