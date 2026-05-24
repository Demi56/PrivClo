const { getImageUrl } = require('../../../utils/image.js')

// 天气日历 - 日记目录页
const WEATHER_TYPES = ['sunny', 'cloudy', 'overcast', 'rainy', 'haze']
const STORAGE_KEY = 'diary_pages'

function getWeekDates() {
  const now = new Date()
  const day = now.getDay()
  const diff = day === 0 ? -6 : 1 - day
  const monday = new Date(now)
  monday.setDate(now.getDate() + diff)
  const dates = []
  for (let i = 0; i < 7; i++) {
    const d = new Date(monday)
    d.setDate(monday.getDate() + i)
    dates.push(d.getFullYear() + '-' + (d.getMonth() + 1) + '-' + d.getDate())
  }
  return dates
}

Page({
  data: {
    statusBarHeight: 20,
    gender: 'female',
    illustUrl: '',
    illustError: false,
    displayYear: 2025,
    displayMonth: 2,
    pickerDate: '',
    calendarDays: [],
    stats: { sunny: 0, cloudy: 0, overcast: 0, rainy: 0, haze: 0 },
    weekReviewCount: 0
  },

  onLoad(options) {
    try {
      const sys = wx.getSystemInfoSync()
      this.setData({ statusBarHeight: sys.statusBarHeight || 20 })
    } catch (e) {
      this.setData({ statusBarHeight: 20 })
    }
    const now = new Date()
    const gender = options.gender || 'female'
    const displayYear = now.getFullYear()
    const displayMonth = now.getMonth() + 1
    const pickerDate = displayYear + '-' + (displayMonth < 10 ? '0' : '') + displayMonth + '-01'
    this.setData({
      gender,
      displayYear,
      displayMonth,
      pickerDate,
      illustUrl: getImageUrl('/packageDiary/images/diary-calendar/illust.png')
    }, () => {
      this.buildCalendar(displayYear, displayMonth)
    })
    this.updateWeekReviewCount()
  },

  onShow() {
    this.updateWeekReviewCount()
  },

  updateWeekReviewCount() {
    try {
      const cached = wx.getStorageSync(STORAGE_KEY)
      const stored = cached && typeof cached === 'string' ? JSON.parse(cached) : cached
      const pages = stored?.pages || []
      const weekDates = getWeekDates()
      const weekSet = new Set(weekDates)
      const count = pages.filter(p => weekSet.has(p.year + '-' + p.month + '-' + p.day)).length
      this.setData({ weekReviewCount: count })
    } catch (e) {
      this.setData({ weekReviewCount: 0 })
    }
  },

  onWeekReviewTap() {
    wx.navigateTo({
      url: '/packageDiary/pages/diary-week-review/diary-week-review'
    })
  },

  buildCalendar(year, month) {
    const displayYear = year ?? this.data.displayYear
    const displayMonth = month ?? this.data.displayMonth
    const firstDay = new Date(displayYear, displayMonth - 1, 1)
    const lastDay = new Date(displayYear, displayMonth, 0)
    const startWeekday = firstDay.getDay()
    const daysInMonth = lastDay.getDate()
    const now = new Date()
    const todayStr = now.getFullYear() + '-' + (now.getMonth() + 1) + '-' + now.getDate()

    const days = []
    for (let i = 0; i < startWeekday; i++) {
      days.push({ id: 'e-' + i, empty: true, date: '' })
    }
    for (let d = 1; d <= daysInMonth; d++) {
      const dateStr = displayYear + '-' + displayMonth + '-' + d
      const weather = this.getWeatherForDay(displayYear, displayMonth, d)
      days.push({
        id: dateStr,
        empty: false,
        day: d,
        date: dateStr,
        today: dateStr === todayStr,
        weather
      })
    }
    const counts = { sunny: 0, cloudy: 0, overcast: 0, rainy: 0, haze: 0 }
    days.forEach(d => {
      if (!d.empty && d.weather) counts[d.weather] = (counts[d.weather] || 0) + 1
    })
    this.setData({ calendarDays: days, stats: counts })
  },

  getWeatherForDay(year, month, day) {
    const seed = year * 10000 + month * 100 + day
    const idx = seed % WEATHER_TYPES.length
    return WEATHER_TYPES[idx]
  },

  onPrevMonth() {
    let { displayYear, displayMonth } = this.data
    displayMonth--
    if (displayMonth < 1) {
      displayMonth = 12
      displayYear--
    }
    const pickerDate = displayYear + '-' + (displayMonth < 10 ? '0' : '') + displayMonth + '-01'
    this.setData({ displayYear, displayMonth, pickerDate }, () => {
      this.buildCalendar(displayYear, displayMonth)
    })
  },

  onNextMonth() {
    let { displayYear, displayMonth } = this.data
    displayMonth++
    if (displayMonth > 12) {
      displayMonth = 1
      displayYear++
    }
    const pickerDate = displayYear + '-' + (displayMonth < 10 ? '0' : '') + displayMonth + '-01'
    this.setData({ displayYear, displayMonth, pickerDate }, () => {
      this.buildCalendar(displayYear, displayMonth)
    })
  },

  onDatePickerChange(e) {
    const val = e.detail.value
    if (!val) return
    const [year, month, day] = val.split('-').map(Number)
    this.setData({
      displayYear: year,
      displayMonth: month,
      pickerDate: val
    }, () => {
      this.buildCalendar(year, month)
      const weather = this.getWeatherForDay(year, month, day)
      wx.navigateTo({
        url: '/packageDiary/pages/diary-detail/diary-detail?year=' + year + '&month=' + month + '&day=' + day + '&weather=' + weather
      })
    })
  },

  onDayTap(e) {
    const date = e.currentTarget.dataset.date
    if (!date) return
    const parts = date.split('-')
    if (parts.length !== 3) return
    const [year, month, day] = parts
    const item = this.data.calendarDays.find(d => d.date === date)
    const weather = (item && item.weather) ? item.weather : 'sunny'
    wx.navigateTo({
      url: '/packageDiary/pages/diary-detail/diary-detail?year=' + year + '&month=' + month + '&day=' + day + '&weather=' + weather
    })
  },

  onBack() {
    wx.navigateBack()
  },

  onIllustError() {
    this.setData({ illustError: true })
  }
})
