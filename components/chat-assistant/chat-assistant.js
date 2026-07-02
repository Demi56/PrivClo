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
    uploadingImage: false,
    pendingImage: null,
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
      const rawMessages = getApp().getChatHistory()
      this._resolveHistoryImages(rawMessages).then((messages) => {
        const decorated = decorateMessagesWithTimeLabels(messages)
        const last = decorated.length ? decorated[decorated.length - 1] : null
        this.setData({
          spriteAvatar: avatarUrl || getSpriteImageUrl(),
          userAvatar: userAvatarUrl || getImageUrl('/images/role/avatar-female.png'),
          messages: decorated,
          scrollToId: last ? 'msg-' + last.id : ''
        })
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

    async _resolveHistoryImages(messages) {
      const list = Array.isArray(messages) ? messages.slice() : []
      const fileIDs = [...new Set(
        list.filter((m) => m && m.imageFileID && !m.imageUrl).map((m) => m.imageFileID)
      )]
      if (!fileIDs.length || !wx.cloud) return list
      try {
        const res = await wx.cloud.getTempFileURL({ fileList: fileIDs })
        const map = {}
        ;(res.fileList || []).forEach((item) => {
          if (item && item.status === 0 && item.tempFileURL) map[item.fileID] = item.tempFileURL
        })
        return list.map((m) => ({
          ...m,
          imageUrl: m.imageUrl || map[m.imageFileID] || ''
        }))
      } catch (e) {
        console.warn('resolve history images failed', e)
        return list
      }
    },

    _buildHistoryPayload(messages) {
      return (messages || []).map((m) => ({
        role: m.role,
        content: m.content || (m.imageUrl || m.imageFileID ? '[图片]' : ''),
        imageFileID: m.imageFileID || '',
        imageUrl: m.imageUrl || ''
      }))
    },

    _buildContext() {
      const app = getApp()
      const weather = this.properties.weather || {}
      const gender = this.properties.gender || app.getUserGender() || 'female'
      const profile = buildAssistantProfile(app, { gender, weather })
      const outfitPrefs = profile.outfitPreferences || app.getOutfitPreferences()
      const stylePreference = profile.stylePreference
        || (profile.selectedStyles && profile.selectedStyles.length ? profile.selectedStyles : null)
        || outfitPrefs.styleTags
        || []
      return {
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
    },

    async _requestAssistant(newMessages) {
      const history = this._buildHistoryPayload(newMessages)
      const context = this._buildContext()
      const hasImage = newMessages.some((m) => m.role === 'user' && (m.imageUrl || m.imageFileID))
      const timeoutMs = hasImage ? 45000 : 15000

      const timeoutPromise = new Promise((_, reject) => {
        setTimeout(() => reject(new Error('timeout')), timeoutMs)
      })
      const callPromise = wx.cloud.callFunction({
        name: 'chatWithAssistant',
        data: { messages: history, context }
      })

      const res = await Promise.race([callPromise, timeoutPromise])
      const result = res.result || {}
      const reply = (result.data && result.data.reply) || result.reply
      const errMsg = result.errMsg
      const content = reply || errMsg || '精灵小管家信号不太好，稍等一下哦～ 😅'
      const lastUser = newMessages.filter((m) => m.role === 'user').pop()
      const assistantMsg = {
        id: 'a' + Date.now(),
        role: 'assistant',
        content,
        userMsg: lastUser ? (lastUser.content || (lastUser.imageUrl ? '[图片]' : '')) : '',
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

    onPickImage() {
      if (this.data.loading || this.data.uploadingImage) return
      wx.showActionSheet({
        itemList: ['拍照', '从相册选择'],
        success: (res) => {
          const sourceType = res.tapIndex === 0 ? ['camera'] : ['album']
          this._chooseAndUploadImage(sourceType)
        }
      })
    },

    onRemovePendingImage() {
      this.setData({ pendingImage: null })
    },

    onPreviewImage(e) {
      const url = e.currentTarget.dataset.url
      if (!url) return
      wx.previewImage({ urls: [url], current: url })
    },

    async _chooseAndUploadImage(sourceType) {
      try {
        const chooseRes = await new Promise((resolve, reject) => {
          wx.chooseMedia({
            count: 1,
            mediaType: ['image'],
            sourceType,
            success: resolve,
            fail: reject
          })
        })
        const tempPath = chooseRes.tempFiles && chooseRes.tempFiles[0] && chooseRes.tempFiles[0].tempFilePath
        if (!tempPath) return

        this.setData({ uploadingImage: true, pendingImage: { previewUrl: tempPath, fileID: '', tempPath } })
        const cloudPath = `chat/user/${Date.now()}_${Math.random().toString(36).slice(2, 8)}.jpg`
        const uploadRes = await wx.cloud.uploadFile({ cloudPath, filePath: tempPath })
        let previewUrl = tempPath
        try {
          const urlRes = await wx.cloud.getTempFileURL({ fileList: [uploadRes.fileID] })
          if (urlRes.fileList && urlRes.fileList[0] && urlRes.fileList[0].tempFileURL) {
            previewUrl = urlRes.fileList[0].tempFileURL
          }
        } catch (e) {
          console.warn('getTempFileURL for chat image failed', e)
        }
        this.setData({
          uploadingImage: false,
          pendingImage: {
            fileID: uploadRes.fileID,
            previewUrl,
            tempPath
          }
        })
      } catch (e) {
        console.warn('choose/upload chat image failed', e)
        this.setData({ uploadingImage: false, pendingImage: null })
        wx.showToast({ title: '图片上传失败', icon: 'none' })
      }
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
      const pendingImage = this.data.pendingImage
      if ((!input && !pendingImage) || this.data.loading || this.data.uploadingImage) return

      const now = Date.now()
      const userMsg = {
        id: 'u' + now,
        role: 'user',
        content: input,
        time: now
      }
      if (pendingImage && pendingImage.fileID) {
        userMsg.imageFileID = pendingImage.fileID
        userMsg.imageUrl = pendingImage.previewUrl || pendingImage.tempPath || ''
      }

      const newMessages = [...this.data.messages, userMsg]
      this._setMessages(newMessages, {
        inputText: '',
        pendingImage: null,
        loading: true,
        scrollToId: 'msg-' + userMsg.id
      })
      this._persistMessages(newMessages)

      try {
        await this._requestAssistant(newMessages)
      } catch (err) {
        console.error('发送失败', err)
        const errorMsg = err.message === 'timeout'
          ? '思考时间有点长，再试一次吧～ 🤔'
          : '精灵小管家信号不太好，稍等一下哦～ 😅'
        const assistantMsg = {
          id: 'e' + Date.now(),
          role: 'assistant',
          content: errorMsg,
          userMsg: userMsg.content || (userMsg.imageUrl ? '[图片]' : ''),
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
