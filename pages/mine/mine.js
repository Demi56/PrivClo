const { getImageUrl } = require('../../utils/image.js')
const { MAIN_MODEL, MAIN_DIARY, MAIN_WARDROBE, reLaunchMain } = require('../../utils/mainTabs.js')

// 我的页面 - 个人中心（参照 My Space 布局）
Page({
  data: {
    statusBarHeight: 20,
    avatarError: false,
    gender: 'female',
    avatarFemaleUrl: '',
    avatarMaleUrl: '',
    roleName: '默认用户',
    userId: '8829310',
    points: 1000,
    styledCount: 0,
    diaryCount: 0,
    favorCount: 0,
    showLoginHint: false
  },

  onLoad(options) {
    try {
      const sys = wx.getSystemInfoSync()
      this.setData({ statusBarHeight: sys.statusBarHeight || 20 })
    } catch (e) {
      this.setData({ statusBarHeight: 20 })
    }
    const gender = options.gender || getApp().getUserGender() || 'female'
    this.setData({
      gender,
      avatarFemaleUrl: getImageUrl('/images/role/avatar-female.png'),
      avatarMaleUrl: getImageUrl('/images/role/avatar-male.png')
    })
    this._refreshLoginState()
    this._updateStatsFromStorage()
  },

  onShow() {
    this._refreshLoginState()
    this._updateStatsFromStorage()
  },

  _refreshLoginState() {
    const app = getApp()
    const loggedIn = app.isUserLoggedIn && app.isUserLoggedIn()
    app.globalData.isGuestMode = !loggedIn
    const gender = this.data.gender || 'female'
    this.setData({
      showLoginHint: !loggedIn,
      roleName: loggedIn ? app.getRoleDisplayName(gender) : '演示账号'
    })
  },

  _updateStatsFromStorage() {
    const app = getApp()
    const styledCount = (app.getStyledCount && app.getStyledCount()) || 0
    const diaryCount = (app.getDiaryCount && app.getDiaryCount()) || 0
    const outfits = (app.getFavoriteOutfits && app.getFavoriteOutfits()) || []
    const favorCount = Array.isArray(outfits) ? outfits.length : 0
    const points = (app.isUserLoggedIn && app.isUserLoggedIn())
      ? ((app.getPoints && app.getPoints()) || 0)
      : 0
    this.setData({ styledCount, diaryCount, favorCount, points })
  },

  onAvatarTap() {
    const app = getApp()
    if (app.isUserLoggedIn && app.isUserLoggedIn()) {
      wx.navigateTo({
        url: '/packageSettings/pages/account-security/account-security?gender=' + (this.data.gender || 'female')
      })
      return
    }
    app.goWechatLogin({ fromMine: true })
  },

  onAvatarError() {
    this.setData({ avatarError: true })
  },

  onTaskSquare() {
    wx.navigateTo({ url: '/packagePoints/pages/task-square/task-square?roleName=' + encodeURIComponent(this.data.roleName || getApp().getDefaultUserDisplayName()) })
  },

  onRoleManage() {
    wx.navigateTo({
      url: '/packageSettings/pages/role-manage/role-manage?gender=' + (this.data.gender || 'female')
    })
  },

  onPointsCenter() {
    wx.navigateTo({ url: '/packagePoints/pages/pointscenter/pointscenter?roleName=' + encodeURIComponent(this.data.roleName || getApp().getDefaultUserDisplayName()) })
  },

  onThemeStore() {
    wx.navigateTo({ url: '/packagePoints/pages/points-store/points-store' })
  },

  onFashionAdventure() {
    // 穿搭回顾 -> 穿搭回忆报告角色选择页
    wx.navigateTo({ url: '/packageMemoir/pages/memoir-select/memoir-select?gender=' + (this.data.gender || 'female') })
  },

  onMoreSettings() {
    wx.navigateTo({ url: '/packageSettings/pages/settings/settings?gender=' + (this.data.gender || 'female') })
  },

  onTabHome() { reLaunchMain(MAIN_MODEL, this.data.gender) },
  onTabDiary() { reLaunchMain(MAIN_DIARY, this.data.gender) },
  onTabWardrobe() { reLaunchMain(MAIN_WARDROBE, this.data.gender) },
  onTabMine() {}
})
