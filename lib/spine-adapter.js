/**
 * Spine 小程序适配层
 * 当未安装 spine-miniprogram 时，此模块作为占位，使 spine-model 自动降级到静态图
 *
 * 接入真实 Spine 运行时的方式：
 * 1. npm install spine-miniprogram（若该包存在）
 * 2. 或从 https://github.com/tianhe1986/spine-wechat 引入
 * 3. 或从 https://gitee.com/jerryjin0630/spine-player-for-wechat-mini-program 引入
 *
 * 然后将 spine-model.js 中的 require 指向实际库即可
 */

module.exports = {
  /**
   * @param {Object} canvas - 小程序 type=webgl 的 canvas 节点
   * @returns {Promise<Object|null>} spine 实例，含 loadSkeleton、render 等
   */
  getSpine(canvas) {
    return Promise.reject(new Error('Spine 运行时未接入，请安装 spine-miniprogram 或接入 spine-wechat'))
  }
}
