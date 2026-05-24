const { getImageUrl } = require('../../../utils/image.js')

// 本周穿搭回顾
const WEEK_NAMES = ['周日', '周一', '周二', '周三', '周四', '周五', '周六']
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
    dates.push({
      year: d.getFullYear(),
      month: d.getMonth() + 1,
      day: d.getDate(),
      week: WEEK_NAMES[d.getDay()],
      dateStr: d.getFullYear() + '-' + (d.getMonth() + 1) + '-' + d.getDate()
    })
  }
  return dates
}

function getWeatherForDay(year, month, day) {
  const seed = year * 10000 + month * 100 + day
  const types = ['sunny', 'cloudy', 'overcast', 'rainy', 'haze']
  return types[seed % types.length]
}

Page({
  data: {
    statusBarHeight: 20,
    avatarError: false,
    illustUrl: '',
    greeting: '这是你闪闪发光的一周哦！✨',
    topStyle: '简约',
    topMood: '开心',
    momentCards: []
  },

  onLoad() {
    try {
      const sys = wx.getSystemInfoSync()
      this.setData({
        statusBarHeight: sys.statusBarHeight || 20,
        illustUrl: getImageUrl('/packageDiary/images/diary-calendar/illust.png')
      })
    } catch (e) {
      this.setData({ statusBarHeight: 20, illustUrl: getImageUrl('/packageDiary/images/diary-calendar/illust.png') })
    }
    this.buildMomentCards()
  },

  buildMomentCards() {
    const weekDates = getWeekDates()
    const descs = ['轻松的工作日穿搭', '咖啡馆的午后时光', '阳光明媚, 心情大好!', 'Happy Friday!', '', '运动日打卡', '慵懒的周末']
    const temps = ['22', '23', '25', '21', '19', '26', '24']
    const weathers = ['cloudy', 'cloudy', 'sunny', 'cloudy', 'rainy', 'sunny', 'sunny']
    const imgBgs = ['#A8D5E5', '#D4C4A8', '#E8E8E8', '#5C7C6B', '#7BA3B8', '#9BC4B8', '#E1D5C4']
    let momentCards = []
    try {
      const cached = wx.getStorageSync(STORAGE_KEY)
      const stored = cached && typeof cached === 'string' ? JSON.parse(cached) : cached
      const pages = stored?.pages || []
      const pageMap = {}
      pages.forEach(p => {
        const key = p.year + '-' + p.month + '-' + p.day
        pageMap[key] = p
      })
      momentCards = weekDates.map((d, idx) => {
        const key = d.year + '-' + d.month + '-' + d.day
        const page = pageMap[key]
        return {
          id: key,
          month: d.month,
          day: d.day,
          week: d.week,
          desc: page?.content ? (page.content.slice(0, 14) + (page.content.length > 14 ? '...' : '')) : descs[idx % 7],
          weather: page ? getWeatherForDay(d.year, d.month, d.day) : weathers[idx % 7],
          temp: temps[idx % 7],
          photo: page?.photo || '',
          isBest: idx === 2,
          year: d.year,
          imgBg: imgBgs[idx % 7]
        }
      })
    } catch (e) {
      momentCards = weekDates.map((d, idx) => ({
        id: d.year + '-' + d.month + '-' + d.day,
        month: d.month,
        day: d.day,
        week: d.week,
        desc: descs[idx % 7],
        weather: weathers[idx % 7],
        temp: temps[idx % 7],
        photo: '',
        isBest: idx === 2,
        year: d.year,
        imgBg: imgBgs[idx % 7]
      }))
    }
    this.setData({ momentCards })
  },

  onBack() {
    wx.navigateBack()
  },

  onAvatarError() {
    this.setData({ avatarError: true })
  },

  onCardTap(e) {
    const { year, month, day, weather } = e.currentTarget.dataset
    if (!year || !month || !day) return
    wx.navigateTo({
      url: '/packageDiary/pages/diary-detail/diary-detail?year=' + year + '&month=' + month + '&day=' + day + '&weather=' + (weather || 'sunny')
    })
  }
})
