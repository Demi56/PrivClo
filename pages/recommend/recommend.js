/**
 * 智能穿搭推荐 - 基于用户画像+天气的个性化推荐
 */
const { aggregateForRecommend } = require('../../utils/userProfileBuilder.js')

Page({
  data: {
    statusBarHeight: 20,
    /** 与入口 ?gender= 一致，供天气城市与画像聚合 */
    gender: '',
    loading: false,
    recommendations: null,
    copywriting: '',
    weather: null,
    occasion: 'daily',
    occasionOptions: [
      { id: 'daily', name: '日常' },
      { id: 'work', name: '通勤' },
      { id: 'date', name: '约会' },
      { id: 'sport', name: '运动' }
    ]
  },

  onLoad(options) {
    try {
      const sys = wx.getSystemInfoSync()
      this.setData({ statusBarHeight: sys.statusBarHeight || 20 })
    } catch (e) {
      this.setData({ statusBarHeight: 20 })
    }
    var g = ''
    if (options && options.gender) {
      try {
        g = decodeURIComponent(String(options.gender))
      } catch (e2) {
        g = String(options.gender)
      }
    }
    if (g) this.setData({ gender: g })
    this.fetchWeather()
  },

  onShow() {
    this.fetchRecommend()
  },

  _effectiveGender() {
    const app = getApp()
    const fromPage = (this.data.gender || '').trim()
    if (fromPage) return fromPage
    return app.getUserGender ? app.getUserGender() : 'female'
  },

  async fetchWeather() {
    const app = getApp()
    const gender = this._effectiveGender()
    const profile = app.getRoleProfile ? app.getRoleProfile(gender) : {}
    const city = profile.city || '北京'
    try {
      const res = await wx.cloud.callFunction({
        name: 'weather',
        data: { type: 'city', location: city, includeForecast: false }
      })
      const data = (res.result || {}).data
      if (data) {
        this.setData({
          weather: {
            city: data.city,
            temp: data.temp,
            weather: data.weather,
            humidity: data.humidity
          }
        })
      }
    } catch (e) {
      this.setData({
        weather: {
          city: '北京',
          temp: '20',
          weather: '晴',
          humidity: '50'
        }
      })
    }
  },

  async fetchRecommend() {
    const app = getApp()
    const gender = this._effectiveGender()
    const { profile, wardrobe } = aggregateForRecommend(app, { gender: gender })
    const weather = this.data.weather || {}
    const occasionMap = { daily: '日常', work: '通勤', date: '约会', sport: '运动' }
    const occasionText = occasionMap[this.data.occasion] || '日常'

    this.setData({ loading: true })
    try {
      const res = await wx.cloud.callFunction({
        name: 'smartRecommend',
        data: {
          userProfile: profile,
          wardrobe,
          stylePreferences: profile.stylePreferences || [],
          weatherData: {
            temp: weather.temp,
            temperature: weather.temp,
            condition: weather.weather,
            weather: weather.weather,
            humidity: weather.humidity
          },
          occasion: occasionText
        }
      })
      const result = res.result || {}

      if (!result.success) {
        throw new Error(result.errMsg || '推荐生成失败')
      }

      this.setData({
        recommendations: result.recommendations,
        copywriting: result.copywriting || '',
        loading: false
      })
    } catch (e) {
      console.error('recommend error:', e)
      const msg = String(e.errMsg || e.message || '')
      const isNotFound = msg.includes('501000') || msg.includes('FUNCTION_NOT_FOUND')
      if (isNotFound) {
        wx.showModal({
          title: '云函数未部署',
          content: '请右键 cloudfunctions/smartRecommend 文件夹，选择「上传并部署：云端安装依赖」',
          showCancel: false
        })
      } else {
        wx.showToast({ title: e.message || '推荐失败', icon: 'none' })
      }
      this.setData({ loading: false })
    }
  },

  onOccasionChange(e) {
    const id = e.currentTarget.dataset.id
    if (id) this.setData({ occasion: id }, () => this.fetchRecommend())
  },

  onRefresh() {
    this.fetchWeather()
    this.fetchRecommend()
  },

  onBack() {
    wx.navigateBack({ fail: () => wx.switchTab({ url: '/pages/model/model' }) })
  }
})
