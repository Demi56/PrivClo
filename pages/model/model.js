const { getImageUrl } = require('../../utils/image.js')
const { getModelImagePath } = require('../../utils/clothingPositions.js')
const weatherService = require('../../service/weather.js')
const { MAIN_DIARY, MAIN_WARDROBE, MAIN_MINE, reLaunchMain } = require('../../utils/mainTabs.js')

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
    modelOutfitSrc: '',
    modelDisplaySrc: '',
    modelDefaultUrl: '',
    spriteUrl: '',
    roleAvatarFemaleUrl: '',
    roleAvatarMaleUrl: '',
    outfitDesc: '',
    modelImgError: false,
    homeBgImage: '',
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
    showChatAssistant: false
  },

  getRoleProfileKey() {
    return 'modelProfile_' + (this.data.gender || 'female')
  },

  onLoad(options) {
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
    try {
      const bg = wx.getStorageSync('homeBgImage')
      this.setData({ homeBgImage: bg || '' })
    } catch (e) {}
    const app = getApp()
    const gender = options.gender || app.getUserGender() || 'female'
    app.globalData.modelGender = gender
    app.globalData.modelDisplaySrc = getImageUrl(getModelImagePath(gender))
    this.setData({
      gender,
      modelImgError: false,
      modelDefaultUrl: getImageUrl(getModelImagePath(gender)),
      spriteUrl: getImageUrl('/images/sprite.png'),
      roleAvatarFemaleUrl: getImageUrl('/images/role/avatar-female.png'),
      roleAvatarMaleUrl: getImageUrl('/images/role/avatar-male.png')
    })
    this.updateModelOutfit()
    this.updateChatContext()
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
    wx.getLocation({
      type: 'wgs84',
      success: (res) => {
        const { latitude, longitude } = res
        this.fetchWeatherByCoords(latitude, longitude)
      },
      fail: (err) => {
        wx.hideLoading()
        this.useSimulatedWeather()
        this.applyWeatherAndOutfit()
      }
    })
  },

  fetchWeatherByCoords(lat, lng) {
    if (weatherService.hasApiKey) {
      weatherService.getWeatherByCoords(lat, lng, { includeForecast: true })
        .then(data => {
          this.setData({
            city: data.city,
            temp: data.temp,
            weather: data.weather,
            weatherIcon: data.weatherIcon,
            forecast: data.forecast || []
          })
          wx.hideLoading()
          this.updateChatContext()
          this.applyWeatherAndOutfit()
        })
        .catch(() => {
          this.useSimulatedWeather()
          wx.hideLoading()
          this.applyWeatherAndOutfit()
        })
    } else {
      this.useSimulatedWeatherByCoords(lat, lng)
      wx.hideLoading()
      this.applyWeatherAndOutfit()
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
    this.setData({
      city,
      temp: String(temp),
      weather: weathers[seed],
      weatherIcon: seed === 0 ? 'sun' : seed === 1 ? 'cloud' : seed === 2 ? 'cloudy' : 'rain'
    })
  },

  useSimulatedWeather() {
    const month = new Date().getMonth() + 1
    const temp = month >= 5 && month <= 9 ? 26 : month >= 10 && month <= 11 ? 18 : 10
    this.setData({
      city: this.data.city || '深圳',
      temp: String(temp),
      weather: month >= 5 && month <= 9 ? '晴' : '多云',
      weatherIcon: 'sun'
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
    try {
      const bg = wx.getStorageSync('homeBgImage')
      this.setData({ homeBgImage: bg || '' })
    } catch (e) {}
    this.updateChatContext()
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
    this.setData({ showChatAssistant: true })
  },

  onCloseChatAssistant() {
    this.setData({ showChatAssistant: false })
  },

  updateChatContext() {
    const app = getApp()
    const { city, temp, weather, forecast, gender } = this.data
    const g = gender || 'female'
    const profile = app.getRoleProfile(g)
    const stylePref = profile?.selectedStyles?.length
      ? profile.selectedStyles
      : app.getStylePreference(g)
    const profileWithStyles = { ...profile, selectedStyles: stylePref }
    const outfitPrefs = app.getOutfitPreferences()
    this.setData({
      chatWeather: { city, temp, weather, forecast: forecast || [] },
      chatWardrobe: app.getUserWardrobeItems(),
      chatProfile: { ...profileWithStyles, outfitPreferences: outfitPrefs },
      chatGender: g,
      chatAge: profile?.age || null
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
    const defaultName = isMale ? '阳阳' : '依依'
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
  onEmoji() { wx.showToast({ title: '暂未开发', icon: 'none' }) },
  onBackground() {
    wx.navigateTo({ url: '/packagePoints/pages/background-select/background-select' })
  },
  onSwitch() {
    // 以天气胶囊当前数据为准，仅更新模特穿搭，不重新拉定位、不覆盖天气
    this.updateModelOutfit()
    const level = getTempLevel(this.data.temp)
    const range = TEMP_RANGES[level]
    wx.showToast({
      title: `已更新：${range.label}穿搭`,
      icon: 'success'
    })
  },

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
    wx.getLocation({
      type: 'wgs84',
      success: (res) => {
        const { latitude, longitude } = res
        this.fetchWeatherByCoords(latitude, longitude)
      },
      fail: () => {
        wx.hideLoading()
        this.useSimulatedWeather()
        this.updateModelOutfit()
        wx.showToast({ title: '定位失败，已使用默认天气', icon: 'none' })
      }
    })
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
          })
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
    const weathers = ['晴', '多云', '阴', '小雨']
    const weather = weathers[hash % 4]
    const iconMap = { 0: 'sun', 1: 'cloud', 2: 'cloudy', 3: 'rain' }
    this.setData({
      city: cityName,
      temp: String(temp),
      weather,
      weatherIcon: iconMap[hash % 4]
    })
    this.updateChatContext()
    this.updateModelOutfit()
    wx.showToast({ title: '已切换至 ' + cityName, icon: 'success' })
  },

  onTabDiary() { reLaunchMain(MAIN_DIARY, this.data.gender) },
  onTabWardrobe() { reLaunchMain(MAIN_WARDROBE, this.data.gender) },
  onTabMine() { reLaunchMain(MAIN_MINE, this.data.gender) }
})
