let getImageUrl = (p) => (p && typeof p === 'string' ? p : '')
try {
  const img = require('../../../utils/image.js')
  if (img && img.getImageUrl) getImageUrl = img.getImageUrl
} catch (e) { console.warn('[item-entry] image utils fallback', e) }

// 单品录入页面：拍照 → 预览确认 → AI处理识别
// 类型与品类数据与 category-detail 保持一致
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
    spriteUrl: '',
    step: 'camera', // camera | preview | processing
    tempImagePath: '',
    processedImagePath: '',
    progress: 0,
    spriteMessage: '我觉得这是一件暖和的秋季毛衣，对吗？',
    itemType: '上衣',
    itemTypeId: 'tops',
    itemCategory: '毛衣',
    itemCategoryId: 'sweater',
    categoryTabs: CATEGORY_TABS,
    categoryOptions: [], // 当前类型下的品类列表
    showTypePicker: false,
    showCategoryPicker: false,
    showEditAllPanel: false,
    showCustomTypeInput: false,
    showCustomCategoryInput: false,
    customInputValue: ''
  },

  _refreshCategoryTabs() {
    const app = getApp()
    const customTypes = app.getCustomTypes ? app.getCustomTypes() : []
    const tabs = [...CATEGORY_TABS]
    customTypes.forEach(t => { if (t.id && t.name) tabs.push({ id: t.id, name: t.name }) })
    this.setData({ categoryTabs: tabs })
  },

  onLoad(options) {
    try {
      const sys = wx.getSystemInfoSync()
      this.setData({
        statusBarHeight: sys.statusBarHeight || 20,
        spriteUrl: getImageUrl('/images/sprite.webp')
      })
    } catch (e) {
      this.setData({ statusBarHeight: 20, spriteUrl: getImageUrl('/images/sprite.webp') })
    }
    this._refreshCategoryTabs()
  },

  onTakePhoto() {
    wx.chooseMedia({
      count: 1,
      mediaType: ['image'],
      sourceType: ['camera'],
      success: (res) => {
        const path = res.tempFiles[0] && res.tempFiles[0].tempFilePath
        if (path) {
          this.setData({ step: 'preview', tempImagePath: path })
        }
      },
      fail: (err) => {
        wx.showToast({ title: '请授权摄像头', icon: 'none' })
      }
    })
  },

  onAlbumUpload() {
    wx.showModal({
      title: '授权说明',
      content: '图库上传需要访问您的相册以选取本地图片。授权后即可选择图片进行录入，是否同意？',
      confirmText: '同意',
      cancelText: '取消',
      success: (res) => {
        if (res.confirm) {
          wx.chooseMedia({
            count: 1,
            mediaType: ['image'],
            sourceType: ['album'],
            success: (res) => {
              const path = res.tempFiles[0] && res.tempFiles[0].tempFilePath
              if (path) {
                this.setData({ step: 'preview', tempImagePath: path })
              }
            },
            fail: (err) => {
              wx.showToast({ title: '请授权相册访问', icon: 'none' })
            }
          })
        }
      }
    })
  },

  onRetake() {
    this.onTakePhoto()
  },

  onConfirm() {
    this.setData({ step: 'processing', progress: 0 })
    this.simulateProgress()
    // 模拟 AI 抠图：实际应调用后端 API，此处用原图
    this.setData({ processedImagePath: this.data.tempImagePath })
  },

  simulateProgress() {
    let progress = 0
    const timer = setInterval(() => {
      progress += 10
      if (progress >= 100) {
        clearInterval(timer)
        progress = 100
      }
      this.setData({ progress })
    }, 150)
  },

  onSpriteYes() {
    wx.showToast({ title: '感谢确认', icon: 'success' })
  },

  onSpriteNo() {
    wx.showModal({
      title: '重新识别',
      content: '请点击「手动编辑」修改分类',
      showCancel: false
    })
  },

  onEditAll() {
    this._refreshCategoryTabs()
    this.setData({ showEditAllPanel: true, categoryOptions: getCategoryOptionsWithCustom(this.data.itemTypeId) })
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
      this.setData({ showTypePicker: false, showEditAllPanel: false, showCustomTypeInput: true, customInputValue: '' })
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
      showEditAllPanel: false
    })
  },

  onSelectCategory(e) {
    const id = e.currentTarget.dataset.id
    const name = e.currentTarget.dataset.name
    if (id === '__custom_category__') {
      this.setData({ showCategoryPicker: false, showEditAllPanel: false, showCustomCategoryInput: true, customInputValue: '' })
      return
    }
    this.setData({
      itemCategoryId: id,
      itemCategory: name,
      showCategoryPicker: false,
      showEditAllPanel: false
    })
  },

  onSelectTypeInEditAll(e) {
    const id = e.currentTarget.dataset.id
    const name = e.currentTarget.dataset.name
    if (id === '__custom_type__') {
      this.setData({ showEditAllPanel: false, showCustomTypeInput: true, customInputValue: '' })
      return
    }
    const opts = getCategoryOptionsWithCustom(id)
    const first = opts[0]
    this.setData({
      itemTypeId: id,
      itemType: name,
      itemCategoryId: first ? first.id : 'default',
      itemCategory: first ? first.name : name,
      categoryOptions: opts
    })
  },

  onSelectCategoryInEditAll(e) {
    const id = e.currentTarget.dataset.id
    const name = e.currentTarget.dataset.name
    if (id === '__custom_category__') {
      this.setData({ showEditAllPanel: false, showCustomCategoryInput: true, customInputValue: '' })
      return
    }
    this.setData({ itemCategoryId: id, itemCategory: name })
  },

  onCustomTypeInput(e) { this.setData({ customInputValue: (e.detail && e.detail.value) || '' }) },
  onCustomCategoryInput(e) { this.setData({ customInputValue: (e.detail && e.detail.value) || '' }) },

  onCustomTypeConfirm() {
    const name = (this.data.customInputValue || '').trim()
    if (!name) { wx.showToast({ title: '请输入分类名称', icon: 'none' }); return }
    const app = getApp()
    const customTypes = (app.getCustomTypes ? app.getCustomTypes() : []).slice()
    const newId = 'custom_' + Date.now()
    customTypes.push({ id: newId, name })
    if (app.saveCustomTypes) app.saveCustomTypes(customTypes)
    this._refreshCategoryTabs()
    this.setData({
      itemTypeId: newId, itemType: name, itemCategoryId: 'default', itemCategory: name,
      categoryOptions: [{ id: 'default', name }],
      showCustomTypeInput: false, customInputValue: ''
    })
    wx.showToast({ title: '已添加自定义类型', icon: 'none' })
  },

  onCustomCategoryConfirm() {
    const name = (this.data.customInputValue || '').trim()
    if (!name) { wx.showToast({ title: '请输入品类名称', icon: 'none' }); return }
    const typeId = this.data.itemTypeId
    const app = getApp()
    const config = app.getPrivateSubConfig ? app.getPrivateSubConfig() : {}
    const cfg = config[typeId] || {}
    const subs = (cfg.subs || []).slice()
    const newId = 'custom_' + Date.now()
    subs.push({ id: newId, name })
    const newConfig = Object.assign({}, config, { [typeId]: Object.assign({}, cfg, { subs }) })
    if (app.savePrivateSubConfig) app.savePrivateSubConfig(newConfig)
    this.setData({
      itemCategoryId: newId, itemCategory: name,
      categoryOptions: getCategoryOptionsWithCustom(typeId),
      showCustomCategoryInput: false, customInputValue: ''
    })
    wx.showToast({ title: '已添加自定义品类', icon: 'none' })
  },

  onBlockTap() {},

  onCloseCustomInput() {
    this.setData({ showCustomTypeInput: false, showCustomCategoryInput: false, customInputValue: '' })
  },

  onClosePicker() {
    this.setData({ showTypePicker: false, showCategoryPicker: false, showEditAllPanel: false })
  },

  onConfirmSave() {
    if (!getApp().requireGuestLoginForSave()) return
    const { itemTypeId, itemCategoryId, processedImagePath, tempImagePath } = this.data
    const imagePath = processedImagePath || tempImagePath
    if (!imagePath || !itemTypeId || !itemCategoryId) {
      wx.showToast({ title: '请完善识别详情', icon: 'none' })
      return
    }
    const app = getApp()
    const fs = wx.getFileSystemManager()
    fs.saveFile({
      tempFilePath: imagePath,
      success: (res) => {
        app.addUserWardrobeItem(itemTypeId, itemCategoryId, res.savedFilePath)
        wx.showToast({ title: '已保存', icon: 'success' })
        setTimeout(() => wx.navigateBack(), 1200)
      },
      fail: (err) => {
        // 若 saveFile 失败（如已为本地文件），直接使用原路径
        app.addUserWardrobeItem(itemTypeId, itemCategoryId, imagePath)
        wx.showToast({ title: '已保存', icon: 'success' })
        setTimeout(() => wx.navigateBack(), 1200)
      }
    })
  },

  onManualEdit() {
    wx.showToast({ title: '手动编辑', icon: 'none' })
  },

  onBack() {
    if (this.data.step === 'processing') {
      wx.showModal({
        title: '确认退出',
        content: '当前录入未保存，确定要退出吗？',
        success: (res) => {
          if (res.confirm) wx.navigateBack()
        }
      })
    } else {
      wx.navigateBack()
    }
  }
})
