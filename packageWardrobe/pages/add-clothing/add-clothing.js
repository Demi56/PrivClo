/**
 * 添加衣物 - AI 识别分类 + 智能抠图 + 手动微调
 * 流程：选择图片 → 上传 → AI识别 → 智能抠图 → 预览 → 保存衣橱
 */

const {
  getCategoryTabsWithCustom,
  getCategoryOptionsWithCustom,
  resolveClassification,
  getMattingOptions,
  shouldUseDualEngine
} = require('../../utils/wardrobeTaxonomy.js')
const { getSystemMetrics } = require('../../../utils/systemInfo.js')
const { safeNavigateBack } = require('../../../utils/safeNavigate.js')

Page({
  data: {
    statusBarHeight: 20,
    step: 'select',             // select | uploading | analyzing | matting | preview | manual_refine
    tempImagePath: '',
    originalFileID: '',
    mattedFileID: '',
    previewUrl: '',
    hasManualRefined: false,
    aiClassified: false,
    aiSummary: '',
    mattingOptions: null,
    mattingEngineUsed: '',
    preEnhanceUsed: false,
    dualEngineUsed: false,
    rematCount: 0,
    progress: 0,
    loadingText: '准备中...',
    categoryTabs: [],
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
      const sys = getSystemMetrics()
      const w = sys.windowWidth || 375
      const canvasSize = Math.min(600, w - 48)
      this.setData({
        statusBarHeight: sys.statusBarHeight || 20,
        canvasWidth: canvasSize,
        canvasHeight: canvasSize
      })
      this.canvasDpr = sys.pixelRatio || 2
    } catch (e) {
      this.setData({ statusBarHeight: 20, canvasWidth: 560, canvasHeight: 560 })
    }
    this._refreshCategoryTabs()
  },

  _refreshCategoryTabs() {
    const tabs = getCategoryTabsWithCustom(getApp())
    this.setData({ categoryTabs: tabs })
  },

  _applyClassification(classification, mattingOptions) {
    if (!classification) return false
    const app = getApp()
    const resolved = resolveClassification({
      typeId: classification.typeId || classification.itemTypeId,
      typeName: classification.typeName || classification.itemType,
      categoryId: classification.categoryId || classification.itemCategoryId,
      categoryName: classification.categoryName || classification.itemCategory,
      summary: classification.summary || classification.aiSummary,
      confidence: classification.confidence || classification.aiConfidence
    }, app)

    if (resolved) {
      this.setData({
        itemTypeId: resolved.itemTypeId,
        itemType: resolved.itemType,
        itemCategoryId: resolved.itemCategoryId,
        itemCategory: resolved.itemCategory,
        categoryOptions: resolved.categoryOptions,
        aiClassified: true,
        aiSummary: resolved.aiSummary || '',
        mattingOptions: mattingOptions || getMattingOptions(resolved.itemTypeId, mattingOptions)
      })
      return true
    }

    // 云函数已校验时直接应用，避免二次映射失败
    if (classification.typeId && classification.categoryId) {
      const opts = getCategoryOptionsWithCustom(classification.typeId, app)
      const tab = (this.data.categoryTabs || []).find((t) => t.id === classification.typeId)
      this.setData({
        itemTypeId: classification.typeId,
        itemType: classification.typeName || (tab && tab.name) || classification.typeId,
        itemCategoryId: classification.categoryId,
        itemCategory: classification.categoryName || classification.categoryId,
        categoryOptions: opts,
        aiClassified: true,
        aiSummary: classification.summary || classification.aiSummary || '',
        mattingOptions: mattingOptions || getMattingOptions(classification.typeId, mattingOptions)
      })
      return true
    }
    return false
  },

  async _runAiClassify(fileID) {
    this.setData({
      step: 'analyzing',
      progress: 45,
      loadingText: 'AI 识别衣物中...',
      aiClassified: false,
      aiSummary: ''
    })
    this._animateProgress(45, 58, 1200)
    try {
      const res = await wx.cloud.callFunction({
        name: 'classifyClothing',
        data: { fileID }
      })
      const result = res.result || {}
      if (result.success && result.classification) {
        const applied = this._applyClassification(result.classification, result.mattingOptions)
        if (applied) {
          return result.mattingOptions || getMattingOptions(result.classification.typeId, result.mattingOptions)
        }
      }

      const errMsg = result.errMsg || 'AI 识别未成功'
      console.warn('classifyClothing:', errMsg, result.raw || result.rawText || '')
      const toastTitle = errMsg.length > 28 ? errMsg.slice(0, 28) + '…' : errMsg
      wx.showToast({ title: toastTitle || '未自动识别，请手动选分类', icon: 'none', duration: 2800 })
    } catch (e) {
      console.warn('classifyClothing failed:', e)
      const errText = (e && (e.message || e.errMsg)) ? String(e.message || e.errMsg) : ''
      const isTimeout = /504003|FUNCTIONS_TIME_LIMIT_EXCEEDED|timed out|timeout/i.test(errText)
      wx.showToast({
        title: isTimeout ? 'AI识别超时，请手动选分类' : 'AI 识别失败，请手动选分类',
        icon: 'none',
        duration: 2800
      })
    }
    return getMattingOptions(this.data.itemTypeId)
  },

  onChooseImage(sourceType) {
    wx.chooseMedia({
      count: 1,
      mediaType: ['image'],
      sourceType: [sourceType],
      success: (res) => {
        const path = res.tempFiles[0] && res.tempFiles[0].tempFilePath
        if (path) this.startUpload(path)
      },
      fail: () => {
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

  async startUpload(tempPath) {
    this.setData({
      step: 'uploading',
      tempImagePath: tempPath,
      progress: 0,
      loadingText: '上传中...',
      aiClassified: false,
      aiSummary: ''
    })
    this._animateProgress(0, 40, 800)

    const cloudPath = `wardrobe/raw/${Date.now()}_${Math.random().toString(36).slice(2, 8)}.jpg`
    try {
      const res = await wx.cloud.uploadFile({
        cloudPath,
        filePath: tempPath
      })
      this.setData({ originalFileID: res.fileID, progress: 40 })
      const mattingOptions = await this._runAiClassify(res.fileID)
      this.runMatting(res.fileID, mattingOptions)
    } catch (e) {
      console.error('upload failed:', e)
      wx.showToast({ title: '上传失败', icon: 'none' })
      this.setData({ step: 'select' })
    }
  },

  async runMatting(fileID, mattingOptions, extra) {
    const opts = mattingOptions || this.data.mattingOptions || getMattingOptions(this.data.itemTypeId)
    const isRemat = extra && extra.isRemat
    const useDual = isRemat || shouldUseDualEngine(opts)
    if (isRemat) {
      opts.dualEngine = true
      opts.preEnhance = true
    }
    let loadingText = '智能抠图中...'
    if (useDual) {
      loadingText = isRemat ? 'AI 精修双引擎择优...' : '双引擎抠图择优中...'
    } else if (isRemat) {
      loadingText = 'AI 精修抠图中...'
    }
    this.setData({
      step: 'matting',
      progress: isRemat ? 55 : 60,
      loadingText,
      mattingOptions: opts
    })
    this._animateProgress(isRemat ? 55 : 60, 92, useDual ? 3200 : (isRemat ? 2800 : 2200))

    try {
      const res = await wx.cloud.callFunction({
        name: 'matting',
        data: {
          fileID,
          mattingOptions: opts,
          dualEngine: useDual
        }
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
        hasManualRefined: false,
        mattingEngineUsed: result.engineUsed || opts.recommendedEngine || 'general',
        preEnhanceUsed: !!result.preEnhanceUsed,
        dualEngineUsed: !!result.dualEngineUsed,
        rematCount: isRemat ? (this.data.rematCount + 1) : this.data.rematCount
      })
    } catch (e) {
      console.warn('matting failed:', e)
      wx.showToast({ title: e.message || '抠图失败，请重试', icon: 'none' })
      this.setData({ step: isRemat ? 'preview' : 'select', progress: isRemat ? 100 : 0 })
    }
  },

  _buildRematOptions() {
    const opts = { ...(this.data.mattingOptions || getMattingOptions(this.data.itemTypeId)) }
    opts.dualEngine = true
    opts.preEnhance = true
    opts.engine = 'auto'
    return opts
  },

  onRematEnhanced() {
    const { originalFileID, step } = this.data
    if (!originalFileID) {
      wx.showToast({ title: '原图不可用，请重新选择', icon: 'none' })
      return
    }
    if (step !== 'preview') return
    const nextOpts = this._buildRematOptions()
    this.runMatting(originalFileID, nextOpts, { isRemat: true })
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
    this.setData({ showTypePicker: true, categoryOptions: getCategoryOptionsWithCustom(this.data.itemTypeId, getApp()) })
  },

  onEditCategory() {
    this.setData({ showCategoryPicker: true, categoryOptions: getCategoryOptionsWithCustom(this.data.itemTypeId, getApp()) })
  },

  onSelectType(e) {
    const id = e.currentTarget.dataset.id
    const name = e.currentTarget.dataset.name
    if (id === '__custom_type__') {
      this.setData({ showTypePicker: false, showCustomTypeInput: true, customInputValue: '' })
      return
    }
    const opts = getCategoryOptionsWithCustom(id, getApp())
    const first = opts[0]
    this.setData({
      itemTypeId: id,
      itemType: name,
      itemCategoryId: first ? first.id : 'default',
      itemCategory: first ? first.name : name,
      categoryOptions: opts,
      showTypePicker: false,
      aiClassified: false,
      mattingOptions: getMattingOptions(id)
    })
  },

  onSelectCategory(e) {
    const id = e.currentTarget.dataset.id
    const name = e.currentTarget.dataset.name
    if (id === '__custom_category__') {
      this.setData({ showCategoryPicker: false, showCustomCategoryInput: true, customInputValue: '' })
      return
    }
    this.setData({ itemCategoryId: id, itemCategory: name, showCategoryPicker: false, aiClassified: false })
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
    const opts = getCategoryOptionsWithCustom(typeId, getApp())
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
    const { mattedFileID, itemTypeId, itemCategoryId } = this.data
    if (!mattedFileID || !itemTypeId || !itemCategoryId) {
      wx.showToast({ title: '请选择分类', icon: 'none' })
      return
    }
    getApp().addUserWardrobeItem(itemTypeId, itemCategoryId, {
      src: mattedFileID,
      srcFront: mattedFileID,
      srcBack: ''
    })
    wx.showToast({ title: '已保存到衣橱', icon: 'success' })
    setTimeout(() => safeNavigateBack(), 1200)
  },

  onRetry() {
    this.setData({
      step: 'select',
      tempImagePath: '',
      originalFileID: '',
      mattedFileID: '',
      previewUrl: '',
      hasManualRefined: false,
      aiClassified: false,
      aiSummary: '',
      mattingOptions: null,
      mattingEngineUsed: '',
      preEnhanceUsed: false,
      dualEngineUsed: false,
      rematCount: 0,
      progress: 0
    })
    this.strokeHistory = []
    this.currentStroke = []
  },

  onBack() {
    if (this.data.step === 'uploading' || this.data.step === 'analyzing' || this.data.step === 'matting') {
      wx.showModal({
        title: '确认退出',
        content: '当前处理未完成，确定要退出吗？',
        success: (res) => { if (res.confirm) safeNavigateBack() }
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
      safeNavigateBack()
    }
  }
})
