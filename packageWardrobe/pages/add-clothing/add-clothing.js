/**
 * 添加衣物 - 默认智能抠图，不满意可手动微调
 * 流程：选择图片 → AI抠图 → 预览 →（可选）背面抠图 → 保存衣橱
 */

const { needsDualSide } = require('../../../utils/wardrobeItem.js')

const CATEGORY_TABS = [
  { id: 'tops', name: '上衣' },
  { id: 'bottoms', name: '下装' },
  { id: 'sets', name: '套装' },
  { id: 'inner', name: '内搭' },
  { id: 'shoes', name: '鞋子' },
  { id: 'accessories', name: '其他配饰' }
]

function getSubCategories(categoryId) {
  const map = {
    tops: [
      { id: 'tshirt', name: 'T恤' }, { id: 'shirt', name: '衬衫' }, { id: 'sweatshirt', name: '卫衣' },
      { id: 'sweater', name: '毛衣' }, { id: 'knitwear', name: '针织衫' }, { id: 'blazer', name: '西装外套' },
      { id: 'jacket', name: '夹克' }, { id: 'vest', name: '马甲' }, { id: 'trenchcoat', name: '风衣' },
      { id: 'overcoat', name: '大衣' }, { id: 'downcoat', name: '羽绒服' }
    ],
    bottoms: [
      { id: 'jeans', name: '牛仔裤' }, { id: 'sportspants', name: '运动裤' }, { id: 'shorts', name: '短裤' },
      { id: 'dresspants', name: '西裤' }, { id: 'skirt', name: '半身裙' }
    ],
    sets: [
      { id: 'dresses', name: '连衣裙' }, { id: 'casual', name: '连体牛仔' }, { id: 'homewear', name: '家居服' },
      { id: 'businessset', name: '商务套装' }, { id: 'sportset', name: '运动套装' }
    ],
    inner: [
      { id: 'baseshirt', name: '打底衫' }, { id: 'underwear', name: '内裤' }, { id: 'socks', name: '袜子' },
      { id: 'bra', name: '文胸' }, { id: 'camisole', name: '吊带' }, { id: 'tanktop', name: '打底背心' },
      { id: 'thermal', name: '保暖衣裤' }
    ],
    shoes: [
      { id: 'casual', name: '休闲鞋' }, { id: 'sports', name: '运动鞋' }, { id: 'business', name: '商务鞋' },
      { id: 'heels', name: '高跟鞋' }, { id: 'sandals', name: '凉鞋' }, { id: 'slippers', name: '拖鞋' },
      { id: 'boots', name: '靴子' }, { id: 'functionalshoes', name: '功能鞋' }
    ],
    accessories: [
      { id: 'hats', name: '帽子' }, { id: 'bags', name: '包包' }, { id: 'jewelry', name: '首饰' },
      { id: 'glasses', name: '眼镜' }, { id: 'watch', name: '手表' }, { id: 'hair', name: '发饰' },
      { id: 'scarf', name: '围巾' }, { id: 'gloves', name: '手套' }, { id: 'belt', name: '腰带' }
    ]
  }
  return map[categoryId] || []
}

function getCategoryOptionsWithCustom(typeId) {
  const base = getSubCategories(typeId)
  const app = getApp()
  const config = app.getPrivateSubConfig ? app.getPrivateSubConfig() : {}
  const cfg = config[typeId]
  const customSubs = (cfg && cfg.subs) ? cfg.subs : []
  const baseIds = new Set(base.map(b => b.id))
  const merged = base.slice()
  customSubs.forEach(s => {
    if (s.id && s.name && !baseIds.has(s.id)) {
      merged.push({ id: s.id, name: s.name })
      baseIds.add(s.id)
    }
  })
  return merged
}

Page({
  data: {
    statusBarHeight: 20,
    step: 'select',             // select | uploading | matting | preview | back_select | manual_refine
    tempImagePath: '',
    originalFileID: '',
    mattedFileID: '',
    backMattedFileID: '',
    previewUrl: '',
    previewBackUrl: '',
    needsBackSide: true,
    hasManualRefined: false,    // 是否经过手动微调
    progress: 0,
    loadingText: '准备中...',
    categoryTabs: CATEGORY_TABS,
    itemTypeId: 'tops',
    itemType: '上衣',
    itemCategoryId: 'sweater',
    itemCategory: '毛衣',
    categoryOptions: [],
    showTypePicker: false,
    showCategoryPicker: false,
    showCustomTypeInput: false,
    showCustomCategoryInput: false,
    customInputValue: '',
    canvasWidth: 600,
    canvasHeight: 600,
    brushSize: 16,
    brushType: 'eraser'   // eraser | restore
  },

  canvasCtx: null,
  canvasNode: null,
  restoreCanvasNode: null,
  restoreCtx: null,
  canvasDpr: 2,
  strokeHistory: [],      // [{ type:'eraser'|'restore', points:[{x,y}] }]
  currentStroke: [],
  imageLoaded: false,
  scale: 1,
  panX: 0,
  panY: 0,
  _lastPinchDist: 0,
  _lastPinchCenter: null,
  _isDrawing: false,

  onLoad() {
    try {
      const sys = wx.getSystemInfoSync()
      const w = sys.windowWidth || 375
      const canvasSize = Math.min(600, w - 48)
      this.setData({
        statusBarHeight: sys.statusBarHeight || 20,
        canvasWidth: canvasSize,
        canvasHeight: canvasSize,
        needsBackSide: needsDualSide(this.data.itemTypeId)
      })
      this.canvasDpr = sys.pixelRatio || 2
    } catch (e) {
      this.setData({ statusBarHeight: 20, canvasWidth: 560, canvasHeight: 560 })
    }
    this._refreshCategoryTabs()
  },

  _refreshCategoryTabs() {
    const app = getApp()
    const customTypes = app.getCustomTypes ? app.getCustomTypes() : []
    const tabs = [...CATEGORY_TABS]
    customTypes.forEach(t => {
      if (t.id && t.name) tabs.push({ id: t.id, name: t.name })
    })
    this.setData({ categoryTabs: tabs })
  },

  onChooseImage(sourceType) {
    this._captureSide = 'front'
    wx.chooseMedia({
      count: 1,
      mediaType: ['image'],
      sourceType: [sourceType],
      success: (res) => {
        const path = res.tempFiles[0] && res.tempFiles[0].tempFilePath
        if (path) {
          if (this._captureSide === 'back') this.startBackUpload(path)
          else this.startUpload(path)
        }
      },
      fail: (err) => {
        wx.showToast({ title: sourceType === 'camera' ? '请授权摄像头' : '请授权相册', icon: 'none' })
      }
    })
  },

  onTakePhoto() {
    this.onChooseImage('camera')
  },

  onChooseFromAlbum() {
    this.onChooseImage('album')
  },

  onStartBackCapture() {
    this._captureSide = 'back'
    this.setData({ step: 'back_select' })
  },

  onTakeBackPhoto() {
    this._captureSide = 'back'
    this.onChooseImage('camera')
  },

  onChooseBackFromAlbum() {
    this._captureSide = 'back'
    this.onChooseImage('album')
  },

  async startBackUpload(tempPath) {
    this.setData({
      step: 'uploading',
      progress: 0,
      loadingText: '上传背面图...'
    })
    this._animateProgress(0, 40, 800)
    const cloudPath = `wardrobe/raw/back_${Date.now()}_${Math.random().toString(36).slice(2, 8)}.jpg`
    try {
      const res = await wx.cloud.uploadFile({ cloudPath, filePath: tempPath })
      this.setData({ progress: 40 })
      this.runBackMatting(res.fileID)
    } catch (e) {
      console.error('back upload failed:', e)
      wx.showToast({ title: '背面上传失败', icon: 'none' })
      this.setData({ step: 'preview' })
    }
  },

  async runBackMatting(fileID) {
    this.setData({ step: 'matting', loadingText: '背面抠图中...' })
    this._animateProgress(40, 85, 2000)
    try {
      const res = await wx.cloud.callFunction({ name: 'matting', data: { fileID } })
      const result = res.result || {}
      const backMattedFileID = result.fileID
      if (result.errMsg || !backMattedFileID) throw new Error(result.errMsg || '背面抠图失败')
      let previewBackUrl = result.tempFileURL || ''
      if (!previewBackUrl) {
        try {
          const urlRes = await wx.cloud.getTempFileURL({ fileList: [backMattedFileID] })
          if (urlRes.fileList && urlRes.fileList[0] && urlRes.fileList[0].tempFileURL) {
            previewBackUrl = urlRes.fileList[0].tempFileURL
          }
        } catch (e) {}
      }
      this._animateProgress(85, 100, 300)
      this.setData({
        step: 'preview',
        backMattedFileID,
        previewBackUrl,
        progress: 100
      })
      wx.showToast({ title: '背面已录入', icon: 'success' })
    } catch (e) {
      wx.showToast({ title: e.message || '背面抠图失败', icon: 'none' })
      this.setData({ step: 'preview', progress: 0 })
    }
  },

  async startUpload(tempPath) {
    this.setData({
      step: 'uploading',
      tempImagePath: tempPath,
      progress: 0,
      loadingText: '上传中...'
    })
    this._animateProgress(0, 40, 800)

    const cloudPath = `wardrobe/raw/${Date.now()}_${Math.random().toString(36).slice(2, 8)}.jpg`
    try {
      const res = await wx.cloud.uploadFile({
        cloudPath,
        filePath: tempPath
      })
      this.setData({ originalFileID: res.fileID, progress: 40 })
      this.runMatting(res.fileID)
    } catch (e) {
      console.error('upload failed:', e)
      wx.showToast({ title: '上传失败', icon: 'none' })
      this.setData({ step: 'select' })
    }
  },

  async runMatting(fileID) {
    this.setData({
      step: 'matting',
      progress: 40,
      loadingText: '智能抠图中...'
    })
    this._animateProgress(40, 85, 2000)

    try {
      const res = await wx.cloud.callFunction({
        name: 'matting',
        data: { fileID }
      })
      const result = res.result || {}
      const mattedFileID = result.fileID
      const errMsg = result.errMsg

      this._animateProgress(85, 100, 300)

      if (errMsg || !mattedFileID) {
        throw new Error(errMsg || '抠图失败')
      }

      let previewUrl = result.tempFileURL || ''
      if (!previewUrl) {
        try {
          const urlRes = await wx.cloud.getTempFileURL({ fileList: [mattedFileID] })
          if (urlRes.fileList && urlRes.fileList[0] && urlRes.fileList[0].tempFileURL) {
            previewUrl = urlRes.fileList[0].tempFileURL
          }
        } catch (e) {
          console.warn('getTempFileURL failed:', e)
        }
      }

      this.setData({
        step: 'preview',
        mattedFileID,
        previewUrl,
        progress: 100,
        hasManualRefined: false
      })
    } catch (e) {
      console.warn('matting failed:', e)
      wx.showToast({ title: e.message || '抠图失败，请重试', icon: 'none' })
      this.setData({ step: 'select', progress: 0 })
    }
  },

  onManualRefine() {
    const { previewUrl } = this.data
    if (!previewUrl) {
      wx.showToast({ title: '预览图加载中，请稍候', icon: 'none' })
      return
    }
    this.setData({ step: 'manual_refine' })
    this.strokeHistory = []
    this.currentStroke = []
    this._undoFirstTime = true
    this.scale = 1
    this.panX = 0
    this.panY = 0
    setTimeout(() => this.loadImageToCanvas(previewUrl), 150)
  },

  setBrushType(e) {
    const type = e.currentTarget.dataset.type
    this.setData({ brushType: type })
  },

  onBackFromRefine() {
    this.setData({ step: 'preview' })
  },

  loadImageToCanvas(imagePath) {
    const dpr = this.canvasDpr
    const width = this.data.canvasWidth
    const height = this.data.canvasHeight
    const drawWidth = width * dpr
    const drawHeight = height * dpr

    wx.createSelectorQuery().in(this)
      .select('#manualCanvas')
      .fields({ node: true, size: true })
      .exec((res) => {
        if (!res || !res[0] || !res[0].node) {
          console.error('canvas node not found')
          return
        }
        const canvas = res[0].node
        const ctx = canvas.getContext('2d')
        this.canvasNode = canvas
        this.canvasCtx = ctx

        canvas.width = drawWidth
        canvas.height = drawHeight
        ctx.scale(dpr, dpr)

        const img = canvas.createImage()
        img.onload = () => {
          const imgW = img.width
          const imgH = img.height
          const scale = Math.min(width / imgW, height / imgH)
          const drawW = imgW * scale
          const drawH = imgH * scale
          const offsetX = (width - drawW) / 2
          const offsetY = (height - drawH) / 2

          this._imgDrawInfo = { img, drawW, drawH, offsetX, offsetY, scale, imgW, imgH }

          this._initRestoreCanvas(width, height, dpr)
          this._redrawAll()
          this.imageLoaded = true
        }
        img.onerror = () => {
          wx.showToast({ title: '图片加载失败', icon: 'none' })
        }
        img.src = imagePath
      })
  },

  _initRestoreCanvas(width, height, dpr) {
    wx.createSelectorQuery().in(this)
      .select('#restoreLayerCanvas')
      .fields({ node: true, size: true })
      .exec((res) => {
        if (!res || !res[0] || !res[0].node) return
        const canvas = res[0].node
        canvas.width = width * dpr
        canvas.height = height * dpr
        canvas.getContext('2d').scale(dpr, dpr)
        this.restoreCanvasNode = canvas
        this.restoreCtx = canvas.getContext('2d')
      })
  },

  _touchToDraw(x, y) {
    const w = this.data.canvasWidth
    const h = this.data.canvasHeight
    const cx = w / 2
    const cy = h / 2
    return {
      x: (x - this.panX - cx) / this.scale + cx,
      y: (y - this.panY - cy) / this.scale + cy
    }
  },

  _getPinchInfo(e) {
    if (!e.touches || e.touches.length < 2) return null
    const t1 = e.touches[0]
    const t2 = e.touches[1]
    const dist = Math.hypot(t2.clientX - t1.clientX, t2.clientY - t1.clientY)
    const center = {
      x: (t1.clientX + t2.clientX) / 2,
      y: (t1.clientY + t2.clientY) / 2
    }
    return { dist, center }
  },

  _getCanvasPos(e) {
    const touch = e.touches && e.touches[0]
    if (!touch) return Promise.resolve(null)
    const w = this.data.canvasWidth
    const h = this.data.canvasHeight
    return new Promise((resolve) => {
      wx.createSelectorQuery().in(this)
        .select('#manualCanvas')
        .boundingClientRect((rect) => {
          if (!rect) return resolve(null)
          const rawX = touch.clientX - rect.left
          const rawY = touch.clientY - rect.top
          const scaleX = rect.width > 0 ? w / rect.width : 1
          const scaleY = rect.height > 0 ? h / rect.height : 1
          resolve({
            x: rawX * scaleX,
            y: rawY * scaleY
          })
        })
        .exec()
    })
  },

  _getCanvasRect() {
    return new Promise((resolve) => {
      wx.createSelectorQuery().in(this)
        .select('#manualCanvas')
        .boundingClientRect(resolve)
        .exec()
    })
  },

  onCanvasTouchStart(e) {
    if (!this.canvasCtx || !this.imageLoaded) return
    const touches = e.touches || e.changedTouches || []
    if (touches.length >= 2) {
      this._isDrawing = false
      const info = this._getPinchInfo(e)
      if (info) {
        this._lastPinchDist = info.dist
        this._getCanvasRect().then(rect => {
          if (rect) {
            const rawX = info.center.x - rect.left
            const rawY = info.center.y - rect.top
            const sx = rect.width > 0 ? this.data.canvasWidth / rect.width : 1
            const sy = rect.height > 0 ? this.data.canvasHeight / rect.height : 1
            this._lastPinchCenter = { x: rawX * sx, y: rawY * sy }
          }
        })
      }
      return
    }
    this._isDrawing = true
    this._getCanvasPos(e).then(pos => {
      if (!pos) return
      const drawPos = this._touchToDraw(pos.x, pos.y)
      this.currentStroke = [{ x: drawPos.x, y: drawPos.y }]
      this._drawPoint(drawPos.x, drawPos.y)
    })
  },

  onCanvasTouchMove(e) {
    if (!this.canvasCtx || !this.imageLoaded) return
    const touches = e.touches || []
    if (touches.length >= 2) {
      const info = this._getPinchInfo(e)
      if (info && this._lastPinchDist > 0) {
        const scaleDelta = info.dist / this._lastPinchDist
        let newScale = this.scale * scaleDelta
        newScale = Math.max(0.5, Math.min(4, newScale))
        this._getCanvasRect().then(rect => {
          if (rect && this._lastPinchCenter) {
            const rawX = info.center.x - rect.left
            const rawY = info.center.y - rect.top
            const sx = rect.width > 0 ? this.data.canvasWidth / rect.width : 1
            const sy = rect.height > 0 ? this.data.canvasHeight / rect.height : 1
            const newCenterX = rawX * sx
            const newCenterY = rawY * sy
            this.panX += newCenterX - this._lastPinchCenter.x
            this.panY += newCenterY - this._lastPinchCenter.y
            this._lastPinchCenter = { x: newCenterX, y: newCenterY }
          }
          this.scale = newScale
          this._lastPinchDist = info.dist
          this._redrawAll()
        })
      }
      return
    }
    if (this.currentStroke.length > 0) {
      this._getCanvasPos(e).then(pos => {
        if (!pos) return
        const drawPos = this._touchToDraw(pos.x, pos.y)
        this.currentStroke.push({ x: drawPos.x, y: drawPos.y })
        this._drawPoint(drawPos.x, drawPos.y)
      })
    }
  },

  onCanvasTouchEnd(e) {
    if (!this.canvasCtx || !this.imageLoaded) return
    const touches = e.touches || []
    if (touches.length >= 2) return
    if (touches.length === 0) {
      this._lastPinchDist = 0
      this._lastPinchCenter = null
    }
    if (this._isDrawing && this.currentStroke.length > 0 && touches.length === 0) {
      const type = this.data.brushType
      this.strokeHistory.push({ type, points: [...this.currentStroke] })
      this.currentStroke = []
      this._isDrawing = false
      return
    }
    if (touches.length < 2) this._isDrawing = false
  },

  _drawPoint(x, y) {
    const ctx = this.canvasCtx
    const info = this._imgDrawInfo
    if (!ctx || !info) return

    const w = this.data.canvasWidth
    const h = this.data.canvasHeight
    const cx = w / 2
    const cy = h / 2
    const size = this.data.brushSize
    const last = this.currentStroke[this.currentStroke.length - 2]
    const type = this.data.brushType

    ctx.save()
    ctx.translate(this.panX, this.panY)
    ctx.translate(cx, cy)
    ctx.scale(this.scale, this.scale)
    ctx.translate(-cx, -cy)

    if (type === 'eraser') {
      ctx.globalCompositeOperation = 'destination-out'
      ctx.strokeStyle = 'rgba(0,0,0,1)'
      ctx.fillStyle = 'rgba(0,0,0,1)'
      ctx.lineWidth = size
      ctx.lineCap = 'round'
      ctx.lineJoin = 'round'
      if (last) {
        ctx.beginPath()
        ctx.moveTo(last.x, last.y)
        ctx.lineTo(x, y)
        ctx.stroke()
      } else {
        ctx.beginPath()
        ctx.arc(x, y, size / 2, 0, Math.PI * 2)
        ctx.fill()
      }
    } else {
      ctx.beginPath()
      ctx.arc(x, y, size / 2, 0, Math.PI * 2)
      if (last) ctx.arc(last.x, last.y, size / 2, 0, Math.PI * 2)
      ctx.clip()
      ctx.drawImage(info.img, info.offsetX, info.offsetY, info.drawW, info.drawH)
    }
    ctx.restore()
  },

  _redrawAll(forExport = false) {
    const ctx = this.canvasCtx
    const info = this._imgDrawInfo
    if (!ctx || !info) return

    const w = this.data.canvasWidth
    const h = this.data.canvasHeight
    const cx = w / 2
    const cy = h / 2
    const size = this.data.brushSize
    const scale = forExport ? 1 : this.scale
    const panX = forExport ? 0 : this.panX
    const panY = forExport ? 0 : this.panY

    ctx.save()
    ctx.globalCompositeOperation = 'source-over'
    ctx.globalAlpha = 1
    ctx.clearRect(0, 0, w, h)
    ctx.translate(panX, panY)
    ctx.translate(cx, cy)
    ctx.scale(scale, scale)
    ctx.translate(-cx, -cy)
    ctx.drawImage(info.img, info.offsetX, info.offsetY, info.drawW, info.drawH)

    ctx.lineWidth = size
    ctx.lineCap = 'round'
    ctx.lineJoin = 'round'

    const allStrokes = [...this.strokeHistory]
    if (!forExport && this.data.brushType === 'restore' && this.currentStroke.length > 0) {
      allStrokes.push({ type: 'restore', points: [...this.currentStroke] })
    }

    allStrokes.forEach(({ type, points }) => {
      if (type === 'eraser') {
        ctx.globalCompositeOperation = 'destination-out'
        ctx.strokeStyle = 'rgba(0,0,0,1)'
        ctx.fillStyle = 'rgba(0,0,0,1)'
        points.forEach((p, i) => {
          if (i === 0) {
            ctx.beginPath()
            ctx.arc(p.x, p.y, size / 2, 0, Math.PI * 2)
            ctx.fill()
          } else {
            ctx.beginPath()
            ctx.moveTo(points[i - 1].x, points[i - 1].y)
            ctx.lineTo(p.x, p.y)
            ctx.stroke()
          }
        })
      }
    })

    const restoreStrokes = allStrokes.filter(s => s.type === 'restore')
    restoreStrokes.forEach(({ points: pts }) => {
      pts.forEach((p, i) => {
        ctx.save()
        ctx.beginPath()
        ctx.arc(p.x, p.y, size / 2, 0, Math.PI * 2)
        if (i > 0) ctx.arc(pts[i - 1].x, pts[i - 1].y, size / 2, 0, Math.PI * 2)
        ctx.clip()
        ctx.drawImage(info.img, info.offsetX, info.offsetY, info.drawW, info.drawH)
        ctx.restore()
      })
    })
    ctx.restore()
  },

  setBrushSize(e) {
    const size = parseInt(e.currentTarget.dataset.size, 10)
    this.setData({ brushSize: size })
  },

  undoLastStroke() {
    if (this._undoLock) return
    if (this.strokeHistory.length === 0) {
      wx.showToast({ title: '没有可撤销的步骤', icon: 'none' })
      return
    }
    this._undoLock = true
    this.currentStroke = []
    this._isDrawing = false
    this.strokeHistory.pop()
    this._redrawAll()
    if (this._undoFirstTime !== false) {
      this._undoFirstTime = false
      wx.nextTick(() => { this._redrawAll() })
    }
    setTimeout(() => { this._undoLock = false }, 350)
  },

  clearCanvas() {
    if (this.strokeHistory.length === 0) {
      wx.showToast({ title: '画布已是空的', icon: 'none' })
      return
    }
    wx.showModal({
      title: '确认清空',
      content: '将清除所有擦除与复原笔迹，确定吗？',
      success: (res) => {
        if (res.confirm) {
          this.strokeHistory = []
          this._redrawAll()
        }
      }
    })
  },

  async saveManualResult() {
    if (!this.canvasCtx || !this.imageLoaded) {
      wx.showToast({ title: '图片加载中，请稍候', icon: 'none' })
      return
    }

    wx.showLoading({ title: '处理中...' })

    const ctx = this.canvasCtx
    const info = this._imgDrawInfo
    const w = this.data.canvasWidth
    const h = this.data.canvasHeight

    try {
      this._redrawAll(true)

      const res = await new Promise((resolve, reject) => {
        wx.canvasToTempFilePath({
          canvas: this.canvasNode,
          fileType: 'png',
          success: resolve,
          fail: reject
        }, this)
      })

      wx.hideLoading()

      const tempPath = res.tempFilePath
      const cloudPath = `wardrobe/manual/${Date.now()}_${Math.random().toString(36).slice(2, 8)}.png`

      wx.showLoading({ title: '上传中...' })
      const uploadRes = await wx.cloud.uploadFile({
        cloudPath,
        filePath: tempPath
      })
      wx.hideLoading()

      let previewUrl = ''
      try {
        const urlRes = await wx.cloud.getTempFileURL({ fileList: [uploadRes.fileID] })
        if (urlRes.fileList && urlRes.fileList[0] && urlRes.fileList[0].tempFileURL) {
          previewUrl = urlRes.fileList[0].tempFileURL
        }
      } catch (_) {}

      this.setData({
        step: 'preview',
        mattedFileID: uploadRes.fileID,
        previewUrl,
        hasManualRefined: true
      })
    } catch (e) {
      wx.hideLoading()
      console.error('saveManualResult failed:', e)
      wx.showToast({ title: '保存失败，请重试', icon: 'none' })
    }
  },

  _animateProgress(from, to, duration) {
    const start = Date.now()
    const tick = () => {
      const elapsed = Date.now() - start
      const ratio = Math.min(elapsed / duration, 1)
      const progress = Math.round(from + (to - from) * ratio)
      this.setData({ progress })
      if (ratio < 1) setTimeout(tick, 50)
    }
    tick()
  },

  onEditType() {
    this._refreshCategoryTabs()
    this.setData({ showTypePicker: true, categoryOptions: getCategoryOptionsWithCustom(this.data.itemTypeId) })
  },

  onEditCategory() {
    this.setData({ showCategoryPicker: true, categoryOptions: getCategoryOptionsWithCustom(this.data.itemTypeId) })
  },

  onSelectType(e) {
    const id = e.currentTarget.dataset.id
    const name = e.currentTarget.dataset.name
    if (id === '__custom_type__') {
      this.setData({ showTypePicker: false, showCustomTypeInput: true, customInputValue: '' })
      return
    }
    const opts = getCategoryOptionsWithCustom(id)
    const first = opts[0]
    this.setData({
      itemTypeId: id,
      itemType: name,
      itemCategoryId: first ? first.id : 'default',
      itemCategory: first ? first.name : name,
      categoryOptions: opts,
      showTypePicker: false,
      needsBackSide: needsDualSide(id)
    })
  },

  onSelectCategory(e) {
    const id = e.currentTarget.dataset.id
    const name = e.currentTarget.dataset.name
    if (id === '__custom_category__') {
      this.setData({ showCategoryPicker: false, showCustomCategoryInput: true, customInputValue: '' })
      return
    }
    this.setData({ itemCategoryId: id, itemCategory: name, showCategoryPicker: false })
  },

  onCustomTypeInput(e) {
    this.setData({ customInputValue: (e.detail && e.detail.value) || '' })
  },

  onCustomCategoryInput(e) {
    this.setData({ customInputValue: (e.detail && e.detail.value) || '' })
  },

  onCustomTypeConfirm() {
    const name = (this.data.customInputValue || '').trim()
    if (!name) {
      wx.showToast({ title: '请输入分类名称', icon: 'none' })
      return
    }
    const app = getApp()
    const customTypes = app.getCustomTypes ? app.getCustomTypes() : []
    const newId = 'custom_' + Date.now()
    const newType = { id: newId, name }
    customTypes.push(newType)
    if (app.saveCustomTypes) app.saveCustomTypes(customTypes)
    this._refreshCategoryTabs()
    this.setData({
      itemTypeId: newId,
      itemType: name,
      itemCategoryId: 'default',
      itemCategory: name,
      categoryOptions: [{ id: 'default', name }],
      showCustomTypeInput: false,
      customInputValue: ''
    })
    wx.showToast({ title: '已添加自定义类型', icon: 'none' })
  },

  onCustomCategoryConfirm() {
    const name = (this.data.customInputValue || '').trim()
    if (!name) {
      wx.showToast({ title: '请输入品类名称', icon: 'none' })
      return
    }
    const typeId = this.data.itemTypeId
    const app = getApp()
    const config = app.getPrivateSubConfig ? app.getPrivateSubConfig() : {}
    const cfg = config[typeId] || {}
    const subs = (cfg.subs || []).slice()
    const newId = 'custom_' + Date.now()
    subs.push({ id: newId, name })
    const newConfig = Object.assign({}, config, { [typeId]: Object.assign({}, cfg, { subs }) })
    if (app.savePrivateSubConfig) app.savePrivateSubConfig(newConfig)
    const opts = getCategoryOptionsWithCustom(typeId)
    this.setData({
      itemCategoryId: newId,
      itemCategory: name,
      categoryOptions: opts,
      showCustomCategoryInput: false,
      customInputValue: ''
    })
    wx.showToast({ title: '已添加自定义品类', icon: 'none' })
  },

  onBlockTap() {},

  onCloseCustomInput() {
    this.setData({ showCustomTypeInput: false, showCustomCategoryInput: false, customInputValue: '' })
  },

  onClosePicker() {
    this.setData({ showTypePicker: false, showCategoryPicker: false })
  },

  onSaveToWardrobe() {
    if (!getApp().requireGuestLoginForSave()) return
    const { mattedFileID, backMattedFileID, itemTypeId, itemCategoryId } = this.data
    if (!mattedFileID || !itemTypeId || !itemCategoryId) {
      wx.showToast({ title: '请选择分类', icon: 'none' })
      return
    }
    getApp().addUserWardrobeItem(itemTypeId, itemCategoryId, {
      src: mattedFileID,
      srcFront: mattedFileID,
      srcBack: backMattedFileID || ''
    })
    wx.showToast({ title: '已保存到衣橱', icon: 'success' })
    setTimeout(() => wx.navigateBack(), 1200)
  },

  onRetry() {
    this.setData({
      step: 'select',
      tempImagePath: '',
      originalFileID: '',
      mattedFileID: '',
      backMattedFileID: '',
      previewUrl: '',
      previewBackUrl: '',
      hasManualRefined: false,
      progress: 0
    })
    this.strokeHistory = []
    this.currentStroke = []
  },

  onBack() {
    if (this.data.step === 'uploading' || this.data.step === 'matting') {
      wx.showModal({
        title: '确认退出',
        content: '当前处理未完成，确定要退出吗？',
        success: (res) => { if (res.confirm) wx.navigateBack() }
      })
    } else if (this.data.step === 'manual_refine') {
      if (this.strokeHistory.length > 0) {
        wx.showModal({
          title: '确认返回',
          content: '当前微调未保存，确定要返回吗？',
          success: (res) => {
            if (res.confirm) this.setData({ step: 'preview' })
          }
        })
      } else {
        this.setData({ step: 'preview' })
      }
    } else {
      wx.navigateBack()
    }
  }
})
