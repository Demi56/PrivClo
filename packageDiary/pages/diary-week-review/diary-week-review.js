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
    const weekday = d.getDay()
    dates.push({
      year: d.getFullYear(),
      month: d.getMonth() + 1,
      day: d.getDate(),
      weekday,
      week: WEEK_NAMES[weekday],
      dateStr: d.getFullYear() + '-' + (d.getMonth() + 1) + '-' + d.getDate()
    })
  }
  return dates
}

/** 按星期几（0=周日…4=周四…5=周五）取默认卡片文案，避免与「周一起算」的下标错位 */
const DEFAULT_DESC_BY_WEEKDAY = {
  0: '慵懒的周末',
  1: '轻松的工作日穿搭',
  2: '咖啡馆的午后时光',
  3: '阳光明媚, 心情大好!',
  4: 'Happy Thursday!',
  5: 'Happy Friday!',
  6: '运动日打卡'
}

const DEFAULT_TEMP_BY_WEEKDAY = {
  0: '24', 1: '22', 2: '23', 3: '25', 4: '21', 5: '19', 6: '26'
}

const DEFAULT_WEATHER_BY_WEEKDAY = {
  0: 'sunny', 1: 'cloudy', 2: 'cloudy', 3: 'sunny', 4: 'cloudy', 5: 'rainy', 6: 'sunny'
}

const DEFAULT_IMG_BG_BY_WEEKDAY = {
  0: '#E1D5C4', 1: '#A8D5E5', 2: '#D4C4A8', 3: '#E8E8E8', 4: '#5C7C6B', 5: '#7BA3B8', 6: '#9BC4B8'
}

function getDefaultDesc(weekday) {
  return DEFAULT_DESC_BY_WEEKDAY[weekday] || ''
}

function summarizeDiaryContent(content) {
  if (!content || typeof content !== 'string') return ''
  const text = content.trim()
  if (!text) return ''
  return text.slice(0, 14) + (text.length > 14 ? '...' : '')
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
        const wd = d.weekday
        const diarySnippet = summarizeDiaryContent(page?.content)
        return {
          id: key,
          month: d.month,
          day: d.day,
          week: d.week,
          desc: diarySnippet || getDefaultDesc(wd),
          weather: page ? getWeatherForDay(d.year, d.month, d.day) : DEFAULT_WEATHER_BY_WEEKDAY[wd],
          temp: DEFAULT_TEMP_BY_WEEKDAY[wd],
          photo: page?.photo || '',
          isBest: wd === 3,
          year: d.year,
          imgBg: DEFAULT_IMG_BG_BY_WEEKDAY[wd]
        }
      })
    } catch (e) {
      momentCards = weekDates.map((d, idx) => {
        const wd = d.weekday
        return {
          id: d.year + '-' + d.month + '-' + d.day,
          month: d.month,
          day: d.day,
          week: d.week,
          desc: getDefaultDesc(wd),
          weather: DEFAULT_WEATHER_BY_WEEKDAY[wd],
          temp: DEFAULT_TEMP_BY_WEEKDAY[wd],
          photo: '',
          isBest: wd === 3,
          year: d.year,
          imgBg: DEFAULT_IMG_BG_BY_WEEKDAY[wd]
        }
      })
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
