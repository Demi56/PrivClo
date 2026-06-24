// 通知设置
const NOTIFICATION_ITEMS = [
  { key: 'outfitRecommend', title: '穿搭推荐提醒', desc: '每日根据天气与衣橱推荐搭配' },
  { key: 'weatherAlert', title: '天气变化提醒', desc: '气温骤变时提醒你调整穿搭' },
  { key: 'diaryReminder', title: '日记打卡提醒', desc: '提醒你记录今日穿搭与心情' },
  { key: 'pointsActivity', title: '积分与活动通知', desc: '任务奖励、限时活动与福利消息' },
  { key: 'systemMessage', title: '系统消息', desc: '版本更新、服务公告等重要通知' }
]

Page({
  data: {
    statusBarHeight: 20,
    items: [],
    enabled: true,
    itemsDisabled: false
  },

  onLoad() {
    try {
      const sys = wx.getSystemInfoSync()
      this.setData({ statusBarHeight: sys.statusBarHeight || 20 })
    } catch (e) {
      this.setData({ statusBarHeight: 20 })
    }
    this._loadSettings()
  },

  _buildItems(prefs) {
    return NOTIFICATION_ITEMS.map((item) => ({
      ...item,
      checked: prefs.enabled && !!prefs[item.key]
    }))
  },

  _loadSettings() {
    const prefs = getApp().getNotificationSettings()
    this.setData({
      enabled: prefs.enabled,
      itemsDisabled: !prefs.enabled,
      items: this._buildItems(prefs)
    })
  },

  _save(partial) {
    const prefs = getApp().saveNotificationSettings(partial)
    this.setData({
      enabled: prefs.enabled,
      itemsDisabled: !prefs.enabled,
      items: this._buildItems(prefs)
    })
  },

  onBack() {
    wx.navigateBack()
  },

  onToggleMaster(e) {
    const enabled = !!(e.detail && e.detail.value)
    this._save({ enabled })
    if (!enabled) {
      wx.showToast({ title: '已关闭全部通知', icon: 'none' })
    }
  },

  onToggleItem(e) {
    const key = e.currentTarget.dataset.key
    if (!key || !this.data.enabled) return
    const checked = !!(e.detail && e.detail.value)
    this._save({ [key]: checked })
  }
})
