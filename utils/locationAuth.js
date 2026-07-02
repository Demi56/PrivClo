/**
 * 定位授权：隐私协议 → scope.userLocation → wx.getLocation
 */

var LOG_TAG = '[locationAuth]'

function logLocationFail(stage, err, extra) {
  var payload = { stage: stage, err: err }
  if (extra) payload.extra = extra
  console.error(LOG_TAG, 'fail:', payload)
  if (err && err.errMsg) {
    console.error(LOG_TAG, 'errMsg:', err.errMsg)
  } else if (err && err.message) {
    console.error(LOG_TAG, 'message:', err.message)
  }
}

function ensurePrivacyAuthorized() {
  return new Promise(function (resolve, reject) {
    if (!wx.getPrivacySetting) {
      resolve()
      return
    }
    wx.getPrivacySetting({
      success: function (res) {
        if (res.needAuthorization && wx.requirePrivacyAuthorize) {
          wx.requirePrivacyAuthorize({
            success: function () { resolve() },
            fail: function (err) {
              logLocationFail('privacy_authorize', err)
              reject(err || new Error('privacy_denied'))
            }
          })
        } else {
          resolve()
        }
      },
      fail: function (err) {
        logLocationFail('get_privacy_setting', err)
        resolve()
      }
    })
  })
}

function getAuthSetting() {
  return new Promise(function (resolve) {
    wx.getSetting({
      success: function (res) { resolve(res.authSetting || {}) },
      fail: function () { resolve({}) }
    })
  })
}

function authorizeLocationScope() {
  return new Promise(function (resolve, reject) {
    wx.authorize({
      scope: 'scope.userLocation',
      success: function () { resolve(true) },
      fail: function (err) {
        logLocationFail('authorize_scope', err)
        reject(err || new Error('auth_denied'))
      }
    })
  })
}

function getLocationCoords() {
  return new Promise(function (resolve, reject) {
    wx.getLocation({
      type: 'gcj02',
      isHighAccuracy: true,
      highAccuracyExpireTime: 4000,
      success: resolve,
      fail: function (err) {
        logLocationFail('get_location', err)
        reject(err)
      }
    })
  })
}

function promptOpenSetting() {
  return new Promise(function (resolve) {
    wx.showModal({
      title: '需要定位权限',
      content: '请在设置中开启位置信息，以便获取当地天气',
      confirmText: '去设置',
      cancelText: '取消',
      success: function (m) {
        if (!m.confirm) {
          resolve(false)
          return
        }
        wx.openSetting({
          success: function (settingRes) {
            resolve(!!(settingRes.authSetting && settingRes.authSetting['scope.userLocation']))
          },
          fail: function () { resolve(false) }
        })
      },
      fail: function () { resolve(false) }
    })
  })
}

function ensureLocationScopeAuthorized(guideToSetting) {
  return getAuthSetting().then(function (authSetting) {
    var locationAuth = authSetting['scope.userLocation']
    if (locationAuth === true) return true
    if (locationAuth === false) {
      if (!guideToSetting) {
        logLocationFail('location_scope_denied', new Error('location_denied'), { authSetting: authSetting })
        return Promise.reject(new Error('location_denied'))
      }
      return promptOpenSetting().then(function (granted) {
        if (!granted) {
          logLocationFail('open_setting_rejected', new Error('location_denied'))
          throw new Error('location_denied')
        }
        return true
      })
    }
    return authorizeLocationScope().catch(function (err) {
      if (!guideToSetting) throw err
      return promptOpenSetting().then(function (granted) {
        if (!granted) {
          logLocationFail('open_setting_rejected', err)
          throw new Error('location_denied')
        }
        return true
      })
    })
  })
}

/**
 * @param {{ guideToSetting?: boolean }} options
 * @returns {Promise<{ ok: true, latitude: number, longitude: number } | { ok: false, reason: string, err?: any }>}
 */
function requestUserLocation(options) {
  var guideToSetting = !options || options.guideToSetting !== false

  return ensurePrivacyAuthorized()
    .catch(function (err) {
      logLocationFail('privacy_flow', err)
      return { ok: false, reason: 'privacy_denied', err: err }
    })
    .then(function (privacyResult) {
      if (privacyResult && privacyResult.ok === false) return privacyResult

      return ensureLocationScopeAuthorized(guideToSetting)
        .then(function () { return getLocationCoords() })
        .then(function (res) {
          console.log(LOG_TAG, 'success:', { latitude: res.latitude, longitude: res.longitude })
          return {
            ok: true,
            latitude: res.latitude,
            longitude: res.longitude
          }
        })
        .catch(function (err) {
          var reason = (err && err.message === 'location_denied')
            ? 'location_denied'
            : 'get_location_fail'
          logLocationFail('request_user_location', err, { reason: reason })
          return { ok: false, reason: reason, err: err }
        })
    })
}

function showLocationFailToast(reason) {
  var map = {
    privacy_denied: '需同意隐私协议后才能使用定位',
    location_denied: '未开启定位权限，已使用默认天气',
    get_location_fail: '定位失败，已使用默认天气'
  }
  wx.showToast({
    title: map[reason] || '定位失败，已使用默认天气',
    icon: 'none'
  })
}

module.exports = {
  requestUserLocation,
  showLocationFailToast
}
