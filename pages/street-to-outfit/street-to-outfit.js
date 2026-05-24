/**
 * 街拍转穿搭 - 上传街拍图，AI 识别衣物并匹配衣橱
 */
const { aggregateForRecommend } = require('../../utils/userProfileBuilder.js')

Page({
  data: {
    statusBarHeight: 20,
    uploadedImage: '',
    fileID: '',
    loading: false,
    analysis: null,
    clothingList: [],
    cardImage: '',
    tip: ''
  },

  onLoad() {
    try {
      const sys = wx.getSystemInfoSync()
      this.setData({ statusBarHeight: sys.statusBarHeight || 20 })
    } catch (e) {
      this.setData({ statusBarHeight: 20 })
    }
  },

  chooseImage() {
    wx.chooseMedia({
      count: 1,
      mediaType: ['image'],
      sourceType: ['album', 'camera'],
      success: (res) => {
        const file = res.tempFiles?.[0]
        const tempPath = file && (file.tempFilePath || file.path)
        if (!tempPath) return
        this.setData({
          uploadedImage: tempPath,
          analysis: null,
          clothingList: [],
          cardImage: '',
          fileID: ''
        })
        this.uploadAndAnalyze(tempPath)
      }
    })
  },

  async uploadAndAnalyze(tempPath) {
    if (!tempPath || typeof tempPath !== 'string') {
      wx.showToast({ title: '图片无效', icon: 'none' })
      return
    }
    this.setData({ loading: true })
    try {
      const cloudPath = `street-outfit/${Date.now()}_${Math.random().toString(36).slice(2, 8)}.jpg`
      const uploadRes = await wx.cloud.uploadFile({
        cloudPath,
        filePath: tempPath
      })
      const fileID = uploadRes && uploadRes.fileID
      if (!fileID || typeof fileID !== 'string' || !fileID.startsWith('cloud://')) {
        throw new Error('图片上传失败，请重试')
      }

      const analyzeRes = await wx.cloud.callFunction({
        name: 'analyzeOutfit',
        data: { fileID }
      })
      const result = analyzeRes.result || {}

      if (!result.success) {
        throw new Error(result.errMsg || '分析失败')
      }

      this.setData({
        analysis: result.analysis,
        clothingList: result.clothingList || [],
        fileID,
        loading: false
      })

      this.tryGenerateCard(result.analysis, result.clothingList)
    } catch (e) {
      console.error('analyze error:', e)
      const msg = String(e.errMsg || e.message || '')
      const isNotFound = msg.includes('501000') || msg.includes('FUNCTION_NOT_FOUND')
      wx.showModal({
        title: isNotFound ? '云函数未部署' : '分析失败',
        content: isNotFound
          ? '请先在微信开发者工具中右键 cloudfunctions/analyzeOutfit 文件夹，选择「上传并部署：云端安装依赖」'
          : (e.message || '分析失败'),
        showCancel: false
      })
      this.setData({ loading: false })
    }
  },

  async tryGenerateCard(analysis, clothingList) {
    try {
      const res = await wx.cloud.callFunction({
        name: 'generateOutfitCard',
        data: {
          outfitAnalysis: analysis,
          clothingItems: clothingList,
          originalImageUrl: this.data.uploadedImage
        }
      })
      const r = res.result || {}
      if (r.success && r.cardImageUrl) {
        this.setData({ cardImage: r.cardImageUrl, tip: '' })
      } else if (r.fallback && r.tip) {
        this.setData({ tip: r.tip })
      }
    } catch (e) {
      this.setData({ tip: '卡片生成暂不可用，可保存分析结果' })
    }
  },

  matchToWardrobe(e) {
    const item = e.currentTarget.dataset.item
    if (!item) return
    const app = getApp()
    const { profile, wardrobe } = aggregateForRecommend(app)
    const desc = item.description || item.name
    wx.showModal({
      title: '匹配衣橱',
      content: `识别到：${desc}\n\n可在衣橱中搜索相似单品，或前往「扫描录入」添加新单品。`,
      confirmText: '去试穿',
      success: (res) => {
        if (res.confirm) {
          wx.switchTab({ url: '/pages/wardrobe/wardrobe' })
        }
      }
    })
  },

  saveToDiary() {
    const app = getApp()
    if (app.requireGuestLoginForSave && !app.requireGuestLoginForSave()) return

    const { analysis, clothingList, uploadedImage } = this.data
    if (!analysis) {
      wx.showToast({ title: '暂无分析结果', icon: 'none' })
      return
    }

    try {
      const raw = wx.getStorageSync('diary_pages')
      let stored = raw && typeof raw === 'string' ? JSON.parse(raw) : raw
      if (!stored || typeof stored !== 'object') stored = {}
      const pages = Array.isArray(stored.pages) ? stored.pages : []
      const now = new Date()
      const y = now.getFullYear()
      const m = now.getMonth() + 1
      const d = now.getDate()
      const WEEK_NAMES = ['周日', '周一', '周二', '周三', '周四', '周五', '周六']
      const newPage = {
        id: 'outfit_' + Date.now(),
        year: y,
        month: m,
        day: d,
        week: WEEK_NAMES[now.getDay()],
        weather: 'sunny',
        weatherText: '晴天',
        type: 'outfit_inspiration',
        content: `街拍穿搭灵感｜${analysis.style || ''}｜${(clothingList || []).map(i => i.name || i.description).filter(Boolean).join('、')}`,
        photo: uploadedImage,
        stickers: [],
        analysis,
        clothingList
      }
      const idx = pages.findIndex(p => p.year === y && p.month === m && p.day === d && p.type === 'outfit_inspiration')
      if (idx >= 0) pages.splice(idx, 1)
      pages.unshift(newPage)
      wx.setStorageSync('diary_pages', JSON.stringify({ ...stored, pages }))
      wx.showToast({ title: '已保存到穿搭灵感', icon: 'success' })
    } catch (e) {
      wx.showToast({ title: '保存失败', icon: 'none' })
    }
  },

  onBack() {
    wx.navigateBack({ fail: () => wx.switchTab({ url: '/pages/model/model' }) })
  }
})
