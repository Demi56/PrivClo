// components/model-tryon/model-tryon.js
const {
  getSlotsForGender,
  normToPx,
  getDrawLayersForGender,
  getDrawUrl,
  getModelImagePath,
  normalizeTryonGender,
  CANVAS_LOGICAL_WIDTH,
  CANVAS_LOGICAL_HEIGHT
} = require('../../utils/clothingPositions.js')
const { getImageUrl } = require('../../config/cdn.js')
const meshDeform = require('../../utils/clothingMeshDeform.js')

/** 网格顶点命中：严格半径内必中；外侧仅当明显最近（避免误选邻点） */
const MESH_HIT_STRICT_PX = 32
const MESH_HIT_SOFT_MAX_PX = 40
const MESH_HIT_MIN_LEAD_PX = 14
const FRAME_HANDLE_HIT_PX = 28
/** 左右边缩放手柄命中半径 */
const FRAME_HANDLE_HIT_EDGE_PX = 38
/** 四角缩放手柄命中半径（更容易点中） */
const FRAME_HANDLE_HIT_CORNER_PX = 48
/** 外框角/边手柄的命中中心相对绘制点外移 */
const FRAME_HANDLE_HIT_OUTSET = 12
/** 左右边命中中心额外外移 */
const FRAME_HANDLE_HIT_OUTSET_EDGE = 24
/** 四角命中中心再外移，远离角部网格 */
const FRAME_HANDLE_HIT_OUTSET_CORNER = 32
/**
 * 落点落在外框缩放点圆内且已命中网格时：网格需比外框命中点近多少才保留网格（边角通用）
 * 角点单独用更严的 CORNER，使外框更易胜出。
 */
const MESH_CLEAR_WIN_OVER_FRAME_PX = 14
const MESH_CLEAR_WIN_OVER_CORNER_PX = 5
/** 与网格解冲突时：外框判定用更小半径（真实缩放点仍用 _frameHandleHitRadius） */
const FRAME_MESH_TIE_CORNER_PX = 28
const FRAME_MESH_TIE_EDGE_PX = 22
/** 位于蓝框右/下侧的网格顶点受此宽度保护，避免被角/边缩放手柄抢走（触点仍在角点附近时除外） */
const MESH_ZONE_EDGE_GUARD_PX = 48
const RECT_CORNER_RESHAPE_TAP_PX = 36
/** 下装槽位：底边网格更密，略放宽 soft 命中（strict 不变） */
const MESH_BOTTOM_SOFT_EXTRA_PX = 8
const MESH_BOTTOM_LEAD_RELAX_PX = 4

/** 双击画布切换重叠衣物的间隔(ms)与距离阈值(px，逻辑坐标) */
const CANVAS_DOUBLE_TAP_MS = 320
const CANVAS_DOUBLE_TAP_DIST_PX = 42
const MOVE_GRIP_W = 50
const MOVE_GRIP_H = 28
const MOVE_GRIP_GAP = 26
const MOVE_GRIP_HOT_SCALE = 1.22

Component({
  properties: {
    gender: {
      type: String,
      value: 'female'
    },
    outfit: {
      type: Object,
      value: {}
    },
    manualAdjustments: {
      type: Object,
      value: {}
    },
    /** 与试穿页 adjustSlot 同步，便于点 Tab 切换编辑对象 */
    editingSlot: {
      type: String,
      value: ''
    }
  },

  data: {
    loading: false,
    modelBaseUrl: '',
    activeAdjustKey: '',
    /** 当前激活槽位下，已选中的网格顶点索引；-1 表示未选中 */
    selectedMeshVertIndex: -1,
    /** 外框缩放手柄：首次点中为「武装」，再点同一手柄才开始拖拽（值为 n|s|e|w|nw|ne|sw|se） */
    armedReshapeHandle: '',
    /** 顶端移动拉手：首次点中武装，再点一次才开始平移衣物 */
    armedMoveGrip: false
  },

  lifetimes: {
    attached: function() {
      this._renderEntries = []
      this._dragging = null
      this._canvasRect = null
      this._rafScheduled = false
      this._localMeshOverride = {}
      this._meshBootstrap = {}
      this._meshEmitRaf = false
      this._resolvedCloudUrlCache = {}
      this._lastCanvasTap = { t: 0, x: 0, y: 0 }
      /** 女性底图去白底后缓存（避免拖拽衣物时重复 getImageData） */
      this._modelChromaCachedUrl = ''
      this._modelChromaIntrinsicW = 0
      this._modelChromaIntrinsicH = 0
      this._chromaCanvas = null
      this._chromaCtxInited = false
      this._loadModelBaseUrl();
    },
    ready: function() {
      this._initCanvas();
      var slot = this.properties.editingSlot
      if (slot && slot !== this.data.activeAdjustKey) {
        this.setData({ activeAdjustKey: slot })
      }
    }
  },

  observers: {
    'gender': function(newGender, oldGender) {
      if (normalizeTryonGender(newGender) !== normalizeTryonGender(oldGender)) {
        console.log('性别变化:', oldGender, '->', newGender)
        this._modelChromaCachedUrl = ''
        this._modelChromaIntrinsicW = 0
        this._modelChromaIntrinsicH = 0
        this._loadModelBaseUrl()
      }
    },
    'outfit': function() {
      this._localMeshOverride = {}
      this._meshBootstrap = {}
      this._resolvedCloudUrlCache = {}
      this.setData({ selectedMeshVertIndex: -1, armedReshapeHandle: '', armedMoveGrip: false })
      this._lastCanvasTap = { t: 0, x: 0, y: 0 }
      this._scheduleRedraw();
    },
    'manualAdjustments': function() {
      this._scheduleRedraw();
    },
    'editingSlot': function(s) {
      if (typeof s !== 'string' || s === '') {
        if (this.data.activeAdjustKey || this.data.selectedMeshVertIndex >= 0 || this.data.armedReshapeHandle || this.data.armedMoveGrip) {
          this.setData({
            activeAdjustKey: '',
            selectedMeshVertIndex: -1,
            armedReshapeHandle: '',
            armedMoveGrip: false
          })
          this._scheduleRedraw()
        }
        return
      }
      if (s !== this.data.activeAdjustKey) {
        this.setData({
          activeAdjustKey: s,
          selectedMeshVertIndex: -1,
          armedReshapeHandle: '',
          armedMoveGrip: false
        })
        this._scheduleRedraw()
      }
    }
  },

  methods: {
    /**
     * 模特底图：与分类详情页一致，使用 clothingPositions + config/cdn（HTTPS），
     * 避免仅依赖 cloud getTempFileURL 导致未开通云或 fileID 不一致时整画布空白。
     */
    _loadModelBaseUrl: function() {
      var gender = normalizeTryonGender(this.properties.gender)
      var path = getModelImagePath(gender)
      var url = getImageUrl(path)
      if (!url) {
        console.error('模特底图 URL 为空，path:', path)
        return
      }
      console.log('加载模特底图:', url)
      this.setData({ modelBaseUrl: url })
      if (this._canvas && this._ctx) {
        this._drawCompositeImmediate()
      }
    },

    _initCanvas: function() {
      var that = this;
      var query = wx.createSelectorQuery().in(this);
      query.select('#modelCanvas').boundingClientRect()
      query.select('#modelCanvas').fields({ node: true, size: true }).exec(function(res) {
        if (!res || !res[1] || !res[1].node) {
          setTimeout(function() { that._initCanvas(); }, 100);
          return;
        }
        var canvasLayout = res[0]
        if (canvasLayout && canvasLayout.width && canvasLayout.height) {
          that._canvasRect = canvasLayout
        } else {
          that._canvasRect = {
            left: 0,
            top: 0,
            width: res[1].width || CANVAS_LOGICAL_WIDTH,
            height: res[1].height || CANVAS_LOGICAL_HEIGHT
          }
        }
        var canvas = res[1].node;
        var ctx = canvas.getContext('2d');
        canvas.width = CANVAS_LOGICAL_WIDTH
        canvas.height = CANVAS_LOGICAL_HEIGHT
        that._canvas = canvas;
        that._ctx = ctx;
        that._drawCompositeImmediate();
      });
    },

    /**
     * 隐藏画布：对女性 fitting 底图做白底剔除（与资源 #FFF 背景一致）。
     */
    _ensureChromaBuffer: function(done) {
      var that = this
      if (this._chromaCtxInited && this._chromaCanvas) {
        if (typeof done === 'function') done(null)
        return
      }
      var query = wx.createSelectorQuery().in(this)
      query.select('#modelChromaCanvas').fields({ node: true, size: true }).exec(function(res) {
        if (!res || !res[0] || !res[0].node) {
          if (typeof done === 'function') done(new Error('chroma canvas missing'))
          return
        }
        var node = res[0].node
        var c2 = node.getContext('2d')
        if (!c2) {
          if (typeof done === 'function') done(new Error('chroma ctx missing'))
          return
        }
        that._chromaCanvas = node
        that._chromaCtxInited = true
        if (typeof done === 'function') done(null)
      })
    },

    /**
     * 将接近纯白的像素置为透明（仅女性模特底图源图使用）。
     */
    _stripFemaleWhiteBackdrop: function(img, done) {
      var that = this
      if (!img || !img.width || !img.height) {
        if (typeof done === 'function') done(null)
        return
      }
      var w = img.width
      var h = img.height
      if (w > 4096 || h > 4096) {
        if (typeof done === 'function') done(null)
        return
      }
      this._ensureChromaBuffer(function(err) {
        if (err || !that._chromaCanvas) {
          if (typeof done === 'function') done(null)
          return
        }
        var c = that._chromaCanvas
        var c2 = c.getContext('2d')
        c.width = w
        c.height = h
        c2.clearRect(0, 0, w, h)
        c2.drawImage(img, 0, 0)
        var imageData
        try {
          imageData = c2.getImageData(0, 0, w, h)
        } catch (e) {
          console.warn('[model-tryon] getImageData 失败，跳过去白底', e)
          if (typeof done === 'function') done(null)
          return
        }
        var d = imageData.data
        var kr = 250
        var kg = 250
        var kb = 250
        for (var i = 0; i < d.length; i += 4) {
          if (d[i] >= kr && d[i + 1] >= kg && d[i + 2] >= kb) {
            d[i + 3] = 0
          }
        }
        c2.putImageData(imageData, 0, 0)
        if (typeof done === 'function') done(c)
      })
    },

    _scheduleRedraw: function() {
      if (!this._canvas || !this._ctx) return
      if (this._rafScheduled) return
      this._rafScheduled = true
      var that = this
      var raf = wx.requestAnimationFrame || function(cb) { return setTimeout(cb, 16) }
      raf(function() {
        that._rafScheduled = false
        that._drawComposite()
      })
    },

    _drawCompositeImmediate: function() {
      if (!this._canvas || !this._ctx) return
      this._drawComposite()
    },

    redraw: function() {
      this._scheduleRedraw();
    },

    _drawComposite: function() {
      var ctx = this._ctx;
      var canvas = this._canvas;
      if (!ctx || !canvas) return;

      var that = this;
      var modelBaseUrl = this.data.modelBaseUrl;

      if (!modelBaseUrl) {
        console.log('模特底图URL未就绪，等待加载');
        return;
      }

      var cw = canvas.width || CANVAS_LOGICAL_WIDTH
      var ch = canvas.height || CANVAS_LOGICAL_HEIGHT
      var genderNorm = normalizeTryonGender(this.properties.gender)

      ctx.clearRect(0, 0, cw, ch)

      function paintBase(drawSource, iw, ih) {
        ctx.fillStyle = '#f5f0e8'
        ctx.fillRect(0, 0, cw, ch)
        var scale = Math.min(cw / iw, ch / ih)
        var dw = iw * scale
        var dh = ih * scale
        var dx = (cw - dw) / 2
        var dy = (ch - dh) / 2
        ctx.drawImage(drawSource, dx, dy, dw, dh)
        that._drawClothing(ctx, canvas)
      }

      var cacheHit =
        genderNorm === 'female' &&
        that._modelChromaCachedUrl === modelBaseUrl &&
        that._chromaCanvas &&
        that._modelChromaIntrinsicW > 0 &&
        that._modelChromaIntrinsicH > 0

      if (cacheHit) {
        paintBase(that._chromaCanvas, that._modelChromaIntrinsicW, that._modelChromaIntrinsicH)
        return
      }

      var img = canvas.createImage();
      img.onload = function() {
        var iw = img.width
        var ih = img.height
        if (genderNorm === 'female') {
          that._stripFemaleWhiteBackdrop(img, function(chromaNode) {
            if (chromaNode) {
              that._modelChromaCachedUrl = modelBaseUrl
              that._modelChromaIntrinsicW = iw
              that._modelChromaIntrinsicH = ih
              paintBase(chromaNode, iw, ih)
            } else {
              that._modelChromaCachedUrl = ''
              paintBase(img, iw, ih)
            }
          })
          return
        }
        that._modelChromaCachedUrl = ''
        paintBase(img, iw, ih)
      };
      img.onerror = function(err) {
        console.error('模特底图加载失败', err);
      };
      img.src = modelBaseUrl;
    },

    _drawClothing: function(ctx, canvas) {
      var that = this
      var outfit = this.properties.outfit || {}
      var outfitForDraw = Object.assign({}, outfit)
      if (outfitForDraw.dress && !outfitForDraw.suit) {
        outfitForDraw.suit = outfitForDraw.dress
      }
      var gender = normalizeTryonGender(this.properties.gender)
      if (!ctx || !canvas) return
      var canvasW = canvas.width || CANVAS_LOGICAL_WIDTH
      var canvasH = canvas.height || CANVAS_LOGICAL_HEIGHT
      var slots = getSlotsForGender(gender)
      var layers = getDrawLayersForGender(gender, outfitForDraw)
      var drawQueue = []
      for (var i = 0; i < layers.length; i++) {
        var layer = layers[i]
        var slotRect = slots[layer.key]
        if (!slotRect) continue
        var pxRect = normToPx(slotRect, canvasW, canvasH)
        if (layer.key === 'top') {
          pxRect = this._scaleZone(pxRect, 0.704)
        }
        var baseZone = Object.assign({}, pxRect)
        pxRect = this._applyManualOffset(pxRect, layer.key)
        var rawUrl = getDrawUrl(layer.url || outfitForDraw[layer.key] || '')
        var url = this._preprocessClothingUrl(rawUrl)
        if (!url) continue
        drawQueue.push({
          url: url,
          zone: pxRect,
          baseZone: baseZone,
          slotKey: layer.key,
          adjustKey: layer.key === 'suit' ? 'dress' : layer.key
        })
      }
      this._resolveCloudUrlsForQueue(drawQueue, function(resolvedQueue) {
        that._drawClothingQueue(ctx, canvas, resolvedQueue, function() {
          that._drawActiveHandles(ctx)
        })
      })
    },

    /** 主包 /images 相对路径走 CDN，与 config 一致 */
    _preprocessClothingUrl: function(u) {
      if (!u || typeof u !== 'string') return ''
      if (u.indexOf('cloud://') === 0) return u
      if (u.indexOf('http://') === 0 || u.indexOf('https://') === 0) return u
      if (u.indexOf('wxfile://') === 0) return u
      if (u.indexOf('/') === 0) return getImageUrl(u)
      return u
    },

    /** Canvas 无法直接加载 cloud://，批量换临时链接 */
    _resolveCloudUrlsForQueue: function(queue, cb) {
      if (!queue || !queue.length) {
        if (typeof cb === 'function') cb([])
        return
      }
      var need = []
      var that = this
      queue.forEach(function(it) {
        var u = it.url
        if (!u || u.indexOf('cloud://') !== 0) return
        if (need.indexOf(u) < 0) need.push(u)
      })
      if (!need.length || !wx.cloud || !wx.cloud.getTempFileURL) {
        if (typeof cb === 'function') cb(queue)
        return
      }
      var cache = this._resolvedCloudUrlCache || (this._resolvedCloudUrlCache = {})
      var pending = need.filter(function(id) { return !cache[id] })
      if (!pending.length) {
        queue.forEach(function(it) {
          if (it.url && cache[it.url]) it.url = cache[it.url]
        })
        if (typeof cb === 'function') cb(queue)
        return
      }
      wx.cloud.getTempFileURL({
        fileList: pending,
        success: function(res) {
          if (res.fileList) {
            res.fileList.forEach(function(f) {
              if (f.fileID && f.tempFileURL) cache[f.fileID] = f.tempFileURL
            })
          }
          queue.forEach(function(it) {
            if (it.url && cache[it.url]) it.url = cache[it.url]
          })
          if (typeof cb === 'function') cb(queue)
        },
        fail: function(err) {
          console.error('衣物 cloud URL 解析失败', err)
          if (typeof cb === 'function') cb(queue)
        }
      })
    },

    _applyManualOffset: function(zone, slotKey) {
      var all = this.properties.manualAdjustments || {}
      var key = slotKey === 'suit' ? 'dress' : slotKey
      var offset = this._normalizeAdjustment(all[key])
      var cx = zone.x + zone.w / 2 + offset.x
      var cy = zone.y + zone.h / 2 + offset.y
      var w = zone.w * offset.scaleX
      var h = zone.h * offset.scaleY
      return {
        x: cx - w / 2,
        y: cy - h / 2,
        w: w,
        h: h,
        z: zone.z
      }
    },

    _normalizeAdjustment: function(raw) {
      var r = raw || {}
      var sx = Number(r.scaleX)
      var sy = Number(r.scaleY)
      if (!sx || sx <= 0) sx = 1
      if (!sy || sy <= 0) sy = 1
      return {
        x: Number(r.x) || 0,
        y: Number(r.y) || 0,
        scaleX: sx,
        scaleY: sy,
        mesh: r.mesh && r.mesh.verts ? r.mesh : null
      }
    },

    _meshForKey: function(adjustKey) {
      if (this._localMeshOverride[adjustKey]) {
        return this._localMeshOverride[adjustKey]
      }
      var all = this.properties.manualAdjustments || {}
      var adj = this._normalizeAdjustment(all[adjustKey])
      return adj.mesh
    },

    _setMeshForKey: function(adjustKey, mesh) {
      var all = Object.assign({}, this.properties.manualAdjustments || {})
      var cur = this._normalizeAdjustment(all[adjustKey])
      all[adjustKey] = {
        x: cur.x,
        y: cur.y,
        scaleX: cur.scaleX,
        scaleY: cur.scaleY,
        mesh: meshDeform.cloneMesh(mesh)
      }
      this.triggerEvent('adjustmentchange', { manualAdjustments: all, adjustKey: adjustKey })
    },

    _ensureMeshModel: function(adjustKey, imageUrl) {
      var urlKey = (imageUrl || '').split('?')[0]
      var cacheKey = adjustKey + '@' + urlKey
      var prop = (this.properties.manualAdjustments || {})[adjustKey]
      var pm = prop && prop.mesh
      if (pm && pm.sourceUrl === urlKey && pm.verts && pm.triangles) {
        if (this._meshBootstrap[cacheKey]) delete this._meshBootstrap[cacheKey]
        return meshDeform.cloneMesh(pm)
      }
      if (this._meshBootstrap[cacheKey]) {
        return meshDeform.cloneMesh(this._meshBootstrap[cacheKey])
      }
      var gs = meshDeform.clampGridSize(meshDeform.DEFAULT_GRID)
      var mesh = meshDeform.createDefaultMesh(gs, urlKey)
      this._meshBootstrap[cacheKey] = meshDeform.cloneMesh(mesh)
      this.triggerEvent('meshinit', { adjustKey: adjustKey, mesh: mesh })
      return mesh
    },

    _scaleZone: function(zone, ratio) {
      var r = ratio || 1
      var newW = zone.w * r
      var newH = zone.h * r
      return {
        x: zone.x - (newW - zone.w) / 2,
        y: zone.y - (newH - zone.h) / 2,
        w: newW,
        h: newH,
        z: zone.z
      }
    },

    _computeFitInZone: function(img, zone) {
      var scale = Math.min(zone.w / img.width, zone.h / img.height)
      var fitW = img.width * scale
      var fitH = img.height * scale
      var fitX = zone.x + (zone.w - fitW) / 2
      var fitY = zone.y + (zone.h - fitH) / 2
      return { fitX: fitX, fitY: fitY, fitW: fitW, fitH: fitH }
    },

    // 三角网格 + 仿射映射（无断层）
    _drawClothingImage: function(ctx, canvas, imageUrl, zone, adjustKey, done) {
      var that = this
      var img = canvas.createImage();
      img.onload = function() {
        var fit = that._computeFitInZone(img, zone)
        var mesh = that._localMeshOverride[adjustKey] || that._ensureMeshModel(adjustKey, imageUrl)
        meshDeform.drawMeshedClothing(ctx, img, mesh, fit.fitX, fit.fitY, fit.fitW, fit.fitH)
        var vtx = meshDeform.getDeformedVertexCanvasList(mesh, fit.fitX, fit.fitY, fit.fitW, fit.fitH)
        console.log('衣物绘制成功:', imageUrl);
        if (typeof done === 'function') {
          done({
            x: zone.x,
            y: zone.y,
            w: zone.w,
            h: zone.h,
            meshVertices: vtx,
            fit: fit
          })
        }
      };
      img.onerror = function(err) {
        console.error('衣物图片加载失败:', imageUrl, err);
        if (typeof done === 'function') done(null)
      };
      img.src = imageUrl;
    },

    _drawClothingQueue: function(ctx, canvas, queue, done) {
      var that = this
      if (!queue || queue.length === 0) {
        this._renderEntries = []
        if (typeof done === 'function') done()
        return
      }
      this._renderEntries = []
      var index = 0
      var drawNext = function() {
        if (index >= queue.length) {
          if (typeof done === 'function') done()
          return
        }
        var item = queue[index]
        that._drawClothingImage(ctx, canvas, item.url, item.zone, item.adjustKey, function(rect) {
          if (rect) {
            that._renderEntries.push({
              slotKey: item.slotKey,
              adjustKey: item.adjustKey,
              baseZone: item.baseZone,
              rect: rect,
              meshVertices: rect.meshVertices || null,
              fit: rect.fit || null,
              clothingUrl: item.url,
              z: item.zone.z || 0
            })
          }
          index += 1
          drawNext()
        })
      }
      drawNext()
    },

    _getActiveEntry: function() {
      var key = this.data.activeAdjustKey
      if (!key) return null
      var entries = this._renderEntries || []
      for (var i = 0; i < entries.length; i++) {
        if (entries[i].adjustKey === key) return entries[i]
      }
      return null
    },

    /**
     * 与当前变形数据一致的网格顶点画布坐标（绘制/命中共用，避免 _renderEntries 里缓存与 ox,oy 不同步）
     */
    _getLiveMeshVertices: function(entry) {
      if (!entry || !entry.fit) return null
      var key = entry.adjustKey
      var mesh = this._localMeshOverride[key] || this._meshForKey(key)
      if (!mesh || !mesh.verts) return null
      var f = entry.fit
      return meshDeform.getDeformedVertexCanvasList(mesh, f.fitX, f.fitY, f.fitW, f.fitH)
    },

    _buildHandlePoints: function(r, entry) {
      var pts = [
        { key: 'n', x: r.x + r.w / 2, y: r.y },
        { key: 's', x: r.x + r.w / 2, y: r.y + r.h },
        { key: 'w', x: r.x, y: r.y + r.h / 2 },
        { key: 'e', x: r.x + r.w, y: r.y + r.h / 2 },
        { key: 'nw', x: r.x, y: r.y },
        { key: 'ne', x: r.x + r.w, y: r.y },
        { key: 'sw', x: r.x, y: r.y + r.h },
        { key: 'se', x: r.x + r.w, y: r.y + r.h }
      ]
      var mvList = this._getLiveMeshVertices(entry) || (entry && entry.meshVertices) || []
      if (mvList.length) {
        for (var i = 0; i < mvList.length; i++) {
          var mv = mvList[i]
          pts.push({
            key: 'mv' + mv.index,
            vertIndex: mv.index,
            x: mv.x,
            y: mv.y,
            kind: 'mesh_v'
          })
        }
      }
      return pts
    },

    /** 外框顶部的移动拉手几何（位于蓝色虚线框上沿之上）；scale 用于选中/拖拽时整体放大 */
    _getMoveGripRect: function(r, scale) {
      if (!r || !r.w) return null
      scale = typeof scale === 'number' && scale > 0 ? scale : 1
      var w = MOVE_GRIP_W * scale
      var h = MOVE_GRIP_H * scale
      var cx = r.x + r.w / 2
      var cy = r.y - MOVE_GRIP_GAP - MOVE_GRIP_H / 2
      return {
        x: cx - w / 2,
        y: cy - h / 2,
        w: w,
        h: h
      }
    },

    /**
     * 外框缩放点命中半径：四角 > 左右边 > 上下边
     */
    _frameHandleHitRadius: function(key) {
      if (key === 'w' || key === 'e') return FRAME_HANDLE_HIT_EDGE_PX
      if (key === 'nw' || key === 'ne' || key === 'sw' || key === 'se') return FRAME_HANDLE_HIT_CORNER_PX
      return FRAME_HANDLE_HIT_PX
    },

    /** 与已命中网格竞争时：缩小外框等效半径，减少右/底边网格点误判为缩放手柄 */
    _frameHandleTieRadiusVsMesh: function(key) {
      if (key === 'w' || key === 'e') return FRAME_MESH_TIE_EDGE_PX
      if (key === 'nw' || key === 'ne' || key === 'sw' || key === 'se') return FRAME_MESH_TIE_CORNER_PX
      if (key === 'n' || key === 's') return FRAME_MESH_TIE_EDGE_PX
      return FRAME_MESH_TIE_EDGE_PX
    },

    _pointNearRectCorner: function(px, py, r, tolPx) {
      if (!r || !r.w) return false
      var t2 = tolPx * tolPx
      var xc = [r.x, r.x + r.w, r.x, r.x + r.w]
      var yc = [r.y, r.y, r.y + r.h, r.y + r.h]
      for (var q = 0; q < 4; q++) {
        var dx = px - xc[q]
        var dy = py - yc[q]
        if (dx * dx + dy * dy <= t2) return true
      }
      return false
    },

    /**
     * 外框角/边缩放手柄的命中中心；四角单独更大外移，远离角部网格。
     */
    _getFrameHandleHitCenters: function(r) {
      if (!r || !r.w) return []
      var o = FRAME_HANDLE_HIT_OUTSET
      var e = FRAME_HANDLE_HIT_OUTSET_EDGE
      var c = FRAME_HANDLE_HIT_OUTSET_CORNER
      return [
        { key: 'n', x: r.x + r.w / 2, y: r.y - o },
        { key: 's', x: r.x + r.w / 2, y: r.y + r.h + o },
        { key: 'w', x: r.x - e, y: r.y + r.h / 2 },
        { key: 'e', x: r.x + r.w + e, y: r.y + r.h / 2 },
        { key: 'nw', x: r.x - c, y: r.y - c },
        { key: 'ne', x: r.x + r.w + c, y: r.y - c },
        { key: 'sw', x: r.x - c, y: r.y + r.h + c },
        { key: 'se', x: r.x + r.w + c, y: r.y + r.h + c }
      ]
    },

    /** 绘制顶端移动拉手：圆角胶囊 + 四向十字箭头；hot 时红底红描边（与外框武装态一致） */
    _drawMoveGripHandle: function(ctx, g, hot) {
      if (!g) return
      var x = g.x
      var y = g.y
      var w = g.w
      var h = g.h
      var rCaps = Math.min(12, h / 2 - 1)
      ctx.beginPath()
      ctx.moveTo(x + rCaps, y)
      ctx.lineTo(x + w - rCaps, y)
      ctx.arc(x + w - rCaps, y + rCaps, rCaps, -Math.PI / 2, 0)
      ctx.lineTo(x + w, y + h - rCaps)
      ctx.arc(x + w - rCaps, y + h - rCaps, rCaps, 0, Math.PI / 2)
      ctx.lineTo(x + rCaps, y + h)
      ctx.arc(x + rCaps, y + h - rCaps, rCaps, Math.PI / 2, Math.PI)
      ctx.lineTo(x, y + rCaps)
      ctx.arc(x + rCaps, y + rCaps, rCaps, Math.PI, -Math.PI / 2)
      ctx.closePath()
      ctx.fillStyle = hot ? '#fecaca' : '#ffffff'
      ctx.fill()
      ctx.strokeStyle = hot ? '#dc2626' : '#2a6df4'
      ctx.lineWidth = hot ? 2.5 : 2
      ctx.stroke()

      var cx = x + w / 2
      var cy = y + h / 2
      var arm = Math.min(w, h) * 0.32
      var tip = Math.min(w, h) * 0.2
      var stemIn = arm * 0.28
      ctx.strokeStyle = hot ? '#b91c1c' : 'rgba(42,109,244,0.92)'
      ctx.lineWidth = hot ? 2.5 : 2
      ctx.lineCap = 'round'
      ctx.lineJoin = 'round'
      var dirs = [
        [0, -1],
        [0, 1],
        [-1, 0],
        [1, 0]
      ]
      for (var di = 0; di < 4; di++) {
        var dx = dirs[di][0]
        var dy = dirs[di][1]
        var x0 = cx + dx * stemIn
        var y0 = cy + dy * stemIn
        var x1 = cx + dx * arm
        var y1 = cy + dy * arm
        ctx.beginPath()
        ctx.moveTo(x0, y0)
        ctx.lineTo(x1, y1)
        ctx.stroke()
        var bx = x1 - dx * tip
        var by = y1 - dy * tip
        var ox = -dy * (tip * 0.62)
        var oy = dx * (tip * 0.62)
        ctx.beginPath()
        ctx.moveTo(x1, y1)
        ctx.lineTo(bx + ox, by + oy)
        ctx.moveTo(x1, y1)
        ctx.lineTo(bx - ox, by - oy)
        ctx.stroke()
      }
    },

    _drawActiveHandles: function(ctx) {
      var entry = this._getActiveEntry()
      if (!entry || !entry.rect) return
      var rect = entry.rect
      var points = this._buildHandlePoints(rect, entry)
      ctx.save()
      ctx.strokeStyle = 'rgba(42,109,244,0.9)'
      ctx.lineWidth = 2
      ctx.setLineDash([8, 6])
      ctx.strokeRect(rect.x, rect.y, rect.w, rect.h)
      ctx.setLineDash([])

      var gripHot =
        this.data.armedMoveGrip || (this._dragging && this._dragging.mode === 'move')
      var grip = this._getMoveGripRect(rect, gripHot ? MOVE_GRIP_HOT_SCALE : 1)
      this._drawMoveGripHandle(ctx, grip, gripHot)

      var selIdx = this.data.selectedMeshVertIndex
      var armedFrame = this.data.armedReshapeHandle
      var dragFrame = this._dragging && this._dragging.mode === 'reshape' ? this._dragging.handle : ''
      for (var i = 0; i < points.length; i++) {
        var p = points[i]
        var isSel = p.kind === 'mesh_v' && p.vertIndex === selIdx
        if (p.kind === 'mesh_v') {
          ctx.beginPath()
          ctx.fillStyle = '#e0fff8'
          var mr = isSel ? 14 : 8
          ctx.arc(p.x, p.y, mr, 0, Math.PI * 2)
          ctx.fill()
          ctx.lineWidth = isSel ? 3 : 2
          ctx.strokeStyle = isSel ? '#0f766e' : '#0d9488'
          ctx.stroke()
        } else {
          var hotFrame = p.key === armedFrame || p.key === dragFrame
          var pr = hotFrame ? 16 : 10
          ctx.beginPath()
          ctx.fillStyle = hotFrame ? '#fecaca' : '#ffffff'
          ctx.arc(p.x, p.y, pr, 0, Math.PI * 2)
          ctx.fill()
          ctx.lineWidth = 3
          ctx.strokeStyle = hotFrame ? '#dc2626' : '#2a6df4'
          ctx.stroke()
        }
      }
      ctx.restore()
    },

    /**
     * 在触摸点锁定唯一网格顶点：严格圈内直接取最近；圈外仅当最近点比次近点明显更近，减少邻点误选。
     * @param {{adjustKey?: string}} [entry] 为 bottom 时略放宽 soft 区，便于下装底缘顶点。
     */
    _pickMeshVertexAtPoint: function(point, mv, entry) {
      if (!mv || !mv.length) return null
      var strict2 = MESH_HIT_STRICT_PX * MESH_HIT_STRICT_PX
      var softR = MESH_HIT_SOFT_MAX_PX
      var leadR = MESH_HIT_MIN_LEAD_PX
      if (entry && entry.adjustKey === 'bottom') {
        softR += MESH_BOTTOM_SOFT_EXTRA_PX
        leadR = Math.max(8, leadR - MESH_BOTTOM_LEAD_RELAX_PX)
      }
      var soft2 = softR * softR
      var lead2 = leadR * leadR
      var bestIdx = -1
      var bestD2 = Infinity
      var secondD2 = Infinity
      for (var i = 0; i < mv.length; i++) {
        var vtx = mv[i]
        var dx = point.x - vtx.x
        var dy = point.y - vtx.y
        var d2 = dx * dx + dy * dy
        if (d2 < bestD2) {
          secondD2 = bestD2
          bestD2 = d2
          bestIdx = vtx.index
        } else if (d2 < secondD2) {
          secondD2 = d2
        }
      }
      if (bestIdx < 0) return null
      if (bestD2 <= strict2) return bestIdx
      if (bestD2 <= soft2 && (secondD2 - bestD2) >= lead2) return bestIdx
      return null
    },

    /**
     * 角/左右边缩放点与邻近网格抢命中：触点、已选顶点靠近右/下外框内侧时优先保留网格（仍点真角可缩放）。
     */
    _preferReshapeOverMeshVertex: function(point, r, mv, pickedIdx) {
      /** 四角 + 上下左右边中与网格抢命的缩放手柄（须含 n/s，原先遗漏导致顶/底中点永远不优先于网格） */
      var edgeKeys = { nw: 1, ne: 1, sw: 1, se: 1, w: 1, e: 1, n: 1, s: 1 }
      var cornerKeys = { nw: 1, ne: 1, sw: 1, se: 1 }
      var vtx = null
      for (var i = 0; i < mv.length; i++) {
        if (mv[i].index === pickedIdx) {
          vtx = mv[i]
          break
        }
      }
      if (!vtx) return null
      var g = MESH_ZONE_EDGE_GUARD_PX
      var vtxNearRight = vtx.x >= r.x + r.w - g
      var vtxNearBottom = vtx.y >= r.y + r.h - g
      var tapOnRectCorner = this._pointNearRectCorner(point.x, point.y, r, RECT_CORNER_RESHAPE_TAP_PX)
      if ((vtxNearRight || vtxNearBottom) && !tapOnRectCorner) {
        return null
      }
      var framePts = this._getFrameHandleHitCenters(r)
      var bestKey = null
      var bestD2 = Infinity
      for (var j = 0; j < framePts.length; j++) {
        var fp = framePts[j]
        if (!edgeKeys[fp.key]) continue
        var maxR = this._frameHandleTieRadiusVsMesh(fp.key)
        var fr2 = maxR * maxR
        var fdx = point.x - fp.x
        var fdy = point.y - fp.y
        var fd2 = fdx * fdx + fdy * fdy
        if (fd2 <= fr2 && fd2 < bestD2) {
          bestD2 = fd2
          bestKey = fp.key
        }
      }
      if (!bestKey) return null
      var winPx = cornerKeys[bestKey] ? MESH_CLEAR_WIN_OVER_CORNER_PX : MESH_CLEAR_WIN_OVER_FRAME_PX
      var win2 = winPx * winPx
      var dxm = point.x - vtx.x
      var dym = point.y - vtx.y
      var md2 = dxm * dxm + dym * dym
      if (md2 + win2 < bestD2) return null
      return bestKey
    },

    /**
     * 命中顺序：顶端移动拉手 → 外框角/边缩放 → 网格顶点。
     * 避免下装等处网格顶点密布时永远抢不到蓝色角点/边点。
     */
    _hitTestHandle: function(point, entryOverride) {
      var entry = entryOverride || this._getActiveEntry()
      if (!entry || !entry.rect) return null
      var r = entry.rect
      var mv = this._getLiveMeshVertices(entry) || entry.meshVertices

      var gripR = this._getMoveGripRect(r, MOVE_GRIP_HOT_SCALE)
      if (gripR) {
        var gPad = 8
        if (
          point.x >= gripR.x - gPad &&
          point.x <= gripR.x + gripR.w + gPad &&
          point.y >= gripR.y - gPad &&
          point.y <= gripR.y + gripR.h + gPad
        ) {
          return { entry: entry, handle: 'move_grip', kind: 'move_grip', vertIndex: undefined }
        }
      }

      var framePts = this._getFrameHandleHitCenters(r)
      for (var fj = framePts.length - 1; fj >= 0; fj--) {
        var fp = framePts[fj]
        var maxRf = this._frameHandleHitRadius(fp.key)
        var fr2 = maxRf * maxRf
        var fdx = point.x - fp.x
        var fdy = point.y - fp.y
        if (fdx * fdx + fdy * fdy <= fr2) {
          return { entry: entry, handle: fp.key, kind: 'reshape', vertIndex: undefined }
        }
      }

      if (mv && mv.length) {
        var picked = this._pickMeshVertexAtPoint(point, mv, entry)
        if (picked != null) {
          var reshapeKeyPrefer = this._preferReshapeOverMeshVertex(point, r, mv, picked)
          if (reshapeKeyPrefer) {
            return {
              entry: entry,
              handle: reshapeKeyPrefer,
              kind: 'reshape',
              vertIndex: undefined
            }
          }
          return {
            entry: entry,
            handle: 'mv' + picked,
            kind: 'mesh_v',
            vertIndex: picked
          }
        }
      }
      return null
    },

    /**
     * type="2d" 的 Canvas 上优先用 touch.x/y（相对画布显示区域左上），再映射到 canvas 内部逻辑分辨率；
     * 避免仅用 clientX - boundingClientRect 受嵌套滚动、异步布局、取错节点等影响产生偏差。
     */
    _eventPointToCanvas: function(e) {
      var touch = (e.touches && e.touches[0]) || (e.changedTouches && e.changedTouches[0])
      if (!touch || !this._canvasRect || !this._canvas) return null
      var rect = this._canvasRect
      if (!rect.width || !rect.height) return null
      var cw = this._canvas.width || CANVAS_LOGICAL_WIDTH
      var ch = this._canvas.height || CANVAS_LOGICAL_HEIGHT
      var sx = cw / rect.width
      var sy = ch / rect.height
      var localX
      var localY
      if (typeof touch.x === 'number' && typeof touch.y === 'number') {
        localX = touch.x
        localY = touch.y
      } else {
        localX = touch.clientX - rect.left
        localY = touch.clientY - rect.top
      }
      return {
        x: localX * sx,
        y: localY * sy
      }
    },

    _pointHitsEntryHitBounds: function(point, entry) {
      var r = entry.rect
      if (!r) return false
      var g = this._getMoveGripRect(r, MOVE_GRIP_HOT_SCALE)
      if (g) {
        var gPad = 10
        if (
          point.x >= g.x - gPad &&
          point.x <= g.x + g.w + gPad &&
          point.y >= g.y - gPad &&
          point.y <= g.y + g.h + gPad
        ) {
          return true
        }
      }
      if (point.x >= r.x && point.x <= r.x + r.w && point.y >= r.y && point.y <= r.y + r.h) {
        return true
      }
      // 当前编辑槽：蓝色外框角/边控制点绘在矩形外，须纳入命中，否则易判成空白并取消选中
      if (this.data.activeAdjustKey && entry.adjustKey === this.data.activeAdjustKey) {
        var framePts = this._getFrameHandleHitCenters(r)
        for (var hi = 0; hi < framePts.length; hi++) {
          var fp = framePts[hi]
          var maxR = this._frameHandleHitRadius(fp.key)
          var dx = point.x - fp.x
          var dy = point.y - fp.y
          if (dx * dx + dy * dy <= maxR * maxR) return true
        }
      }
      return false
    },

    /** 画布逻辑坐标下，所有包含该点的衣物（含移动拉手），按 z 升序 */
    _collectEntriesAtPoint: function(point) {
      var entries = this._renderEntries || []
      var out = []
      for (var i = 0; i < entries.length; i++) {
        var e = entries[i]
        if (this._pointHitsEntryHitBounds(point, e)) out.push(e)
      }
      out.sort(function(a, b) {
        return (a.z || 0) - (b.z || 0)
      })
      return out
    },

    _canvasTapDist2: function(p, prev) {
      var dx = p.x - prev.x
      var dy = p.y - prev.y
      return dx * dx + dy * dy
    },

    /**
     * 重叠区内单击保持当前编辑槽（便于点外框/网格不动层）；仅触点只命中一层时单击可切到该层；双击见 _processCanvasTouchStart。
     */
    _hitTestEntry: function(point) {
      var candidates = this._collectEntriesAtPoint(point)
      if (candidates.length === 0) return null
      var activeKey = this.data.activeAdjustKey
      if (candidates.length >= 2 && activeKey) {
        for (var i = 0; i < candidates.length; i++) {
          if (candidates[i].adjustKey === activeKey) return candidates[i]
        }
      }
      return candidates[candidates.length - 1]
    },

    _emitAdjustmentChange: function(adjustKey, x, y) {
      if (!adjustKey) return
      var all = Object.assign({}, this.properties.manualAdjustments || {})
      var current = this._normalizeAdjustment(all[adjustKey])
      all[adjustKey] = {
        x: Math.round(x),
        y: Math.round(y),
        scaleX: current.scaleX,
        scaleY: current.scaleY,
        mesh: current.mesh ? meshDeform.cloneMesh(current.mesh) : null
      }
      this.triggerEvent('adjustmentchange', { manualAdjustments: all, adjustKey: adjustKey })
    },

    onCanvasTouchStart: function(e) {
      var that = this
      wx.createSelectorQuery()
        .in(this)
        .select('#modelCanvas')
        .boundingClientRect()
        .exec(function(res) {
          if (res && res[0] && res[0].width && res[0].height) {
            that._canvasRect = res[0]
          }
          that._processCanvasTouchStart(e)
        })
    },

    _processCanvasTouchStart: function(e) {
      var p = this._eventPointToCanvas(e)
      if (!p) return

      var candidates = this._collectEntriesAtPoint(p)
      var rendAll = (this._renderEntries || []).slice().sort(function(a, b) {
        return (a.z || 0) - (b.z || 0)
      })
      var prev = this._lastCanvasTap || { t: 0, x: 0, y: 0 }
      var now = Date.now()
      var isDoubleTap =
        rendAll.length >= 2 &&
        candidates.length >= 1 &&
        prev.t > 0 &&
        now - prev.t < CANVAS_DOUBLE_TAP_MS &&
        this._canvasTapDist2(p, prev) < CANVAS_DOUBLE_TAP_DIST_PX * CANVAS_DOUBLE_TAP_DIST_PX
      this._lastCanvasTap = { t: now, x: p.x, y: p.y }

      if (isDoubleTap) {
        var sorted = rendAll
        var idx = -1
        for (var ci = 0; ci < sorted.length; ci++) {
          if (sorted[ci].adjustKey === this.data.activeAdjustKey) {
            idx = ci
            break
          }
        }
        var nextIdx = idx < 0 ? 0 : (idx + 1) % sorted.length
        var next = sorted[nextIdx]
        this.setData({
          activeAdjustKey: next.adjustKey,
          selectedMeshVertIndex: -1,
          armedReshapeHandle: '',
          armedMoveGrip: false
        })
        this.triggerEvent('slotswitch', { adjustKey: next.adjustKey })
        this._scheduleRedraw()
        return
      }

      var hit = this._hitTestEntry(p)
      if (!hit || !hit.adjustKey) {
        this._clearTryonCanvasSelection()
        return
      }

      if (hit.adjustKey !== this.data.activeAdjustKey) {
        // 多衣物叠放区域：仅双击轮换层，单击不换层；仅当触点只落在单件上时才单击切换
        if (candidates.length < 2) {
          this.setData({
            activeAdjustKey: hit.adjustKey,
            selectedMeshVertIndex: -1,
            armedReshapeHandle: '',
            armedMoveGrip: false
          })
          this.triggerEvent('slotswitch', { adjustKey: hit.adjustKey })
        }
      }

      var handleHit = this._hitTestHandle(p, hit)
      if (handleHit && handleHit.entry) {
        var reshapeKey = handleHit.entry.adjustKey
        var reshapeBase = this._normalizeAdjustment((this.properties.manualAdjustments || {})[reshapeKey])
        if (handleHit.kind === 'mesh_v') {
          var vi = handleHit.vertIndex
          var url = handleHit.entry.clothingUrl || ''
          var mk = this._meshForKey(reshapeKey)
          if (!mk || !mk.verts) {
            mk = this._ensureMeshModel(reshapeKey, url)
          }
          if (!mk || !mk.verts) return
          this.setData({ selectedMeshVertIndex: vi, armedReshapeHandle: '', armedMoveGrip: false })
          this._dragging = {
            mode: 'mesh_vertex',
            vertIndex: vi,
            adjustKey: reshapeKey,
            clothingUrl: url,
            fit: Object.assign({}, handleHit.entry.fit || {}),
            meshSnapshot: meshDeform.cloneMesh(mk)
          }
          return
        }
        if (handleHit.kind === 'move_grip') {
          if (this.data.armedMoveGrip) {
            this.setData({
              selectedMeshVertIndex: -1,
              armedReshapeHandle: '',
              armedMoveGrip: false
            })
            var allM = this.properties.manualAdjustments || {}
            var curM = this._normalizeAdjustment(allM[reshapeKey])
            this._dragging = {
              mode: 'move',
              adjustKey: reshapeKey,
              startX: p.x,
              startY: p.y,
              originX: curM.x || 0,
              originY: curM.y || 0
            }
            this._scheduleRedraw()
            return
          }
          this.setData({
            selectedMeshVertIndex: -1,
            armedReshapeHandle: '',
            armedMoveGrip: true
          })
          this._scheduleRedraw()
          return
        }
        if (handleHit.kind === 'reshape') {
          var rh = handleHit.handle
          if (this.data.armedReshapeHandle === rh) {
            this.setData({
              selectedMeshVertIndex: -1,
              armedReshapeHandle: '',
              armedMoveGrip: false
            })
            this._dragging = {
              mode: 'reshape',
              handle: rh,
              adjustKey: reshapeKey,
              startX: p.x,
              startY: p.y,
              base: reshapeBase,
              baseRect: Object.assign({}, handleHit.entry.rect),
              baseZone: Object.assign({}, handleHit.entry.baseZone || {})
            }
            this._scheduleRedraw()
            return
          }
          this.setData({
            selectedMeshVertIndex: -1,
            armedReshapeHandle: rh,
            armedMoveGrip: false
          })
          this._scheduleRedraw()
          return
        }
      }

      this.setData({
        selectedMeshVertIndex: -1,
        armedReshapeHandle: '',
        armedMoveGrip: false
      })
      this._scheduleRedraw()
    },

    onCanvasTouchMove: function(e) {
      if (!this._dragging) return
      var p = this._eventPointToCanvas(e)
      if (!p) return
      var d = this._dragging
      if (d.mode === 'reshape') {
        this._applyReshapeDrag(d, p)
        return
      }
      if (d.mode === 'mesh_vertex') {
        this._applyMeshVertexDrag(d, p)
        return
      }
      var nextX = d.originX + (p.x - d.startX)
      var nextY = d.originY + (p.y - d.startY)
      this._emitAdjustmentChange(d.adjustKey, nextX, nextY)
    },

    onCanvasTouchEnd: function() {
      var d = this._dragging
      this._dragging = null
      if (d && d.mode === 'mesh_vertex') {
        var mesh = this._localMeshOverride[d.adjustKey] || this._meshForKey(d.adjustKey)
        if (mesh) {
          this._setMeshForKey(d.adjustKey, mesh)
        }
        delete this._localMeshOverride[d.adjustKey]
        this.triggerEvent('meshdragend', {
          adjustKey: d.adjustKey,
          startMesh: d.meshSnapshot ? meshDeform.cloneMesh(d.meshSnapshot) : null,
          endMesh: mesh ? meshDeform.cloneMesh(mesh) : null
        })
      }
      if (d) {
        this._scheduleRedraw()
      }
    },

    _applyMeshVertexDrag: function(d, p) {
      var baseMesh = this._localMeshOverride[d.adjustKey]
      if (!baseMesh) {
        var existing = this._meshForKey(d.adjustKey) || this._ensureMeshModel(d.adjustKey, d.clothingUrl || '')
        baseMesh = meshDeform.cloneMesh(existing)
      }
      if (!baseMesh || !baseMesh.verts) return
      var v = baseMesh.verts[d.vertIndex]
      if (!v) return
      var fit = d.fit
      var restX = fit.fitX + v.u * fit.fitW
      var restY = fit.fitY + v.v * fit.fitH
      v.ox = p.x - restX
      v.oy = p.y - restY
      this._localMeshOverride[d.adjustKey] = baseMesh
      this._scheduleRedraw()
    },

    _applyReshapeDrag: function(d, p) {
      var dx = p.x - d.startX
      var dy = p.y - d.startY
      var handle = d.handle || ''
      var rect = d.baseRect || { w: 1, h: 1, x: 0, y: 0 }
      var zone = d.baseZone || { w: 1, h: 1, x: 0, y: 0 }
      var w = rect.w
      var h = rect.h
      var cx = rect.x + rect.w / 2
      var cy = rect.y + rect.h / 2
      if (handle.indexOf('e') >= 0) { w = rect.w + dx; cx = cx + dx / 2 }
      if (handle.indexOf('w') >= 0) { w = rect.w - dx; cx = cx + dx / 2 }
      if (handle.indexOf('s') >= 0) { h = rect.h + dy; cy = cy + dy / 2 }
      if (handle.indexOf('n') >= 0) { h = rect.h - dy; cy = cy + dy / 2 }
      w = Math.max(48, w)
      h = Math.max(48, h)
      var sx = zone.w > 0 ? (w / zone.w) : 1
      var sy = zone.h > 0 ? (h / zone.h) : 1
      sx = Math.max(0.2, Math.min(3, sx))
      sy = Math.max(0.2, Math.min(3, sy))
      var baseCx = zone.x + zone.w / 2
      var baseCy = zone.y + zone.h / 2
      var nextX = cx - baseCx
      var nextY = cy - baseCy
      var baseAdj = d.base || this._normalizeAdjustment({})
      var all = Object.assign({}, this.properties.manualAdjustments || {})
      all[d.adjustKey] = {
        x: Math.round(nextX),
        y: Math.round(nextY),
        scaleX: Number(sx.toFixed(3)),
        scaleY: Number(sy.toFixed(3)),
        mesh: baseAdj.mesh ? meshDeform.cloneMesh(baseAdj.mesh) : null
      }
      this.triggerEvent('adjustmentchange', { manualAdjustments: all, adjustKey: d.adjustKey })
    },

    /** 点击画布空白区域：取消衣物蓝框与各调节选中，并同步父页 adjustSlot */
    _clearTryonCanvasSelection: function() {
      if (this._dragging) return
      var hadFocus =
        !!this.data.activeAdjustKey ||
        this.data.selectedMeshVertIndex >= 0 ||
        !!this.data.armedReshapeHandle ||
        !!this.data.armedMoveGrip
      this.setData({
        activeAdjustKey: '',
        selectedMeshVertIndex: -1,
        armedReshapeHandle: '',
        armedMoveGrip: false
      })
      this.triggerEvent('slotswitch', { adjustKey: '' })
      if (hadFocus) this._scheduleRedraw()
    },

    // 导出图片
    exportImage: function() {
      var that = this;
      return new Promise(function(resolve, reject) {
        if (!that._canvas) {
          reject(new Error('Canvas 未就绪'));
          return;
        }
        wx.canvasToTempFilePath({
          canvas: that._canvas,
          fileType: 'png',
          quality: 0.92,
          success: function(res) {
            resolve(res.tempFilePath);
          },
          fail: function(err) {
            reject(err);
          }
        });
      });
    }
  }
});