const cloud = require('wx-server-sdk')
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV })

exports.main = async (event, context) => {
  console.log('收到事件:', event)
  return {
    success: true,
    echo: event
  }
}