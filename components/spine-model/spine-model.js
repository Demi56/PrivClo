/**
 * Spine 骨骼动画模特组件
 * 支持 idle 待机、点击交互动画、插槽换装
 * 加载失败时降级为 model-tryon 静态图
 */

const spineHelper = require('../../utils/spineHelper.js')

// 尝试加载 spine 运行时（需安装 spine-miniprogram 或接入 spine-wechat）
let SpineRuntime = null
try {
  SpineRuntime = require('../../lib/spine-adapter.js')
} catch (e1) {
  try {
    SpineRuntime = require('spine-miniprogram')
  } catch (e2) {
    console.warn('[spine-model] Spine 运行时未就绪，将使用静态图降级', e1?.message || e2?.message)
  }
}

Component({
  properties: {
    gender: {
      type: String,
      value: 'female'
    },
    /** @type {{ inner?, top?, bottom?, shoes?, suit? }} */
    outfit: {
      type: Object,
      value: {}
    },
    /** 是否启用 Spine（设为 false 可强制使用静态图） */
    useSpine: {
      type: Boolean,
      value: true
    },
    /** Spine 资源根路径（.json + .atlas + .png） */
    spineBaseUrl: {
      type: String,
      value: '/assets/spine/model'
    }
  },

  data: {
    spineReady: false,
    loading: true,
    canvasOpacity: 1,
    fallbackMode: false
  },

  lifetimes: {
    attached() {
      this._spineInst = null
      this._canvas = null
      this._gl = null
      this._rafId = null
      this._lastTapTime = 0
      this._rotation = 0
      this._dragStartX = 0
    },
    detached() {
      this._disposeSpine()
    },
    ready() {
      if (this.properties.useSpine && SpineRuntime) {
        this._initSpine()
      } else {
        this._enableFallback()
      }
    }
  },

  observers: {
    outfit() {
      if (this._spineInst && this.data.spineReady) {
        this._applyOutfit()
      }
    }
  },

  methods: {
    _enableFallback() {
      this.setData({ spineReady: false, fallbackMode: true, loading: false })
    },

    _disposeSpine() {
      if (this._rafId) {
        try {
          this._canvas.cancelAnimationFrame && this._canvas.cancelAnimationFrame(this._rafId)
        } catch (e) {}
        this._rafId = null
      }
      this._spineInst = null
      this._gl = null
    },

    _initSpine() {
      const query = wx.createSelectorQuery().in(this)
      query
        .select('#spineCanvas')
        .fields({ node: true, size: true })
        .exec((res) => {
          if (!res || !res[0] || !res[0].node) {
            setTimeout(() => this._initSpine(), 150)
            return
          }
          const canvas = res[0].node
          this._canvas = canvas
          const dpr = wx.getSystemInfoSync().pixelRatio || 2
          let w = res[0].width || 345
          let h = res[0].height || 500
          if (!w || !h) {
            const sys = wx.getSystemInfoSync()
            w = Math.floor((sys.windowWidth || 375) - 48)
            h = Math.floor((920 * (sys.windowWidth || 375)) / 750)
          }
          canvas.width = w * dpr
          canvas.height = h * dpr

          if (SpineRuntime && typeof SpineRuntime.getSpine === 'function') {
            SpineRuntime.getSpine(canvas)
              .then((spine) => {
                if (!spine || !this._canvas) return
                this._loadSkeleton(spine, w, h)
              })
              .catch((err) => {
                console.warn('[spine-model] Spine 加载失败，降级静态图', err)
                this._enableFallback()
              })
          } else {
            this._enableFallback()
          }
        })
    },

    _loadSkeleton(spine, canvasW, canvasH) {
      const base = (this.properties.spineBaseUrl || '/assets/spine/model').replace(/\/$/, '')
      const gender = this.properties.gender === 'male' ? 'male' : 'female'
      const jsonUrl = `${base}/${gender}/model.json`
      const atlasUrl = `${base}/${gender}/model.atlas`

      const load = spine.loadSkeleton && spine.loadSkeleton.bind(spine)
      if (!load) {
        this._enableFallback()
        return
      }

      load(jsonUrl, atlasUrl)
        .then((skel) => {
          if (!skel || !this._canvas) return
          skel.state.setAnimation(0, 'idle', true)
          this._spineInst = { spine, skeleton: skel }
          this.setData({ spineReady: true, loading: false })
          this._applyOutfit()
          this._startRender()
        })
        .catch((err) => {
          console.warn('[spine-model] 骨骼资源加载失败，降级', err)
          this._enableFallback()
        })
    },

    _applyOutfit() {
      const inst = this._spineInst
      if (!inst || !inst.skeleton) return
      const outfit = this.properties.outfit || {}
      const slotMap = spineHelper.outfitToSlotMap(outfit)
      const skeleton = inst.skeleton

      for (const [slotName, cloth] of Object.entries(slotMap)) {
        if (!cloth) continue
        const slot = skeleton.findSlot && skeleton.findSlot(slotName)
        if (!slot) continue

        if (spineHelper.isSpineAttachment(cloth)) {
          const attName = spineHelper.getAttachmentName(cloth)
          if (attName) {
            const att = skeleton.getAttachment && skeleton.getAttachment(slotName, attName)
            if (att) slot.setAttachment(att)
          }
        } else if (spineHelper.isPngClothing(cloth)) {
          // PNG 动态附件：若运行时支持从图片创建 RegionAttachment 则替换
          const src = typeof cloth === 'string' ? cloth : cloth.src || cloth.base
          if (inst.spine.createAttachmentFromImage && src) {
            const desc = spineHelper.pngToAttachmentDesc(src, slotName)
            const att = inst.spine.createAttachmentFromImage(desc)
            if (att) slot.setAttachment(att)
          }
        }
      }
    },

    _startRender() {
      const self = this
      const canvas = this._canvas
      if (!canvas || !this._spineInst) return

      function render() {
        if (!self._spineInst || !canvas) return
        const { spine, skeleton } = self._spineInst
        try {
          if (spine.render) spine.render(skeleton)
        } catch (e) {
          console.warn('[spine-model] render', e)
        }
        self._rafId = canvas.requestAnimationFrame(render)
      }
      render()
    },

    onCanvasTap() {
      const now = Date.now()
      if (now - this._lastTapTime < 600) return
      this._lastTapTime = now

      if (this._spineInst && this._spineInst.skeleton) {
        const state = this._spineInst.skeleton.state
        if (state.setAnimation) {
          state.setAnimation(0, 'happy', false)
          state.addAnimation(0, 'idle', true, 0)
        }
      }
      wx.vibrateShort({ type: 'light' })
    },

    onCanvasTouchStart(e) {
      if (e.touches && e.touches[0]) {
        this._dragStartX = e.touches[0].clientX
      }
    },

    onCanvasTouchMove(e) {
      if (!e.touches || !e.touches[0]) return
      const dx = e.touches[0].clientX - this._dragStartX
      this._dragStartX = e.touches[0].clientX
      this._rotation = (this._rotation || 0) + dx * 0.5
    },

    /** 换装成功反馈：播放开心动画、音效、震动 */
    playChangeSuccessFeedback() {
      if (this._spineInst && this._spineInst.skeleton) {
        const state = this._spineInst.skeleton.state
        if (state.setAnimation) {
          state.setAnimation(0, 'surprise', false)
          state.addAnimation(0, 'idle', true, 0)
        }
      }
      wx.vibrateShort({ type: 'medium' })
      // 音效需准备音频文件，此处预留
      // wx.playVoice({ filePath: '/assets/audio/change.mp3' })
    },

    /** 对外：导出截图 */
    exportToTempFile() {
      const fallback = this.selectComponent('#fallbackTryon')
      if (fallback && fallback.exportToTempFile) {
        return fallback.exportToTempFile()
      }
      if (this._canvas) {
        return new Promise((resolve, reject) => {
          wx.canvasToTempFilePath({
            canvas: this._canvas,
            fileType: 'png',
            quality: 0.92,
            success: (res) => resolve(res.tempFilePath),
            fail: reject
          })
        })
      }
      return Promise.reject(new Error('无可用画布'))
    }
  }
})
