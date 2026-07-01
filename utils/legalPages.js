/**
 * 法律文档页（subpackage：packageSettings/pages/privacy-terms）
 * tab=0 隐私政策 | tab=1 用户协议
 * 运营主体：衣橱管家
 */
var LEGAL_DOC_PATH = '/packageSettings/pages/privacy-terms/privacy-terms'

function navigateLegal(tab) {
  var q = tab === 1 ? '?tab=1' : '?tab=0'
  wx.navigateTo({
    url: LEGAL_DOC_PATH + q,
    fail: function(err) {
      console.error('打开法律文档页失败', err)
      wx.showToast({ title: '页面打开失败', icon: 'none' })
    }
  })
}

function openUserAgreement() {
  navigateLegal(1)
}

function openPrivacyPolicy() {
  navigateLegal(0)
}

module.exports = {
  LEGAL_DOC_PATH: LEGAL_DOC_PATH,
  openUserAgreement: openUserAgreement,
  openPrivacyPolicy: openPrivacyPolicy
}
