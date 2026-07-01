// pages/tryon/tryon.js
const app = getApp();
const {
  emptyOutfit,
  applyTabPickToOutfit
} = require('../../utils/tryonOutfitHelpers.js')
const { normalizeTryonGender } = require('../../utils/clothingPositions.js')
const { applyAiWatermark } = require('../../utils/aiWatermark.js')

Page({
  data: {
    gender: 'female',
    outfit: {
      top: null,
      bottom: null,
      dress: null,
      shoes: null
    },
    wardrobeItems: [],      // 衣橱物品列表
    selectedCategory: 'top', // 当前选择的衣物类别
    categories: [
      { key: 'top', name: '上衣', icon: '👕' },
      { key: 'bottom', name: '下装', icon: '👖' },
      { key: 'dress', name: '连衣裙', icon: '👗' },
      { key: 'shoes', name: '鞋子', icon: '👟' }
    ],
    adjustSlot: 'top',
    adjustStepPx: 18,
    meshHistories: {
      top: { undo: [], redo: [] },
      bottom: { undo: [], redo: [] },
      dress: { undo: [], redo: [] },
      shoes: { undo: [], redo: [] }
    },
    manualAdjustments: {
      top: { x: 0, y: 0, scaleX: 1, scaleY: 1 },
      bottom: { x: 0, y: 0, scaleX: 1, scaleY: 1 },
      dress: { x: 0, y: 0, scaleX: 1, scaleY: 1 },
      shoes: { x: 0, y: 0, scaleX: 1, scaleY: 1 }
    },
    use3DTryon: true,
    tryon3DFallback: false,
    xrSceneHeight: 420
  },

  onLoad(options) {
    var o = options || {}
    this._genderLockedByLaunch = !!(o.gender != null && String(o.gender).trim() !== '')
    this.initLaunchState(o)
    this.loadUserGender()
    this.initTryon3DMode()
    var self = this
    setTimeout(function () {
      self.loadWardrobe()
    }, 0)
  },

  initTryon3DMode() {
    var can3D = this.checkXrFrameSupport()
    var h = 420
    try {
      var sys = wx.getSystemInfoSync()
      h = Math.round((sys.windowHeight || 667) * 0.42)
    } catch (e) {}
    this.setData({
      use3DTryon: can3D,
      tryon3DFallback: !can3D,
      xrSceneHeight: h
    })
  },

  checkXrFrameSupport() {
    try {
      var sys = wx.getSystemInfoSync()
      if (sys.platform === 'devtools') return true
      var sdk = String(sys.SDKVersion || '0')
      var parts = sdk.split('.').map(function (n) { return parseInt(n, 10) || 0 })
      if (parts[0] > 2) return true
      if (parts[0] === 2 && parts[1] >= 32) return true
      return false
    } catch (e) {
      return false
    }
  },

  onTryon3DError() {
    if (this.data.tryon3DFallback) return
    this.setData({ tryon3DFallback: true })
    wx.showToast({ title: '3D 不可用，已切换 2D', icon: 'none' })
  },

  toggleTryonMode() {
    if (!this.data.use3DTryon) return
    this.setData({ tryon3DFallback: !this.data.tryon3DFallback })
  },

  onHide() {
    this._clearGlobalLoadingMask()
  },

  onUnload() {
    this._clearGlobalLoadingMask()
  },

  /** 避免 showLoading 未配对 hide 导致真机返回后全局遮罩卡死无法点击 */
  _clearGlobalLoadingMask: function() {
    try {
      wx.hideLoading()
    } catch (e) {}
    try {
      wx.hideToast()
    } catch (e2) {}
  },

  initLaunchState(options) {
    var opt = options || {}
    var raw = opt.gender != null && String(opt.gender).trim() !== ''
      ? decodeURIComponent(String(opt.gender))
      : ''
    var g = normalizeTryonGender(
      raw || app.globalData.userGender || app.globalData.modelGender || 'female'
    )
    var launchOutfit = this.buildLaunchOutfit()
    this.setData({
      gender: g,
      outfit: launchOutfit
    })
  },

  buildLaunchOutfit() {
    var launchOutfit = app.globalData.tryonInitialOutfit;
    if (launchOutfit && typeof launchOutfit === 'object') {
      return Object.assign(emptyOutfit(), launchOutfit);
    }
    var slots = Array.isArray(app.globalData.tryonItemSlots) ? app.globalData.tryonItemSlots : [];
    var ctx = app.globalData.tryonLaunchContext || {};
    var tabId = ctx.activeTab || ctx.categoryId || '';
    var next = emptyOutfit();
    for (var i = 0; i < slots.length; i++) {
      var src = slots[i];
      if (!src) continue;
      next = applyTabPickToOutfit(next, tabId, src);
    }
    return next;
  },

  // 加载用户性别（若从其它页带了 ?gender= 则不再用本地存储覆盖，避免男女模错配）
  loadUserGender() {
    if (this._genderLockedByLaunch) return
    var userGender = app.globalData.userGender
    if (!userGender) {
      try {
        userGender = wx.getStorageSync('userGender')
      } catch (e) {}
    }
    if (userGender) {
      this.setData({ gender: normalizeTryonGender(userGender) })
    }
  },

  // 加载衣橱数据（云库 imageUrl 常为 cloud://，列表展示与 Canvas 需可访问的 https）
  async loadWardrobe() {
    if (!wx.cloud || typeof wx.cloud.database !== 'function') {
      this.setData({ wardrobeItems: [] })
      return
    }
    this._wardrobeLoadSeq = (this._wardrobeLoadSeq || 0) + 1
    var seq = this._wardrobeLoadSeq
    var self = this
    wx.showLoading({ title: '加载衣橱...', mask: false })
    try {
      const db = wx.cloud.database()
      const getPromise = db.collection('wardrobe').get()
      const timeoutPromise = new Promise(function (_, reject) {
        setTimeout(function () {
          reject(new Error('wardrobe_load_timeout'))
        }, 12000)
      })
      const res = await Promise.race([getPromise, timeoutPromise])
      if (seq !== self._wardrobeLoadSeq) return
      let items = res.data || []
      const fileIDs = []
      items.forEach(function (it) {
        var u = it && it.imageUrl
        if (typeof u === 'string' && u.indexOf('cloud://') === 0 && fileIDs.indexOf(u) < 0) {
          fileIDs.push(u)
        }
      })
      if (fileIDs.length && wx.cloud.getTempFileURL) {
        const tempRes = await wx.cloud.getTempFileURL({ fileList: fileIDs })
        const map = {}
        if (tempRes.fileList) {
          tempRes.fileList.forEach(function (f) {
            if (f.fileID && f.tempFileURL) map[f.fileID] = f.tempFileURL
          })
        }
        items = items.map(function (it) {
          if (!it || !it.imageUrl) return it
          var u = it.imageUrl
          if (typeof u === 'string' && u.indexOf('cloud://') === 0 && map[u]) {
            return Object.assign({}, it, { imageUrl: map[u], _imageFileID: u })
          }
          return it
        })
      }
      if (seq !== self._wardrobeLoadSeq) return
      console.log('衣橱数据:', items)
      self.setData({ wardrobeItems: items })
    } catch (err) {
      console.error('加载衣橱失败', err)
      if (seq === self._wardrobeLoadSeq) {
        self.setData({ wardrobeItems: [] })
      }
    } finally {
      wx.hideLoading()
    }
  },

  // 切换衣物类别（H：与画布编辑槽 adjustSlot 同步，便于组件 editingSlot 高亮对应衣物）
  switchCategory(e) {
    var category = e.currentTarget.dataset.category
    if (!category) return
    var slotMap = { top: 'top', bottom: 'bottom', dress: 'dress', shoes: 'shoes' }
    var slot = slotMap[category]
    var patch = { selectedCategory: category }
    if (slot) patch.adjustSlot = slot
    this.setData(patch)
  },

  // 选择衣物
  selectClothing(e) {
    console.log('✅ selectClothing 被触发了', e);
    var item = e.currentTarget.dataset.item;
    var category = this.normalizeCategory(item.category || this.data.selectedCategory);
    var newOutfit = JSON.parse(JSON.stringify(this.data.outfit));
    
    // 如果选中连衣裙，清空上衣和下装
    if (category === 'dress') {
      newOutfit.dress = item;
      newOutfit.top = null;
      newOutfit.bottom = null;
    } else if (category === 'top') {
      newOutfit.top = item;
      if (newOutfit.dress) newOutfit.dress = null;
    } else if (category === 'bottom') {
      newOutfit.bottom = item;
      if (newOutfit.dress) newOutfit.dress = null;
    } else if (category === 'shoes') {
      newOutfit.shoes = item;
    }

    var slotMap = { top: 'top', bottom: 'bottom', dress: 'dress', shoes: 'shoes' }
    var sk = slotMap[category]
    var patch = { outfit: newOutfit }
    if (sk) {
      var allAdj = Object.assign({}, this.data.manualAdjustments)
      var prev = allAdj[sk] || {}
      allAdj[sk] = Object.assign({}, prev, { mesh: null })
      patch.manualAdjustments = allAdj
      var mh = Object.assign({}, this.data.meshHistories || {})
      mh[sk] = { undo: [], redo: [] }
      patch.meshHistories = mh
    }
    this.setData(patch);
    wx.showToast({ title: '已应用', icon: 'success', duration: 1000 });
  },

  normalizeCategory(category) {
    var c = (category || '').toLowerCase()
    if (c === 'tops' || c === 'top' || c === '上衣') return 'top'
    if (c === 'bottoms' || c === 'bottom' || c === '下装' || c === '裤子' || c === '裙装') return 'bottom'
    if (c === 'sets' || c === 'dress' || c === 'suit' || c === '连衣裙' || c === '套装') return 'dress'
    if (c === 'shoes' || c === 'shoe' || c === '鞋子') return 'shoes'
    return c
  },

  selectAdjustSlot(e) {
    var slot = e.currentTarget.dataset.slot;
    if (!slot) return;
    this.setData({ adjustSlot: slot });
  },

  /**
   * 顶栏：上衣 / 下装 / 套装 — 同步当前编辑槽与衣橱分类（套装对应 outfit.suit 与组件内 dress 调整键）
   */
  selectTryonTopTab(e) {
    var tab = (e.currentTarget.dataset && e.currentTarget.dataset.tab) || ''
    if (tab === 'top') {
      this.setData({ adjustSlot: 'top', selectedCategory: 'top' })
      return
    }
    if (tab === 'bottom') {
      this.setData({ adjustSlot: 'bottom', selectedCategory: 'bottom' })
      return
    }
    if (tab === 'suit') {
      this.setData({ adjustSlot: 'dress', selectedCategory: 'dress' })
    }
  },

  nudgeClothing(e) {
    var direction = e.currentTarget.dataset.direction;
    var slot = this.data.adjustSlot;
    if (!direction || !slot) return;
    var step = Number(this.data.adjustStepPx) || 18;
    var delta = { x: 0, y: 0 };
    if (direction === 'up') delta.y = -step;
    if (direction === 'down') delta.y = step;
    if (direction === 'left') delta.x = -step;
    if (direction === 'right') delta.x = step;
    var all = Object.assign({}, this.data.manualAdjustments || {});
    var current = all[slot] || {};
    var nextSlot = Object.assign({}, current, {
      x: (current.x || 0) + delta.x,
      y: (current.y || 0) + delta.y,
      scaleX: current.scaleX != null ? current.scaleX : 1,
      scaleY: current.scaleY != null ? current.scaleY : 1
    });
    if (current.mesh) nextSlot.mesh = meshDeform.cloneMesh(current.mesh);
    all[slot] = nextSlot;
    this.setData({ manualAdjustments: all });
  },

  resetAdjustSlot() {
    var slot = this.data.adjustSlot;
    if (!slot) return;
    var all = Object.assign({}, this.data.manualAdjustments || {});
    all[slot] = { x: 0, y: 0, scaleX: 1, scaleY: 1 };
    var mh = Object.assign({}, this.data.meshHistories || {});
    mh[slot] = { undo: [], redo: [] };
    this.setData({ manualAdjustments: all, meshHistories: mh });
  },

  onSlotSwitch(e) {
    if (!e || !e.detail || !Object.prototype.hasOwnProperty.call(e.detail, 'adjustKey')) return
    this.setData({ adjustSlot: e.detail.adjustKey })
  },

  onMeshInit(e) {
    var d = e.detail || {};
    if (!d.adjustKey || !d.mesh) return;
    var all = Object.assign({}, this.data.manualAdjustments);
    var cur = all[d.adjustKey] || {};
    all[d.adjustKey] = Object.assign({}, cur, { mesh: meshDeform.cloneMesh(d.mesh) });
    this.setData({ manualAdjustments: all });
  },

  onMeshDragEnd(e) {
    var d = e.detail || {};
    if (!d.adjustKey || !d.startMesh) return;
    var key = d.adjustKey;
    var hist = Object.assign({}, this.data.meshHistories || {});
    var h = hist[key] || { undo: [], redo: [] };
    h = { undo: (h.undo || []).slice(), redo: [] };
    h.undo.push(meshDeform.cloneMesh(d.startMesh));
    if (h.undo.length > 30) h.undo.shift();
    hist[key] = h;
    this.setData({ meshHistories: hist });
  },

  onMeshUndo() {
    this._applyMeshHistory('undo');
  },

  onMeshRedo() {
    this._applyMeshHistory('redo');
  },

  _applyMeshHistory(mode) {
    var slot = this.data.adjustSlot;
    var hist = (this.data.meshHistories || {})[slot];
    if (!hist) return;
    var undo = (hist.undo || []).slice();
    var redo = (hist.redo || []).slice();
    var all = Object.assign({}, this.data.manualAdjustments);
    var cur = Object.assign({}, all[slot] || {});
    var curMesh = cur.mesh ? meshDeform.cloneMesh(cur.mesh) : null;
    if (mode === 'undo') {
      if (!undo.length) return;
      var prev = undo.pop();
      if (curMesh) redo.push(curMesh);
      cur.mesh = prev ? meshDeform.cloneMesh(prev) : null;
    } else {
      if (!redo.length) return;
      var nxt = redo.pop();
      if (curMesh) undo.push(curMesh);
      cur.mesh = nxt ? meshDeform.cloneMesh(nxt) : null;
    }
    all[slot] = cur;
    var mh = Object.assign({}, this.data.meshHistories);
    mh[slot] = { undo: undo, redo: redo };
    this.setData({ manualAdjustments: all, meshHistories: mh });
  },

  onAdjustmentsChange(e) {
    var detail = (e && e.detail) || {};
    var all = detail.manualAdjustments;
    var key = detail.adjustKey;
    if (!all) return;
    this.setData({
      manualAdjustments: all,
      adjustSlot: key || this.data.adjustSlot
    });
  },

  // 清空穿搭
  clearOutfit() {
    this.setData({
      outfit: { top: null, bottom: null, dress: null, shoes: null }
    });
    wx.showToast({ title: '已清空', icon: 'none' });
  },

  // 保存穿搭照
  async saveOutfitImage() {
    if (this.data.use3DTryon && !this.data.tryon3DFallback) {
      var self = this
      wx.showModal({
        title: '保存穿搭照',
        content: '3D 试穿暂不支持直接导出，是否切换到 2D 后保存？',
        confirmText: '切换并保存',
        success: function (res) {
          if (!res.confirm) return
          self.setData({ tryon3DFallback: true }, function () {
            setTimeout(function () { self.saveOutfitImage() }, 400)
          })
        }
      })
      return
    }
    var modelComponent = this.selectComponent('#modelTryon');
    if (!modelComponent) {
      wx.showToast({ title: '组件未就绪', icon: 'none' });
      return;
    }

    wx.showLoading({ title: '生成穿搭照...' });
    try {
      var tempFilePath = await modelComponent.exportImage();
      var authResult = await this.requestAlbumPermission();
      if (!authResult) {
        wx.hideLoading();
        return;
      }
      var watermarkedPath = tempFilePath;
      try {
        watermarkedPath = await applyAiWatermark(this, 'aiWatermarkCanvas', tempFilePath, 'AI生成');
      } catch (wmErr) {
        console.warn('AI watermark failed, save original', wmErr);
      }
      await wx.saveImageToPhotosAlbum({ filePath: watermarkedPath });
      wx.hideLoading();
      wx.showToast({ title: '已保存到相册', icon: 'success' });
      this.saveOutfitRecord(tempFilePath);
    } catch (err) {
      wx.hideLoading();
      console.error('保存失败', err);
      if (err.errMsg && err.errMsg.includes('auth deny')) {
        wx.showModal({
          title: '提示',
          content: '需要相册权限才能保存照片，请在设置中开启',
          confirmText: '去设置',
          success(res) {
            if (res.confirm) {
              wx.openSetting();
            }
          }
        });
      } else {
        wx.showToast({ title: '保存失败', icon: 'error' });
      }
    }
  },

  // 请求相册权限
  requestAlbumPermission() {
    return new Promise((resolve) => {
      wx.getSetting({
        success(res) {
          if (res.authSetting['scope.writePhotosAlbum']) {
            resolve(true);
          } else {
            wx.authorize({
              scope: 'scope.writePhotosAlbum',
              success() { resolve(true); },
              fail() { resolve(false); }
            });
          }
        },
        fail() { resolve(false); }
      });
    });
  },

  // 保存穿搭记录到数据库（可选）
  async saveOutfitRecord(imagePath) {
    try {
      const cloudPath = `outfit-records/${Date.now()}.png`;
      const uploadRes = await wx.cloud.uploadFile({
        cloudPath: cloudPath,
        filePath: imagePath
      });

      const db = wx.cloud.database();
      await db.collection('outfit_history').add({
        data: {
          imageUrl: uploadRes.fileID,
          outfit: this.data.outfit,
          gender: this.data.gender,
          manualAdjustments: this.data.manualAdjustments,
          createTime: db.serverDate()
        }
      });
      console.log('穿搭记录已保存');
    } catch (err) {
      console.error('保存记录失败', err);
    }
  },

  // 返回上一页（项目未配置 tabBar，switchTab 会失败；用 reLaunch 回衣橱入口兜底）
  onBack() {
    var self = this
    wx.navigateBack({
      delta: 1,
      fail: function() {
        wx.reLaunch({
          url: '/pages/wardrobe/wardrobe',
          fail: function () {
            wx.reLaunch({ url: '/pages/model/model' })
          }
        })
      },
      complete: function () {
        self._clearGlobalLoadingMask()
      }
    })
  }
});