const { getAvatarTestModelUrl } = require('../../config/cdn.js')
const { prepareModel3dForXr } = require('../../utils/model3dValidate.js')
const { getAvatarFrame } = require('../../utils/avatarFrame.js')
const { DEFAULT_TOP_DISPLAY_MODE } = require('../../utils/avatarModelSpec.js')
const { extractTryonTextures } = require('../../utils/wardrobeItem.js')
const { getItemSrc, buildOutfitFromTryonSlots } = require('../../utils/tryonOutfitHelpers.js')
const { resolveCloudUrl, resolveCloudUrlMap } = require('../../utils/cloudFileUrl.js')
const { getAvatarAnchorForSlot, AVATAR_TEST_BOUNDS } = require('../../utils/avatarClothAnchors.js')
const { measureAvatarBounds } = require('../../utils/avatarModelBounds.js')
const { flipImageVertical } = require('../../utils/flipImageForXr.js')
const {
  SHELL_TOP_TEX_ID,
  applyTextureToShell,
  setShellNodeVisible,
  getShellPrimitives,
  loadSceneTextureAsset,
  isTextureAssetReady
} = require('../../utils/avatarShellTexture.js')

/** 默认 shell_top 贴图；调试平面挂图可设 topDisplayMode="overlay" */
const APPLY_RETRY_MAX = 80

Component({
  properties: {
    gender: { type: String, value: 'female' },
    outfit: { type: Object, value: {} },
    topSrc: { type: String, value: '' },
    tryonSlots: { type: Array, value: [] },
    /** shell：shell_top 换贴图（需 GLB UV 2.3:1）；overlay：平面挂图兜底 */
    topDisplayMode: { type: String, value: DEFAULT_TOP_DISPLAY_MODE },
    transparentBg: { type: Boolean, value: false },
    rotateY: { type: Number, value: 0 },
    sceneOffsetX: { type: Number, value: 0 },
    cameraZoom: { type: Number, value: 1 },
    modelUrl: { type: String, value: '' }
  },

  data: {
    resolvedModelUrl: '',
    textureAssets: [],
    clothMeshes: [],
    spinPivot: '0 0 0',
    lookTarget: '0 0.2 0',
    cameraPosition: '0 0.25 2.6',
    modelRootPosition: '0 0 0',
    modelRootScale: '1 1 1'
  },

  observers: {
    gender: function () {
      this.scheduleShellSync()
    },
    sceneOffsetX: function () {
      this.applyFrame()
    },
    cameraZoom: function () {
      this.applyFrame()
    },
    outfit: function () {
      this.scheduleShellSync()
    },
    'outfit.**': function () {
      this.scheduleShellSync()
    },
    topSrc: function () {
      this.scheduleShellSync()
    },
    tryonSlots: function () {
      this.scheduleShellSync()
    },
    modelUrl: function () {
      this.prepareModelUrl(this.properties.modelUrl)
    },
    topDisplayMode: function () {
      this.scheduleShellSync()
    }
  },

  lifetimes: {
    attached() {
      this.applyFrame()
      this.prepareModelUrl(this.properties.modelUrl)
      this.scheduleShellSync()
    },
    detached() {
      if (this._shellSyncTimer) clearTimeout(this._shellSyncTimer)
      if (this._applyRetryTimer) clearTimeout(this._applyRetryTimer)
      if (this._modelValidateSeq) this._modelValidateSeq += 1
      this._scene = null
      this._gltf = null
      this._pendingTopUrl = ''
      this._resolvedTopUrl = ''
      this._loadedTexSrc = ''
      this._shellTopTexReady = false
      this._shellTexLoadSeq = 0
      this._shellTopTexLoadingUrl = ''
      this._shellTopTexLoadingPromise = null
      this._deferShellApply = false
      this._resolvedModelSource = ''
    }
  },

  methods: {
    isTopOverlayMode() {
      return this.properties.topDisplayMode === 'overlay'
    },

    clearTopOverlay() {
      if (this.data.textureAssets.length || this.data.clothMeshes.length) {
        this.setData({ textureAssets: [], clothMeshes: [] })
      }
    },

    applyFrame() {
      const frame = getAvatarFrame({
        sceneOffsetX: this.properties.sceneOffsetX,
        cameraZoom: this.properties.cameraZoom
      })
      this.setData({
        spinPivot: frame.spinPivot,
        lookTarget: frame.lookTarget,
        cameraPosition: frame.cameraPosition,
        modelRootPosition: frame.modelRootPosition,
        modelRootScale: frame.modelRootScale
      })
    },

    resolveModelUrl(override) {
      const custom = (override || this.properties.modelUrl || '').trim()
      if (custom) return custom
      return getAvatarTestModelUrl()
    },

    prepareModelUrl(override) {
      const self = this
      const seq = (this._modelValidateSeq = (this._modelValidateSeq || 0) + 1)
      const modelUrl = this.resolveModelUrl(override)
      if (modelUrl === this._resolvedModelSource && this.data.resolvedModelUrl) return

      if (this.data.resolvedModelUrl) {
        this.setData({ resolvedModelUrl: '' })
      }
      this._resolvedModelSource = modelUrl

      prepareModel3dForXr(modelUrl).then(function (result) {
        if (seq !== self._modelValidateSeq) return
        if (!result.ok || !result.xrSrc) {
          console.warn('[avatar-xr] model prepare failed', modelUrl, result)
          self.triggerEvent('error', result)
          return
        }
        if (result.warn) {
          console.warn('[avatar-xr] model prepare soft-pass', result.warn, modelUrl)
        }
        self.setData({ resolvedModelUrl: result.xrSrc })
      })
    },

    resolveSceneFromReadyEvent(e) {
      let scene = (e && e.detail && e.detail.value) || null
      if (scene && scene.assets) return scene
      try {
        const comp = this.selectComponent('#avatar-xr-scene')
        if (comp && comp.scene && comp.scene.assets) return comp.scene
      } catch (err) {}
      return scene
    },

    onSceneReady(e) {
      this._scene = this.resolveSceneFromReadyEvent(e)
      const self = this
      setTimeout(function () {
        self.triggerEvent('ready', e.detail || {})
        self.scheduleShellSync()
      }, 0)
    },

    onSceneError(e) {
      console.error('[avatar-xr] scene error', e)
      this.triggerEvent('error', e.detail || {})
    },

    onAssetsProgress() {},

    resolveGltfComponent() {
      if (this._gltf) return this._gltf
      try {
        const xrGltf = this.selectComponent('#avatar-gltf')
        if (xrGltf && xrGltf.getComponent) {
          const gltf = xrGltf.getComponent('gltf')
          if (gltf) {
            this._gltf = gltf
            return gltf
          }
        }
      } catch (err) {}
      return null
    },

    hideShellTop() {
      this.resolveGltfComponent()
      if (this._gltf) setShellNodeVisible(this._gltf, 'top', false)
    },

    onAvatarGltfLoaded(e) {
      const detail = (e && e.detail) || {}
      const value = detail.value || detail
      const target = value.target || detail.target
      if (!target || !target.getComponent) {
        console.warn('[avatar-xr] gltf-loaded: invalid target', detail)
        return
      }
      this._gltf = target.getComponent('gltf')
      if (!this._gltf) {
        console.warn('[avatar-xr] gltf-loaded: gltf component missing')
        return
      }
      console.log('[avatar-xr] gltf loaded')
      this._modelBounds = measureAvatarBounds(this._gltf) || AVATAR_TEST_BOUNDS
      console.log('[avatar-xr] model bounds', this._modelBounds)

      if (this.isTopOverlayMode()) {
        this.hideShellTop()
        this.scheduleShellSync()
        return
      }

      this.clearTopOverlay()

      if (!getShellPrimitives(this._gltf, 'top').length) {
        console.warn('[avatar-xr] shell_top mesh not found in GLB')
        this.triggerEvent('error', {
          reason: 'missing_shell_top',
          message: 'GLB 中未找到 shell_top 节点'
        })
        return
      }
      setShellNodeVisible(this._gltf, 'top', false)
      this.tryApplyShellTop(0)
      if (!this._shellTopTexReady) {
        this.scheduleShellSync()
      }
    },

    onAssetsLoaded() {
      if (this.isTopOverlayMode()) return
      this.resolveGltfComponent()
      if (this._gltf && this._shellTopTexReady) {
        this.tryApplyShellTop(0)
      }
    },

    scheduleShellSync() {
      if (this._shellSyncTimer) clearTimeout(this._shellSyncTimer)
      const self = this
      this._shellSyncTimer = setTimeout(function () {
        self.syncShellTopFromOutfit()
      }, 60)
    },

    getTopTextureRawUrl() {
      const direct = (this.properties.topSrc || '').trim()
      if (direct) return direct

      const slotList = this.properties.tryonSlots
      if (Array.isArray(slotList) && slotList.length) {
        try {
          const app = getApp()
          const { pickTopSrcFromTryonSlots } = require('../../utils/tryonOutfitHelpers.js')
          const fromPropSlots = pickTopSrcFromTryonSlots(slotList, app)
          if (fromPropSlots) return fromPropSlots
        } catch (err) {}
      }

      const outfit = this.properties.outfit || {}
      const tex = extractTryonTextures(outfit.top)
      if (tex && tex.front) return tex.front
      const src = getItemSrc(outfit.top)
      if (src) return src

      try {
        const app = getApp()
        const { pickTopSrcFromTryonSlots } = require('../../utils/tryonOutfitHelpers.js')
        const slots = app.globalData && app.globalData.tryonItemSlots
        if (slots && slots.length) {
          const rebuilt = buildOutfitFromTryonSlots(slots, app)
          const fallbackTex = extractTryonTextures(rebuilt.top)
          if (fallbackTex && fallbackTex.front) return fallbackTex.front
          const rebuiltSrc = getItemSrc(rebuilt.top)
          if (rebuiltSrc) return rebuiltSrc
          const slotTop = pickTopSrcFromTryonSlots(slots, app)
          if (slotTop) return slotTop
        }
      } catch (err) {}

      return ''
    },

    getTopBackTextureRawUrl(frontRaw) {
      const outfit = this.properties.outfit || {}
      const tex = extractTryonTextures(outfit.top)
      if (tex && tex.back) return tex.back
      return frontRaw
    },

    rebuildTopOverlay() {
      const self = this
      const seq = (this._overlaySeq = (this._overlaySeq || 0) + 1)
      const frontRaw = this.getTopTextureRawUrl()

      if (!frontRaw) {
        if (this._warnedEmptyTopSrc) return
        this._warnedEmptyTopSrc = true
        console.warn('[avatar-xr] no top texture source (outfit/slots empty)')
        if (this.data.textureAssets.length || this.data.clothMeshes.length) {
          this.setData({ textureAssets: [], clothMeshes: [] })
        }
        this.hideShellTop()
        return
      }
      this._warnedEmptyTopSrc = false

      const backRaw = this.getTopBackTextureRawUrl(frontRaw)
      const rawUrls = frontRaw === backRaw ? [frontRaw] : [frontRaw, backRaw]

      resolveCloudUrlMap(rawUrls).then(function (urlMap) {
        if (seq !== self._overlaySeq) return

        const bounds = self._modelBounds || AVATAR_TEST_BOUNDS
        const anchor = getAvatarAnchorForSlot(self.properties.gender, 'top', bounds)
        if (!anchor) {
          console.warn('[avatar-xr] top anchor missing')
          return
        }

        const frontResolved = urlMap[frontRaw] || frontRaw
        const backResolved = urlMap[backRaw] || backRaw
        const hasDistinctBack = backRaw !== frontRaw

        flipImageVertical(frontResolved).then(function (flippedFront) {
          if (seq !== self._overlaySeq) return

          const textureAssets = [
            { id: 'tex-top-front', src: flippedFront || frontResolved }
          ]
          const clothMeshes = [
            {
              id: 'tex-top-front',
              texId: 'tex-top-front',
              position: anchor.front.position,
              rotation: anchor.front.rotation,
              scale: anchor.front.scale,
              renderOrder: anchor.renderOrder
            }
          ]

          if (hasDistinctBack) {
            textureAssets.push({ id: 'tex-top-back', src: backResolved })
            clothMeshes.push({
              id: 'tex-top-back',
              texId: 'tex-top-back',
              position: anchor.back.position,
              rotation: anchor.back.rotation,
              scale: anchor.back.scale,
              renderOrder: anchor.renderOrder
            })
          }

          self.hideShellTop()
          self.setData({ textureAssets: textureAssets, clothMeshes: clothMeshes })
          console.log('[avatar-xr] top overlay ready', (flippedFront || frontResolved).slice(0, 80))
        })
      }).catch(function (err) {
        console.error('[avatar-xr] top overlay rebuild failed', err)
        self.triggerEvent('error', { reason: 'overlay_rebuild_failed', message: err.message || 'overlay failed' })
      })
    },

    tryApplyShellTop(retryCount) {
      const self = this
      retryCount = retryCount || 0

      if (this._applyRetryTimer) {
        clearTimeout(this._applyRetryTimer)
        this._applyRetryTimer = null
      }

      if (!this._shellTopTexReady) {
        this._deferShellApply = true
        return
      }

      if (!this._scene) {
        this._deferShellApply = true
        if (retryCount < APPLY_RETRY_MAX) {
          this._applyRetryTimer = setTimeout(function () {
            self.tryApplyShellTop(retryCount + 1)
          }, 100)
        } else {
          console.warn('[avatar-xr] apply timeout: scene not ready')
        }
        return
      }

      this.resolveGltfComponent()
      if (!this._gltf) {
        this._deferShellApply = true
        if (retryCount < APPLY_RETRY_MAX) {
          this._applyRetryTimer = setTimeout(function () {
            self.tryApplyShellTop(retryCount + 1)
          }, 100)
        } else {
          console.warn('[avatar-xr] apply timeout: gltf not ready')
        }
        return
      }

      if (!isTextureAssetReady(this._scene, SHELL_TOP_TEX_ID)) {
        if (retryCount < APPLY_RETRY_MAX) {
          this._applyRetryTimer = setTimeout(function () {
            self.tryApplyShellTop(retryCount + 1)
          }, 100)
        } else {
          console.warn('[avatar-xr] apply timeout: texture asset not ready')
        }
        return
      }

      this._deferShellApply = false
      const meshCount = getShellPrimitives(this._gltf, 'top').length
      const ok = applyTextureToShell(
        this._gltf,
        'top',
        this._scene,
        SHELL_TOP_TEX_ID
      )
      if (!ok) {
        if (retryCount < APPLY_RETRY_MAX) {
          this._applyRetryTimer = setTimeout(function () {
            self.tryApplyShellTop(retryCount + 1)
          }, 120)
          return
        }
        console.warn('[avatar-xr] apply shell_top texture failed', { meshCount: meshCount })
        this.triggerEvent('error', {
          reason: 'shell_texture_apply_failed',
          message: 'shell_top 贴图应用失败'
        })
        return
      }
      setShellNodeVisible(this._gltf, 'top', true)
      console.log('[avatar-xr] shell_top applied', { meshCount: meshCount })
    },

    loadShellTopTexture(resolvedUrl) {
      const self = this
      if (this._shellTopTexLoadingUrl === resolvedUrl && this._shellTopTexLoadingPromise) {
        return this._shellTopTexLoadingPromise
      }
      const seq = (this._shellTexLoadSeq = (this._shellTexLoadSeq || 0) + 1)
      this._shellTopTexLoadingUrl = resolvedUrl
      this._shellTopTexLoadingPromise = loadSceneTextureAsset(
        this._scene,
        SHELL_TOP_TEX_ID,
        resolvedUrl,
        { cachedSrc: this._loadedTexSrc || '' }
      ).then(function (ready) {
        if (seq !== self._shellTexLoadSeq) return false
        if (ready) self._loadedTexSrc = resolvedUrl
        return !!ready
      }).finally(function () {
        if (self._shellTopTexLoadingUrl === resolvedUrl) {
          self._shellTopTexLoadingUrl = ''
          self._shellTopTexLoadingPromise = null
        }
      })
      return this._shellTopTexLoadingPromise
    },

    syncShellTopFromOutfit() {
      if (this.isTopOverlayMode()) {
        this.rebuildTopOverlay()
        return
      }

      this.clearTopOverlay()

      const rawUrl = this.getTopTextureRawUrl()
      if (!rawUrl) {
        if (this._warnedEmptyTopSrc) return
        this._warnedEmptyTopSrc = true
        console.warn('[avatar-xr] no top texture source (outfit/slots empty)')
        this._pendingTopUrl = ''
        this._resolvedTopUrl = ''
        this._loadedTexSrc = ''
        this._shellTopTexReady = false
        this._deferShellApply = false
        this._shellTexLoadSeq = (this._shellTexLoadSeq || 0) + 1
        this._shellTopTexLoadingUrl = ''
        this._shellTopTexLoadingPromise = null
        if (this._gltf) setShellNodeVisible(this._gltf, 'top', false)
        return
      }
      this._warnedEmptyTopSrc = false

      if (rawUrl === this._pendingTopUrl && this._shellTopTexReady) {
        this.tryApplyShellTop(0)
        return
      }

      const self = this
      resolveCloudUrl(rawUrl).then(function (url) {
        if (!url) {
          console.warn('[avatar-xr] resolve texture url failed', rawUrl)
          if (self._gltf) setShellNodeVisible(self._gltf, 'top', false)
          return
        }
        if (rawUrl === self._pendingTopUrl && url === self._resolvedTopUrl && self._shellTopTexReady) {
          self.tryApplyShellTop(0)
          return
        }
        if (url === self._resolvedTopUrl && self._shellTopTexLoadingPromise) {
          self._pendingTopUrl = rawUrl
          self._resolvedTopUrl = url
          self._shellTopTexLoadingPromise.then(function (ready) {
            if (!ready) return
            self._shellTopTexReady = true
            self.tryApplyShellTop(0)
          })
          return
        }
        self._pendingTopUrl = rawUrl
        self._resolvedTopUrl = url
        if (!self._scene) {
          self._deferShellApply = true
          return
        }

        self.loadShellTopTexture(url).then(function (ready) {
          if (!ready) {
            console.warn('[avatar-xr] load shell texture failed', url)
            return
          }
          self._shellTopTexReady = true
          console.log('[avatar-xr] shell texture ready', url.slice(0, 80))
          self.tryApplyShellTop(0)
        }).catch(function (err) {
          console.error('[avatar-xr] load shell texture error', err)
        })
      }).catch(function (err) {
        console.error('[avatar-xr] resolve texture failed', err)
      })
    }
  }
})
