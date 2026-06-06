const { getModel3dUrl } = require('../../config/cdn.js')
const { getAnchorsForGender, getActiveSlotKeys } = require('../../utils/tryon3dAnchors.js')
const { extractTryonTextures } = require('../../utils/wardrobeItem.js')
const { resolveCloudUrlMap } = require('../../utils/cloudFileUrl.js')
const { normalizeTryonGender } = require('../../utils/clothingPositions.js')

Component({
  properties: {
    gender: { type: String, value: 'female' },
    outfit: { type: Object, value: {} },
    sceneHeight: { type: Number, value: 420 }
  },

  data: {
    modelUrl: '',
    textureAssets: [],
    clothMeshes: [],
    sceneReady: false
  },

  observers: {
    'gender, outfit.**': function () {
      this.scheduleRebuild()
    }
  },

  lifetimes: {
    attached() {
      this.scheduleRebuild()
    },
    detached() {
      if (this._rebuildTimer) clearTimeout(this._rebuildTimer)
    }
  },

  methods: {
    scheduleRebuild() {
      if (this._rebuildTimer) clearTimeout(this._rebuildTimer)
      var self = this
      this._rebuildTimer = setTimeout(function () {
        self.rebuildScene()
      }, 100)
    },

    normalizeOutfit(outfit) {
      var o = outfit || {}
      var suit = o.suit || o.dress || null
      var hasSuit = !!suit
      return {
        inner: o.inner || null,
        top: hasSuit ? null : (o.top || null),
        bottom: hasSuit ? null : (o.bottom || null),
        suit: hasSuit ? suit : null,
        shoes: o.shoes || null
      }
    },

    rebuildScene() {
      var self = this
      var seq = (this._rebuildSeq = (this._rebuildSeq || 0) + 1)
      var gender = normalizeTryonGender(this.properties.gender)
      var modelUrl = getModel3dUrl(gender)
      var outfit = this.normalizeOutfit(this.properties.outfit)
      var anchors = getAnchorsForGender(gender)
      var slotKeys = getActiveSlotKeys(outfit)
      var rawUrls = []
      var pending = []

      slotKeys.forEach(function (slotKey) {
        var item = outfit[slotKey]
        var tex = extractTryonTextures(item)
        if (!tex || !tex.front) return
        pending.push({ slotKey: slotKey, side: 'front', raw: tex.front })
        pending.push({
          slotKey: slotKey,
          side: 'back',
          raw: tex.back || tex.front
        })
      })

      pending.forEach(function (p) {
        if (p.raw && rawUrls.indexOf(p.raw) < 0) rawUrls.push(p.raw)
      })

      resolveCloudUrlMap(rawUrls).then(function (urlMap) {
        if (seq !== self._rebuildSeq) return
        var textureAssets = []
        var clothMeshes = []
        var assetSeen = {}

        pending.forEach(function (p) {
          var resolved = urlMap[p.raw] || p.raw
          if (!resolved) return
          var assetId = 'tex-' + p.slotKey + '-' + p.side
          if (!assetSeen[assetId]) {
            assetSeen[assetId] = true
            textureAssets.push({ id: assetId, src: resolved })
          }
          var anchorDef = anchors[p.slotKey]
          if (!anchorDef) return
          var sideAnchor = anchorDef[p.side] || anchorDef.front
          clothMeshes.push({
            id: assetId,
            texId: assetId,
            position: sideAnchor.position,
            rotation: sideAnchor.rotation,
            scale: sideAnchor.scale,
            renderOrder: anchorDef.renderOrder || 0
          })
        })

        clothMeshes.sort(function (a, b) {
          return (a.renderOrder || 0) - (b.renderOrder || 0)
        })

        self.setData({
          modelUrl: modelUrl,
          textureAssets: textureAssets,
          clothMeshes: clothMeshes
        })
      }).catch(function (err) {
        console.error('tryon-xr rebuild failed', err)
        self.triggerEvent('error', { message: 'rebuild_failed' })
      })
    },

    onSceneReady(e) {
      this.setData({ sceneReady: true })
      this.triggerEvent('ready', e.detail || {})
    },

    onSceneError(e) {
      console.error('tryon-xr scene error', e)
      this.triggerEvent('error', e.detail || {})
    }
  }
})
