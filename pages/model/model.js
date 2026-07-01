const { getImageUrl } = require('../../utils/image.js')
const { getModelImagePath } = require('../../utils/clothingPositions.js')
const weatherService = require('../../service/weather.js')
const homeWeather = require('../../utils/homeWeather.js')
const colorPicker = require('../../utils/colorPicker.js')
const homeSceneBg = require('../../utils/homeSceneBg.js')
const wardrobeDisplay = require('../../utils/wardrobeDisplay.js')
const tryonFavorite = require('../../utils/tryonFavorite.js')
const { removeSrcFromOutfit } = require('../../utils/tryonOutfitHelpers.js')
const { MAIN_DIARY, MAIN_WARDROBE, MAIN_MINE, reLaunchMain } = require('../../utils/mainTabs.js')
const locationAuth = require('../../utils/locationAuth.js')
const qweatherIcon = require('../../utils/qweatherIcon.js')
const { getSpriteImageUrl, getSpriteCdnUrl } = require('../../utils/spriteImage.js')
const { textToWeatherEffect } = require('../../utils/weatherEffect.js')

// 3D 模特全身穿搭展示页面
// 温度区间 -> 穿搭类型（对应上衣、下衣、鞋子的整体搭配）
const TEMP_RANGES = {
  hot: { min: 28, max: 50, label: '清凉', top: '短袖/背心', bottom: '短裤/短裙', shoes: '凉鞋' },
  warm: { min: 20, max: 27, label: '舒适', top: 'T恤/衬衫', bottom: '长裤/半裙', shoes: '休闲鞋' },
  cool: { min: 10, max: 19, label: '保暖', top: '毛衣/薄外套', bottom: '长裤', shoes: '帆布鞋' },
  cold: { min: -20, max: 9, label: '御寒', top: '厚外套/羽绒服', bottom: '厚长裤', shoes: '靴子' }
}

function getTempLevel(temp) {
  const t = parseInt(temp, 10)
  if (t >= 28) return 'hot'
  if (t >= 20) return 'warm'
  if (t >= 10) return 'cool'
  return 'cold'
}

function getOutfitImagePath(gender, tempLevel) {
  return getImageUrl(`/images/model/outfits/${gender}-${tempLevel}.png`)
}

// 中国城市列表（直辖市、省会、计划单列市及主要地级市，供切换定位筛选）
const CHINESE_CITIES = [
  '北京', '上海', '天津', '重庆', '深圳', '广州', '杭州', '南京', '成都', '武汉', '西安', '苏州', '郑州', '长沙', '沈阳', '青岛', '宁波', '东莞', '无锡', '昆明',
  '大连', '厦门', '合肥', '佛山', '福州', '哈尔滨', '济南', '温州', '南宁', '长春', '石家庄', '常州', '泉州', '南昌', '贵阳', '太原', '嘉兴', '南通', '金华', '珠海',
  '惠州', '徐州', '海口', '乌鲁木齐', '绍兴', '中山', '台州', '兰州', '泰州', '济南', '潍坊', '保定', '镇江', '扬州', '桂林', '唐山', '三亚', '宜昌', '襄阳', '洛阳',
  '临沂', '江门', '汕头', '泰安', '漳州', '邯郸', '芜湖', '盐城', '遵义', '包头', '株洲', '绵阳', '赣州', '阜阳', '银川', '遵义', '衡阳', '南阳', '威海', '湛江',
  '大庆', '柳州', '珠海', '鞍山', '咸阳', '九江', '商丘', '信阳', '周口', '新乡', '开封', '芜湖', '蚌埠', '安庆', '马鞍山', '淮安', '连云港', '宿迁', '湖州', '衢州',
  '丽水', '舟山', '莆田', '龙岩', '三明', '南平', '宁德', '漳州', '韶关', '梅州', '潮州', '揭阳', '肇庆', '清远', '阳江', '茂名', '湛江', '韶关', '河源', '云浮',
  '自贡', '攀枝花', '泸州', '德阳', '广元', '遂宁', '内江', '乐山', '南充', '眉山', '宜宾', '广安', '达州', '雅安', '巴中', '资阳', '阿坝', '甘孜', '凉山',
  '遵义', '六盘水', '安顺', '毕节', '铜仁', '曲靖', '玉溪', '保山', '昭通', '丽江', '普洱', '临沧', '楚雄', '红河', '文山', '西双版纳', '大理', '德宏', '怒江', '迪庆',
  '拉萨', '日喀则', '昌都', '林芝', '山南', '那曲', '阿里',
  '延安', '榆林', '汉中', '安康', '商洛', '铜川', '宝鸡', '咸阳', '渭南',
  '嘉峪关', '金昌', '白银', '天水', '武威', '张掖', '平凉', '酒泉', '庆阳', '定西', '陇南', '临夏', '甘南',
  '西宁', '海东', '海北', '黄南', '海南', '果洛', '玉树', '海西',
  '石嘴山', '吴忠', '固原', '中卫',
  '克拉玛依', '吐鲁番', '哈密', '昌吉', '博尔塔拉', '巴音郭楞', '阿克苏', '克孜勒苏', '喀什', '和田', '伊犁', '塔城', '阿勒泰',
  '呼和浩特', '乌海', '赤峰', '通辽', '鄂尔多斯', '呼伦贝尔', '巴彦淖尔', '乌兰察布', '兴安盟', '锡林郭勒盟', '阿拉善盟',
  '三沙', '儋州', '五指山', '琼海', '文昌', '万宁', '东方', '定安', '屯昌', '澄迈', '临高', '白沙', '昌江', '乐东', '陵水', '保亭', '琼中'
]

function filterCities(keyword) {
  const k = String(keyword || '').trim()
  if (!k) return CHINESE_CITIES.slice()
  return CHINESE_CITIES.filter(function (name) {
    return name.indexOf(k) !== -1
  })
}

// 角色信息录入：无存档时使用的常规男/女标准数据（身高 cm、体重 kg、三围 胸/腰/臀）
const DEFAULT_ROLE_BODY = {
  female: { height: '163', weight: '52', bustWaistHip: '84 / 62 / 88' },
  male: { height: '175', weight: '68', bustWaistHip: '95 / 80 / 98' }
}

const HOME_TRYON_VISIBLE_SLOTS = 6
const HOME_TRYON_PANEL_STORAGE_KEY = 'privclo_home_tryon_panel_collapsed'
const SOLID_BG_STORAGE_KEY = 'privclo_solid_bg_color'
const DEFAULT_SOLID_BG_COLOR = '#EFF6FC'
const SOLID_COLOR_PRESETS = [
  { color: '#FFFFFF', name: '纯白' },
  { color: '#EFF6FC', name: '浅蓝白' },
  { color: '#D4EDFA', name: '天蓝浅' },
  { color: '#A7E0F6', name: '晴空' },
  { color: '#E5E7EB', name: '浅灰' },
  { color: '#D4E8F0', name: '雾蓝' },
  { color: '#F5E6E8', name: '浅粉' },
  { color: '#E8F0E8', name: '浅绿' },
  { color: '#EDE8F5', name: '浅紫' },
  { color: '#C5D8E8', name: '淡蓝' }
]

Page({
  data: {
    statusBarHeight: 20,
    headerTop: 32,
    gender: 'female',
    use3D: false,
    city: '深圳',
    temp: '22',
    weather: '晴',
    weatherIcon: 'sun',
    weatherIconCode: '100',
    weatherIconColor: qweatherIcon.getColorForIconCode('100'),
    weatherIconUrl: qweatherIcon.getQWeatherIconFallbackUrl(),
    modelOutfitSrc: '',
    modelDisplaySrc: '',
    modelDefaultUrl: '',
    spriteUrl: '',
    roleAvatarFemaleUrl: '',
    roleAvatarMaleUrl: '',
    outfitDesc: '',
    modelImgError: false,
    showCitySearch: false,
    citySearchKeyword: '',
    filteredCityList: [],
    hasAskedLocationPermission: false,
    showRoleEntryCard: false,
    roleNickname: '',
    roleHeight: '',
    roleWeight: '',
    roleBustWaistHip: '',
    roleBustWaistHipEnabled: false,
    forecast: [],
    chatWeather: {},
    chatWardrobe: {},
    chatProfile: {},
    chatGender: 'female',
    chatAge: null,
    showChatAssistant: false,
    showGenderPicker: false,
    genderPick: 'female',
    showBgModeSwitcher: false,
    activeBgMode: '',
    solidBgColor: DEFAULT_SOLID_BG_COLOR,
    solidBgColorInput: DEFAULT_SOLID_BG_COLOR,
    solidColorPresets: SOLID_COLOR_PRESETS,
    showSolidColorPicker: false,
    pickerHue: 0,
    pickerSat: 0,
    pickerVal: 100,
    pickerValTop: 0,
    svCanvasWidth: 280,
    svCanvasHeight: 120,
    indoorScenes: homeSceneBg.getSceneList('indoor'),
    outdoorScenes: homeSceneBg.getSceneList('outdoor'),
    indoorSceneId: homeSceneBg.getDefaultSceneId('indoor'),
    outdoorSceneId: homeSceneBg.getDefaultSceneId('outdoor'),
    indoorSceneImage: homeSceneBg.resolveScene('indoor').image,
    outdoorSceneImage: homeSceneBg.resolveScene('outdoor').image,
    showIndoorScenePicker: false,
    showOutdoorScenePicker: false,
    tryonItemSlots: [],
    selectedTryonSlotIndex: -1,
    homeTryonPanelCollapsed: false,
    homeTryonPanelTranslateX: 0,
    homeTryonPanelDragging: false,
    wardrobeHandleImage: wardrobeDisplay.getWardrobeDisplayImageUrl(),
    wardrobeHandleImgError: false,
    homeTryonFavorited: false,
    homeFavoriteOutfitId: '',
    showFavoriteTagPopup: false,
    favoriteTagSeasonIndex: 0,
    favoriteTagSceneIndex: 0,
    favoriteTagStyleIndex: 0,
    seasonOptions: tryonFavorite.SEASON_OPTIONS,
    sceneOptions: tryonFavorite.SCENE_OPTIONS,
    styleOptions: tryonFavorite.STYLE_OPTIONS
  },

  getRoleProfileKey() {
    return 'modelProfile_' + (this.data.gender || 'female')
  },

  onLoad(options) {
    if (!qweatherIcon.isSafeWeatherIconUrl(this.data.weatherIconUrl)) {
      this.setData({ weatherIconUrl: qweatherIcon.getQWeatherIconFallbackUrl() })
    }
    try {
      const sys = wx.getSystemInfoSync()
      const bar = sys.statusBarHeight || 20
      this.setData({
        statusBarHeight: bar,
        headerTop: bar + 12
      })
    } catch (e) {
      this.setData({ statusBarHeight: 20, headerTop: 32 })
    }
    const app = getApp()
    const savedGender = app.getUserGender()
    const showGenderPicker = !savedGender
    const gender = savedGender || options.gender || 'female'
    app.globalData.modelGender = gender
    app.globalData.modelDisplaySrc = getImageUrl(getModelImagePath(gender))
    this.setData({
      gender,
      genderPick: gender,
      showGenderPicker,
      modelImgError: false,
      modelDefaultUrl: getImageUrl(getModelImagePath(gender)),
      spriteUrl: getSpriteImageUrl(),
      roleAvatarFemaleUrl: getImageUrl('/images/role/avatar-female.png'),
      roleAvatarMaleUrl: getImageUrl('/images/role/avatar-male.png')
    })
    this.applyHomeWeatherFromStorage()
    this.refreshWeatherCapsuleIcon(this.data.weatherIconCode)
    this.applySolidBgColorFromStorage()
    this.applyHomeScenesFromStorage()
    this.syncTryonItemSlotsFromApp()
    this.loadHomeTryonPanelState()
    this.refreshWardrobeHandleImage()
    this.restoreHomeTryonFavoriteState()
    this.updateModelOutfit()
    this.updateChatContext()
  },

  onReady() {
    this.measureHomeTryonPanel()
  },

  refreshWardrobeHandleImage() {
    this.setData({
      wardrobeHandleImage: wardrobeDisplay.getWardrobeDisplayImageUrl(),
      wardrobeHandleImgError: false
    })
  },

  onWardrobeHandleImgError() {
    this.setData({ wardrobeHandleImgError: true })
  },

  loadHomeTryonPanelState() {
    try {
      const collapsed = !!wx.getStorageSync(HOME_TRYON_PANEL_STORAGE_KEY)
      this.setData({ homeTryonPanelCollapsed: collapsed })
    } catch (e) {}
  },

  measureHomeTryonPanel() {
    const self = this
    wx.createSelectorQuery().in(this)
      .select('.home-tryon-panel')
      .boundingClientRect()
      .select('.home-tryon-handle-bar')
      .boundingClientRect()
      .exec(function (res) {
        const panelRect = res && res[0]
        const handleRect = res && res[1]
        if (!panelRect || !panelRect.width) return
        const handleW = handleRect && handleRect.width ? handleRect.width : 18
        const hidePx = Math.max(0, panelRect.width - handleW)
        self._homeTryonPanelHidePx = hidePx
        if (self.data.homeTryonPanelCollapsed) {
          self.setData({ homeTryonPanelTranslateX: hidePx })
        }
      })
  },

  onHomeTryonHandleTouchStart(e) {
    const touch = e.touches && e.touches[0]
    if (!touch) return
    this._homeTryonDragStartX = touch.clientX
    this._homeTryonDragStartTranslate = this.data.homeTryonPanelTranslateX || 0
    this._homeTryonDragStartCollapsed = this.data.homeTryonPanelCollapsed
    this._homeTryonDragging = true
    this.setData({ homeTryonPanelDragging: true })
  },

  onHomeTryonHandleTouchMove(e) {
    if (!this._homeTryonDragging) return
    const touch = e.touches && e.touches[0]
    if (!touch) return
    const max = this._homeTryonPanelHidePx || 0
    if (!max) return
    const deltaX = touch.clientX - this._homeTryonDragStartX
    let next = this._homeTryonDragStartTranslate + deltaX
    if (next < 0) next = 0
    if (next > max) next = max
    this.setData({
      homeTryonPanelTranslateX: next,
      homeTryonPanelCollapsed: next > max * 0.5
    })
  },

  onHomeTryonHandleTouchEnd() {
    if (!this._homeTryonDragging) return
    this._homeTryonDragging = false
    const max = this._homeTryonPanelHidePx || 0
    const current = this.data.homeTryonPanelTranslateX || 0
    const startTranslate = this._homeTryonDragStartTranslate || 0
    const moved = Math.abs(current - startTranslate)
    let collapsed
    if (moved < 10) {
      collapsed = !this._homeTryonDragStartCollapsed
    } else {
      collapsed = max > 0 ? current > max * 0.35 : false
    }
    this.setData({
      homeTryonPanelCollapsed: collapsed,
      homeTryonPanelTranslateX: collapsed ? max : 0,
      homeTryonPanelDragging: false,
      selectedTryonSlotIndex: collapsed ? -1 : this.data.selectedTryonSlotIndex
    })
    try {
      wx.setStorageSync(HOME_TRYON_PANEL_STORAGE_KEY, collapsed)
    } catch (err) {}
  },

  syncTryonItemSlotsFromApp() {
    const app = getApp()
    let slots = app.globalData.tryonItemSlots
    if (!slots || !Array.isArray(slots)) {
      slots = Array(HOME_TRYON_VISIBLE_SLOTS).fill('')
      app.globalData.tryonItemSlots = slots
    }
    const padded = slots.slice()
    while (padded.length < HOME_TRYON_VISIBLE_SLOTS) {
      padded.push('')
    }
    this.setData({ tryonItemSlots: padded })
  },

  onHomeSlotTap(e) {
    const idx = e.currentTarget.dataset.index
    if (idx === undefined) return
    const slots = this.data.tryonItemSlots || []
    if (!slots[idx]) return
    const current = this.data.selectedTryonSlotIndex
    this.setData({ selectedTryonSlotIndex: current === idx ? -1 : idx })
  },

  onRemoveHomeTryonItem(e) {
    const idx = e.currentTarget.dataset.index
    if (idx === undefined) return
    const slots = this.data.tryonItemSlots || []
    const newSlots = slots.slice()
    newSlots[idx] = ''
    const filled = newSlots.filter(function (s) { return s })
    const minLen = Math.max(HOME_TRYON_VISIBLE_SLOTS, filled.length)
    const tryonItemSlots = filled.concat(Array(Math.max(0, minLen - filled.length)).fill(''))
    const app = getApp()
    app.globalData.tryonItemSlots = tryonItemSlots
    const removedSrc = slots[idx]
    if (removedSrc) {
      app.globalData.tryonInitialOutfit = removeSrcFromOutfit(app.globalData.tryonInitialOutfit, removedSrc)
    }
    this.setData({ tryonItemSlots, selectedTryonSlotIndex: -1 })
  },

  onHomeTryonFavorite() {
    if (this.data.homeTryonFavorited) {
      const id = this.data.homeFavoriteOutfitId
      if (id) tryonFavorite.removeFavoriteOutfit(id)
      tryonFavorite.saveHomeFavoriteOutfitId('')
      this.setData({ homeTryonFavorited: false, homeFavoriteOutfitId: '' })
      wx.showToast({ title: '已取消收藏', icon: 'none' })
      return
    }
    this.setData({
      homeTryonFavorited: true,
      showFavoriteTagPopup: true,
      favoriteTagSeasonIndex: 0,
      favoriteTagSceneIndex: 0,
      favoriteTagStyleIndex: 0
    })
  },

  restoreHomeTryonFavoriteState() {
    const id = tryonFavorite.loadHomeFavoriteOutfitId()
    const active = tryonFavorite.isFavoriteOutfitActive(id)
    this.setData({
      homeFavoriteOutfitId: active ? id : '',
      homeTryonFavorited: active
    })
    if (id && !active) tryonFavorite.saveHomeFavoriteOutfitId('')
  },

  onCloseFavoriteTagPopup() {
    this.setData({ showFavoriteTagPopup: false, homeTryonFavorited: false })
  },

  onFavoriteTagSeasonTap(e) {
    const index = e.currentTarget.dataset.index
    if (index !== undefined) this.setData({ favoriteTagSeasonIndex: index })
  },

  onFavoriteTagSceneTap(e) {
    const index = e.currentTarget.dataset.index
    if (index !== undefined) this.setData({ favoriteTagSceneIndex: index })
  },

  onFavoriteTagStyleTap(e) {
    const index = e.currentTarget.dataset.index
    if (index !== undefined) this.setData({ favoriteTagStyleIndex: index })
  },

  onFavoriteTagConfirm() {
    if (!getApp().requireGuestLoginForSave()) {
      this.setData({ homeTryonFavorited: false, showFavoriteTagPopup: false })
      return
    }
    const slots = (this.data.tryonItemSlots || []).filter(function (s) { return s })
    const image = this.data.modelDisplaySrc || this.data.modelOutfitSrc || this.data.modelDefaultUrl || ''
    const outfit = tryonFavorite.saveTryonFavoriteFromTags({
      image: image,
      slots: slots,
      seasonIndex: this.data.favoriteTagSeasonIndex,
      sceneIndex: this.data.favoriteTagSceneIndex,
      styleIndex: this.data.favoriteTagStyleIndex,
      source: 'home'
    })
    if (!outfit) {
      this.setData({ homeTryonFavorited: false, showFavoriteTagPopup: false })
      return
    }
    const app = getApp()
    if (slots.length) app.globalData.tryonItemSlots = slots.slice()
    tryonFavorite.saveHomeFavoriteOutfitId(outfit.id)
    this.setData({
      showFavoriteTagPopup: false,
      homeTryonFavorited: true,
      homeFavoriteOutfitId: outfit.id
    })
    wx.showToast({ title: '已保存到收藏区', icon: 'success' })
  },

  onFavoriteTagCancel() {
    this.setData({ showFavoriteTagPopup: false, homeTryonFavorited: false })
  },

  applySolidBgColorFromStorage() {
    try {
      const saved = wx.getStorageSync(SOLID_BG_STORAGE_KEY)
      if (saved && typeof saved === 'string') {
        this.applySolidBgColor(saved, false)
      }
    } catch (e) {}
  },

  applyHomeScenesFromStorage() {
    const indoorId = homeSceneBg.loadSceneId('indoor')
    const outdoorId = homeSceneBg.loadSceneId('outdoor')
    this.applyIndoorScene(indoorId, false)
    this.applyOutdoorScene(outdoorId, false)
  },

  applyIndoorScene(id, persist) {
    const scene = homeSceneBg.resolveScene('indoor', id)
    if (!scene) return
    this.setData({
      indoorSceneId: scene.id,
      indoorSceneImage: scene.image
    })
    if (persist !== false) homeSceneBg.saveSceneId('indoor', scene.id)
  },

  applyOutdoorScene(id, persist) {
    const scene = homeSceneBg.resolveScene('outdoor', id)
    if (!scene) return
    this.setData({
      outdoorSceneId: scene.id,
      outdoorSceneImage: scene.image
    })
    if (persist !== false) homeSceneBg.saveSceneId('outdoor', scene.id)
  },

  closeAllBgPickers() {
    return {
      showSolidColorPicker: false,
      showIndoorScenePicker: false,
      showOutdoorScenePicker: false
    }
  },

  applyHomeWeatherFromStorage() {
    const saved = homeWeather.getHomeWeather()
    if (!saved || !saved.city) return
    this.setData({
      city: saved.city,
      temp: saved.temp || this.data.temp,
      weather: saved.weather || this.data.weather,
      weatherIcon: saved.weatherIcon || this.data.weatherIcon
    })
    this.refreshWeatherCapsuleIcon(saved.iconCode || this.data.weatherIconCode)
  },

  refreshWeatherCapsuleIcon(iconCode) {
    const code = qweatherIcon.normalizeIconCode(iconCode)
    const color = qweatherIcon.getColorForIconCode(code)
    const self = this
    this.setData({
      weatherIconCode: code,
      weatherIconColor: color,
      weatherIconUrl: qweatherIcon.getInstantIconUrl(code)
    })
    qweatherIcon.loadColoredIconUrl(code).then(function (url) {
      if (String(self.data.weatherIconCode) !== code) return
      self.setData({ weatherIconUrl: qweatherIcon.sanitizeWeatherIconUrl(url) })
    })
  },

  syncHomeWeatherToStorage() {
    const { city, temp, weather, weatherIcon, weatherIconCode } = this.data
    if (!city) return
    homeWeather.setHomeWeather({
      city,
      temp,
      weather,
      weatherIcon,
      iconCode: weatherIconCode
    })
  },

  onWeatherCapsuleIconError() {
    this.setData({ weatherIconUrl: qweatherIcon.getQWeatherIconFallbackUrl() })
  },

  onSpriteImgError() {
    const cdn = getSpriteCdnUrl()
    if (this.data.spriteUrl !== cdn) {
      this.setData({ spriteUrl: cdn })
    }
  },

  updateModelOutfit() {
    const { gender, temp } = this.data
    const g = gender || 'female'
    const level = getTempLevel(temp || '22')
    const outfitPath = getOutfitImagePath(g, level)
    const range = TEMP_RANGES[level]
    const desc = `${range.top} + ${range.bottom} + ${range.shoes}`
    const app = getApp()
    app.globalData.modelDisplaySrc = outfitPath
    app.globalData.modelGender = g
    this.setData({
      modelOutfitSrc: outfitPath,
      modelDisplaySrc: outfitPath,
      outfitDesc: desc
    })
  },

  fetchWeatherAndSwitch() {
    wx.showLoading({ title: '获取天气...' })
    const self = this
    locationAuth.requestUserLocation()
      .then(function (result) {
        if (result.ok) {
          self.fetchWeatherByCoords(result.latitude, result.longitude, { applyOutfitToast: true })
        } else {
          wx.hideLoading()
          self.useSimulatedWeather()
          self.applyWeatherAndOutfit()
        }
      })
  },

  fetchWeatherByCoords(lat, lng, options) {
    const opts = options || {}
    if (weatherService.hasApiKey) {
      weatherService.getWeatherByCoords(lat, lng, { includeForecast: true })
        .then(data => {
          this.setData({
            city: data.city,
            temp: data.temp,
            weather: data.weather,
            weatherIcon: data.weatherIcon,
            forecast: data.forecast || []
          }, () => {
            this.syncHomeWeatherToStorage()
            if (opts.onWeatherReady) opts.onWeatherReady()
          })
          this.refreshWeatherCapsuleIcon(data.iconCode)
          wx.hideLoading()
          this.updateModelOutfit()
          this.updateChatContext()
          if (opts.applyOutfitToast) {
            this.applyWeatherAndOutfit()
          } else if (opts.showWeatherSuccess) {
            wx.showToast({ title: '已更新至 ' + data.city, icon: 'success' })
          }
        })
        .catch((err) => {
          console.error('[weather]', 'model fetchWeatherByCoords fail:', err)
          if (lat != null && lng != null) {
            this.useSimulatedWeatherByCoords(lat, lng)
          } else {
            this.useSimulatedWeather()
          }
          wx.hideLoading()
          this.updateModelOutfit()
          this.updateChatContext()
          if (opts.showWeatherError) {
            wx.showToast({
              title: weatherService.formatErrorToast(err),
              icon: 'none',
              duration: 3000
            })
          }
          if (opts.applyOutfitToast) {
            this.applyWeatherAndOutfit()
          }
        })
    } else {
      this.useSimulatedWeatherByCoords(lat, lng)
      wx.hideLoading()
      this.updateModelOutfit()
      this.updateChatContext()
      if (opts.applyOutfitToast) {
        this.applyWeatherAndOutfit()
      } else if (opts.showWeatherSuccess) {
        wx.showToast({ title: '已更新至 ' + this.data.city, icon: 'success' })
        if (opts.onWeatherReady) opts.onWeatherReady()
      }
    }
  },

  useSimulatedWeatherByCoords(lat, lng) {
    const now = new Date()
    const month = now.getMonth() + 1
    const latNorm = Math.abs(lat)
    const baseTemp = 28 - (latNorm - 22) * 0.8 - (month - 6) * 3
    const temp = Math.round(Math.max(-5, Math.min(38, baseTemp + (lat * 0.01 % 5))))
    const city = lat > 25 ? '深圳' : lat > 20 ? '广州' : lat > 30 ? '北京' : '上海'
    const weathers = ['晴', '多云', '阴', '小雨']
    const seed = Math.floor(lat * 100 + lng + month * 10) % 4
    const weatherIcon = seed === 0 ? 'sun' : seed === 1 ? 'cloud' : seed === 2 ? 'cloudy' : 'rain'
    const iconCode = qweatherIcon.getIconCodeFromEffect(weatherIcon)
    this.setData({
      city,
      temp: String(temp),
      weather: weathers[seed],
      weatherIcon
    }, () => {
      this.syncHomeWeatherToStorage()
      this.refreshWeatherCapsuleIcon(iconCode)
    })
  },

  useSimulatedWeather() {
    const month = new Date().getMonth() + 1
    const temp = month >= 5 && month <= 9 ? 26 : month >= 10 && month <= 11 ? 18 : 10
    const weather = month >= 5 && month <= 9 ? '晴' : '多云'
    const iconCode = qweatherIcon.getIconCodeFromWeatherText(weather)
    this.setData({
      city: this.data.city || '深圳',
      temp: String(temp),
      weather,
      weatherIcon: month >= 5 && month <= 9 ? 'sun' : 'cloud'
    }, () => {
      this.syncHomeWeatherToStorage()
      this.refreshWeatherCapsuleIcon(iconCode)
    })
  },

  applyWeatherAndOutfit() {
    this.updateModelOutfit()
    this.updateChatContext()
    const level = getTempLevel(this.data.temp)
    const range = TEMP_RANGES[level]
    wx.showToast({
      title: `已更新：${range.label}穿搭`,
      icon: 'success'
    })
  },

  onShow() {
    if (!qweatherIcon.isSafeWeatherIconUrl(this.data.weatherIconUrl)) {
      this.setData({ weatherIconUrl: qweatherIcon.getQWeatherIconFallbackUrl() })
    }
    const saved = homeWeather.getHomeWeather()
    if (saved && saved.city && saved.city !== this.data.city) {
      this.setData({
        city: saved.city,
        temp: saved.temp || this.data.temp,
        weather: saved.weather || this.data.weather,
        weatherIcon: saved.weatherIcon || this.data.weatherIcon
      }, () => {
        this.refreshWeatherCapsuleIcon(saved.iconCode || this.data.weatherIconCode)
        this.updateModelOutfit()
        this.updateChatContext()
      })
    } else {
      this.updateChatContext()
    }
    this.syncTryonItemSlotsFromApp()
    this.refreshWardrobeHandleImage()
    this.restoreHomeTryonFavoriteState()
  },

  onModelImgError() {
    const { modelDisplaySrc, gender } = this.data
    const g = gender || 'female'
    const defaultPath = getImageUrl(getModelImagePath(g))
    if (modelDisplaySrc === defaultPath || !modelDisplaySrc) {
      this.setData({ modelImgError: true })
    } else {
      const app = getApp()
      app.globalData.modelDisplaySrc = defaultPath
      app.globalData.modelGender = g
      this.setData({ modelDisplaySrc: defaultPath })
    }
  },

  onOpenChatAssistant() {
    this.updateChatContext()
    this.setData({ showChatAssistant: true })
  },

  onCloseChatAssistant() {
    this.setData({ showChatAssistant: false })
  },

  updateChatContext() {
    const app = getApp()
    const { city, temp, weather, forecast, gender } = this.data
    const g = gender || 'female'
    const { buildAssistantProfile } = require('../../utils/assistantProfile.js')
    const assistantProfile = buildAssistantProfile(app, {
      gender: g,
      weather: { city, temp, weather, forecast: forecast || [] }
    })
    this.setData({
      chatWeather: { city, temp, weather, forecast: forecast || [] },
      chatWardrobe: app.getUserWardrobeItems(),
      chatProfile: assistantProfile,
      chatGender: g,
      chatAge: assistantProfile.age
    })
  },

  onGenderPickSelect(e) {
    const value = e.currentTarget.dataset.value
    if (value !== 'male' && value !== 'female') return
    this.setData({ genderPick: value, gender: value }, () => {
      this.updateModelOutfit()
    })
  },

  onConfirmGenderPick() {
    const g = this.data.genderPick === 'male' ? 'male' : 'female'
    const app = getApp()
    app.saveUserGender(g)
    app.globalData.userGender = g
    app.globalData.modelGender = g
    this.setData({
      gender: g,
      genderPick: g,
      showGenderPicker: false,
      modelImgError: false,
      modelDefaultUrl: getImageUrl(getModelImagePath(g))
    }, () => {
      this.updateModelOutfit()
      this.updateChatContext()
    })
  },

  onModelTouchStart() {},
  onModelTouchMove() {},
  onModelTouchEnd() {},

  onAdd() {
    const gender = this.data.gender || 'female'
    wx.navigateTo({ url: '/pages/add-member/add-member?gender=' + gender })
  },
  onRecord() {
    this.loadRoleProfile()
    this.setData({ showRoleEntryCard: true })
  },

  loadRoleProfile() {
    const isMale = this.data.gender === 'male'
    const defaultName = getApp().getDefaultUserDisplayName()
    const body = DEFAULT_ROLE_BODY[isMale ? 'male' : 'female']
    try {
      const key = this.getRoleProfileKey()
      const raw = wx.getStorageSync(key)
      if (raw && typeof raw === 'object') {
        const nickname = (raw.nickname && String(raw.nickname).trim()) || defaultName
        const roleHeight = raw.height !== undefined && raw.height !== '' ? String(raw.height) : body.height
        const roleWeight = raw.weight !== undefined && raw.weight !== '' ? String(raw.weight) : body.weight
        const hasBust = raw.bustWaistHip && String(raw.bustWaistHip).trim()
        const roleBustWaistHip = hasBust || body.bustWaistHip
        this.setData({
          roleNickname: nickname,
          roleHeight,
          roleWeight,
          roleBustWaistHip,
          roleBustWaistHipEnabled: !!hasBust
        })
      } else {
        this.setData({
          roleNickname: defaultName,
          roleHeight: body.height,
          roleWeight: body.weight,
          roleBustWaistHip: body.bustWaistHip,
          roleBustWaistHipEnabled: false
        })
      }
    } catch (e) {
      this.setData({
        roleNickname: defaultName,
        roleHeight: body.height,
        roleWeight: body.weight,
        roleBustWaistHip: body.bustWaistHip,
        roleBustWaistHipEnabled: false
      })
    }
  },

  onToggleBustWaistHip(e) {
    const enabled = e.detail && e.detail.value
    const isMale = this.data.gender === 'male'
    const body = DEFAULT_ROLE_BODY[isMale ? 'male' : 'female']
    this.setData({
      roleBustWaistHipEnabled: enabled,
      roleBustWaistHip: enabled ? (this.data.roleBustWaistHip || body.bustWaistHip) : ''
    })
  },

  onCloseRoleEntry() {
    this.setData({ showRoleEntryCard: false })
  },

  onRoleNicknameInput(e) {
    this.setData({ roleNickname: (e.detail && e.detail.value) || '' })
  },
  onRoleHeightInput(e) {
    this.setData({ roleHeight: (e.detail && e.detail.value) || '' })
  },
  onRoleWeightInput(e) {
    this.setData({ roleWeight: (e.detail && e.detail.value) || '' })
  },
  onRoleBustWaistHipInput(e) {
    this.setData({ roleBustWaistHip: (e.detail && e.detail.value) || '' })
  },

  onSaveRoleEntry() {
    if (!getApp().requireGuestLoginForSave()) return
    const profile = {
      nickname: (this.data.roleNickname || '').trim(),
      height: (this.data.roleHeight || '').trim(),
      weight: (this.data.roleWeight || '').trim(),
      bustWaistHip: this.data.roleBustWaistHipEnabled ? (this.data.roleBustWaistHip || '').trim() : '',
      selectedStyles: this.data.roleSelectedStyles || []
    }
    try {
      wx.setStorageSync(this.getRoleProfileKey(), profile)
      this.updateChatContext()
      wx.showToast({ title: '保存成功', icon: 'success' })
      this.setData({ showRoleEntryCard: false })
    } catch (e) {
      wx.showToast({ title: '保存失败', icon: 'none' })
    }
  },
  onBgModeTap(e) {
    const mode = e.currentTarget.dataset.mode
    if (!mode) return
    const current = this.data.activeBgMode
    const pickerMap = {
      solid: 'showSolidColorPicker',
      indoor: 'showIndoorScenePicker',
      outdoor: 'showOutdoorScenePicker'
    }
    const pickerKey = pickerMap[mode]

    if (current === mode && pickerKey) {
      if (this.data[pickerKey]) {
        this.setData(Object.assign({ activeBgMode: '' }, this.closeAllBgPickers()))
      } else {
        const updates = this.closeAllBgPickers()
        updates[pickerKey] = true
        this.setData(updates, () => {
          if (mode === 'solid') this.initSolidColorWheel()
        })
      }
      return
    }

    const next = current === mode ? '' : mode
    const updates = Object.assign({
      activeBgMode: next
    }, this.closeAllBgPickers())
    if (next === 'solid') updates.showSolidColorPicker = true
    if (next === 'indoor') updates.showIndoorScenePicker = true
    if (next === 'outdoor') updates.showOutdoorScenePicker = true
    this.setData(updates, () => {
      if (next === 'solid') this.initSolidColorWheel()
    })
  },

  onIndoorScenePick(e) {
    const id = e.currentTarget.dataset.id
    if (!id) return
    this.applyIndoorScene(id, true)
  },

  onOutdoorScenePick(e) {
    const id = e.currentTarget.dataset.id
    if (!id) return
    this.applyOutdoorScene(id, true)
  },

  onCloseIndoorScenePicker() {
    this.setData({ showIndoorScenePicker: false })
  },

  onCloseOutdoorScenePicker() {
    this.setData({ showOutdoorScenePicker: false })
  },

  applySolidBgColor(color, persist) {
    const normalized = colorPicker.normalizeHex(color)
    if (!normalized) return false
    this.setData({
      solidBgColor: normalized,
      solidBgColorInput: normalized
    })
    if (persist !== false) {
      try {
        wx.setStorageSync(SOLID_BG_STORAGE_KEY, normalized)
      } catch (err) {}
    }
    return true
  },

  formatSolidColorInput(value) {
    let text = String(value || '').trim()
    if (text && text.charAt(0) !== '#') text = '#' + text
    return text.replace(/[^#0-9a-fA-F]/g, '').slice(0, 7)
  },

  commitSolidColorInput() {
    const normalized = colorPicker.normalizeHex(this.data.solidBgColorInput)
    if (normalized) {
      this.applySolidBgColor(normalized, true)
      this.syncSolidPickerFromColor(normalized)
      this.drawSolidSvPanel()
      return
    }
    this.setData({ solidBgColorInput: this.data.solidBgColor })
  },

  onSolidColorInput(e) {
    const value = this.formatSolidColorInput((e.detail && e.detail.value) || '')
    const normalized = colorPicker.normalizeHex(value)
    const updates = { solidBgColorInput: value }
    if (normalized) {
      updates.solidBgColor = normalized
      const hsv = colorPicker.hexToHsv(normalized)
      updates.pickerHue = hsv.h
      updates.pickerSat = hsv.s
      updates.pickerVal = hsv.v
      updates.pickerValTop = colorPicker.clamp(100 - hsv.v, 0, 100)
    }
    this.setData(updates, () => {
      if (normalized) this.drawSolidSvPanel()
    })
  },

  onSolidColorInputBlur() {
    this.commitSolidColorInput()
  },

  onSolidColorInputConfirm() {
    this.commitSolidColorInput()
  },

  syncSolidPickerFromColor(color) {
    const hsv = colorPicker.hexToHsv(color)
    this.setData({
      pickerHue: hsv.h,
      pickerSat: hsv.s,
      pickerVal: hsv.v,
      pickerValTop: colorPicker.clamp(100 - hsv.v, 0, 100)
    })
  },

  initSolidColorWheel() {
    this.syncSolidPickerFromColor(this.data.solidBgColor)
    wx.nextTick(() => {
      const query = wx.createSelectorQuery().in(this)
      query.select('#solidSvCanvas').fields({ node: true, size: true }).exec((res) => {
        if (!res || !res[0] || !res[0].node) return
        const canvas = res[0].node
        const ctx = canvas.getContext('2d')
        if (!ctx) return
        let dpr = 2
        try {
          dpr = wx.getSystemInfoSync().pixelRatio || 2
        } catch (e) {}
        const width = res[0].width || this.data.svCanvasWidth
        const height = res[0].height || this.data.svCanvasHeight
        canvas.width = width * dpr
        canvas.height = height * dpr
        ctx.scale(dpr, dpr)
        this._solidSvCanvas = canvas
        this._solidSvCtx = ctx
        this._solidSvSize = { width: width, height: height }
        this.drawSolidSvPanel()
      })
    })
  },

  drawSolidSvPanel() {
    if (!this._solidSvCtx || !this._solidSvSize) return
    colorPicker.drawSvPanel(
      this._solidSvCtx,
      this._solidSvSize.width,
      this._solidSvSize.height,
      this.data.pickerHue
    )
  },

  updateSolidColorFromPicker(persist) {
    const hex = colorPicker.hsvToHex(this.data.pickerHue, this.data.pickerSat, this.data.pickerVal)
    this.applySolidBgColor(hex, persist !== false)
  },

  handleSolidSvTouch(e, persist) {
    const touch = e.touches && e.touches[0]
    if (!touch || !this._solidSvSize) return
    const width = this._solidSvSize.width
    const height = this._solidSvSize.height
    if (!width || !height) return
    const x = typeof touch.x === 'number' ? touch.x : 0
    const y = typeof touch.y === 'number' ? touch.y : 0
    const sat = colorPicker.clamp(Math.round(x / width * 100), 0, 100)
    const val = colorPicker.clamp(Math.round((1 - y / height) * 100), 0, 100)
    this.setData({
      pickerSat: sat,
      pickerVal: val,
      pickerValTop: 100 - val
    })
    this.updateSolidColorFromPicker(persist)
  },

  onSolidSvTouchStart(e) {
    this._solidSvTouching = true
    this.handleSolidSvTouch(e, false)
  },

  onSolidSvTouchMove(e) {
    if (!this._solidSvTouching) return
    this.handleSolidSvTouch(e, false)
  },

  onSolidSvTouchEnd(e) {
    this._solidSvTouching = false
    if (e && e.changedTouches && e.changedTouches.length) {
      this.handleSolidSvTouch({ touches: e.changedTouches }, true)
      return
    }
    this.updateSolidColorFromPicker(true)
  },

  onSolidHueChanging(e) {
    const hue = e.detail && typeof e.detail.value === 'number' ? e.detail.value : 0
    this.setData({ pickerHue: hue })
    this.drawSolidSvPanel()
    this.updateSolidColorFromPicker(false)
  },

  onSolidHueChange(e) {
    const hue = e.detail && typeof e.detail.value === 'number' ? e.detail.value : this.data.pickerHue
    this.setData({ pickerHue: hue })
    this.drawSolidSvPanel()
    this.updateSolidColorFromPicker(true)
  },

  onSolidColorPick(e) {
    const color = e.currentTarget.dataset.color
    if (!color) return
    this.applySolidBgColor(color, true)
    this.syncSolidPickerFromColor(color)
    this.drawSolidSvPanel()
  },

  onCloseSolidColorPicker() {
    this.setData({ showSolidColorPicker: false })
  },

  onPopupCatch() {},

  onWeatherCapsuleTap() {
    const self = this
    if (!this.data.hasAskedLocationPermission) {
      wx.showModal({
        title: '获取定位权限',
        content: '需要获取您的位置以显示当地天气并推荐穿搭，是否同意授权？',
        confirmText: '同意',
        cancelText: '取消',
        success(m) {
          self.setData({ hasAskedLocationPermission: true })
          if (m.confirm) {
            self.doGetLocationAndWeather()
          }
        }
      })
    } else {
      this.onOpenCitySearch()
    }
  },

  doGetLocationAndWeather() {
    wx.showLoading({ title: '获取天气...' })
    const self = this
    locationAuth.requestUserLocation()
      .then(function (result) {
        if (result.ok) {
          self.fetchWeatherByCoords(result.latitude, result.longitude, {
            showWeatherError: true,
            showWeatherSuccess: true,
            onWeatherReady: function () {
              self.setData({ showCitySearch: false, citySearchKeyword: '', filteredCityList: [] })
            }
          })
        } else {
          wx.hideLoading()
          self.useSimulatedWeather()
          self.updateModelOutfit()
          locationAuth.showLocationFailToast(result.reason)
        }
      })
  },

  onRelocateFromCitySearch() {
    this.doGetLocationAndWeather()
  },

  onOpenCitySearch() {
    const list = filterCities('')
    this.setData({
      showCitySearch: true,
      citySearchKeyword: '',
      filteredCityList: list
    })
  },

  onCloseCitySearch() {
    this.setData({ showCitySearch: false, citySearchKeyword: '', filteredCityList: [] })
  },

  onCitySearchInput(e) {
    const keyword = (e && e.detail && e.detail.value !== undefined) ? String(e.detail.value) : ''
    const list = filterCities(keyword)
    this.setData({
      citySearchKeyword: keyword,
      filteredCityList: list
    })
  },

  onSelectCity(e) {
    const city = e.currentTarget.dataset.city
    if (!city) return
    this.applyWeatherByCity(city)
    this.setData({ showCitySearch: false, citySearchKeyword: '', filteredCityList: [] })
  },

  applyWeatherByCity(cityName) {
    if (weatherService.hasApiKey) {
      wx.showLoading({ title: '获取天气...' })
      weatherService.getWeatherByCity(cityName, { includeForecast: true })
        .then(data => {
          wx.hideLoading()
          this.setData({
            city: data.city,
            temp: data.temp,
            weather: data.weather,
            weatherIcon: data.weatherIcon,
            forecast: data.forecast || []
          }, () => this.syncHomeWeatherToStorage())
          this.refreshWeatherCapsuleIcon(data.iconCode)
          this.updateChatContext()
          this.updateModelOutfit()
          wx.showToast({ title: '已切换至 ' + data.city, icon: 'success' })
        })
        .catch(() => {
          wx.hideLoading()
          this.applyWeatherByCityFallback(cityName)
        })
    } else {
      this.applyWeatherByCityFallback(cityName)
    }
  },

  applyWeatherByCityFallback(cityName) {
    const hash = cityName.split('').reduce((acc, c) => acc + c.charCodeAt(0), 0)
    const temp = 12 + (hash % 18)
    const weathers = ['晴', '多云', '阴', '小雨', '雪', '雾', '雷阵雨']
    const weather = weathers[hash % weathers.length]
    const weatherIcon = textToWeatherEffect(weather)
    const iconCode = qweatherIcon.getIconCodeFromEffect(weatherIcon)
    this.setData({
      city: cityName,
      temp: String(temp),
      weather,
      weatherIcon
    }, () => {
      this.syncHomeWeatherToStorage()
      this.refreshWeatherCapsuleIcon(iconCode)
    })
    this.updateChatContext()
    this.updateModelOutfit()
    wx.showToast({ title: '已切换至 ' + cityName, icon: 'success' })
  },

  onTabDiary() { reLaunchMain(MAIN_DIARY, this.data.gender) },
  onTabWardrobe() { reLaunchMain(MAIN_WARDROBE, this.data.gender) },
  onTabMine() { reLaunchMain(MAIN_MINE, this.data.gender) }
})
