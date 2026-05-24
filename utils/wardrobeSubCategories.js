let getImageUrl = (p) => (p && typeof p === 'string' ? p : '')
try {
  const img = require('./image.js')
  if (img && img.getImageUrl) getImageUrl = img.getImageUrl
} catch (e) {}

function applyCdn(subs) {
    return (subs || []).map(s => ({
      ...s,
      items: (s.items || []).map(i => ({ ...i, src: getImageUrl(i.src) }))
    }))
  }

function getSubCategories(categoryId) {
    if (categoryId === 'tops') {
      return applyCdn([
        { id: 'tshirt', name: 'T恤', items: [{ src: '/packageWardrobe/images/items/tops/tshirt/1.png' }, { src: '/packageWardrobe/images/items/tops/tshirt/2.png' }, { src: '/packageWardrobe/images/items/tops/tshirt/3.png' }, { src: '/packageWardrobe/images/items/tops/tshirt/4.png' }] },
        { id: 'shirt', name: '衬衫', items: [{ src: '/packageWardrobe/images/items/tops/shirt/1.png' }, { src: '/packageWardrobe/images/items/tops/shirt/2.png' }, { src: '/packageWardrobe/images/items/tops/shirt/3.png' }] },
        { id: 'sweatshirt', name: '卫衣', items: [{ src: '/packageWardrobe/images/items/tops/sweatshirt/1.png' }, { src: '/packageWardrobe/images/items/tops/sweatshirt/2.png' }, { src: '/packageWardrobe/images/items/tops/sweatshirt/3.png' }, { src: '/packageWardrobe/images/items/tops/sweatshirt/4.png' }] },
        { id: 'sweater', name: '毛衣', items: [{ src: '/packageWardrobe/images/items/tops/sweater/1.png' }, { src: '/packageWardrobe/images/items/tops/sweater/2.png' }, { src: '/packageWardrobe/images/items/tops/sweater/3.png' }, { src: '/packageWardrobe/images/items/tops/sweater/4.png' }] },
        { id: 'knitwear', name: '针织衫', items: [{ src: '/packageWardrobe/images/items/tops/knitwear/1.png' }, { src: '/packageWardrobe/images/items/tops/knitwear/2.png' }, { src: '/packageWardrobe/images/items/tops/knitwear/3.png' }, { src: '/packageWardrobe/images/items/tops/knitwear/4.png' }] },
        { id: 'blazer', name: '西装外套', items: [{ src: '/packageWardrobe/images/items/tops/blazer/1.png' }, { src: '/packageWardrobe/images/items/tops/blazer/2.png' }, { src: '/packageWardrobe/images/items/tops/blazer/3.png' }, { src: '/packageWardrobe/images/items/tops/blazer/4.png' }] },
        { id: 'jacket', name: '夹克', items: [{ src: '/packageWardrobe/images/items/tops/jacket/1.png' }, { src: '/packageWardrobe/images/items/tops/jacket/2.png' }, { src: '/packageWardrobe/images/items/tops/jacket/3.png' }, { src: '/packageWardrobe/images/items/tops/jacket/4.png' }] },
        { id: 'vest', name: '马甲', items: [{ src: '/packageWardrobe/images/items/tops/vest/1.png' }, { src: '/packageWardrobe/images/items/tops/vest/2.png' }, { src: '/packageWardrobe/images/items/tops/vest/3.png' }, { src: '/packageWardrobe/images/items/tops/vest/4.png' }] },
        { id: 'trenchcoat', name: '风衣', items: [{ src: '/packageWardrobe/images/items/tops/trenchcoat/1.png' }, { src: '/packageWardrobe/images/items/tops/trenchcoat/2.png' }, { src: '/packageWardrobe/images/items/tops/trenchcoat/3.png' }, { src: '/packageWardrobe/images/items/tops/trenchcoat/4.png' }] },
        { id: 'overcoat', name: '大衣', items: [{ src: '/packageWardrobe/images/items/tops/overcoat/1.png' }, { src: '/packageWardrobe/images/items/tops/overcoat/2.png' }, { src: '/packageWardrobe/images/items/tops/overcoat/3.png' }, { src: '/packageWardrobe/images/items/tops/overcoat/4.png' }] },
        { id: 'downcoat', name: '羽绒服', items: [{ src: '/packageWardrobe/images/items/tops/downcoat/1.png' }, { src: '/packageWardrobe/images/items/tops/downcoat/2.png' }, { src: '/packageWardrobe/images/items/tops/downcoat/3.png' }, { src: '/packageWardrobe/images/items/tops/downcoat/4.png' }] }
      ])
    }
    if (categoryId === 'bottoms') {
      return applyCdn([
        { id: 'jeans', name: '牛仔裤', items: [{ src: '/packageWardrobe/images/items/bottoms/jeans/1.png' }, { src: '/packageWardrobe/images/items/bottoms/jeans/2.png' }, { src: '/packageWardrobe/images/items/bottoms/jeans/3.png' }, { src: '/packageWardrobe/images/items/bottoms/jeans/4.png' }] },
        { id: 'sportspants', name: '运动裤', items: [{ src: '/packageWardrobe/images/items/bottoms/sportspants/1.png' }, { src: '/packageWardrobe/images/items/bottoms/sportspants/2.png' }, { src: '/packageWardrobe/images/items/bottoms/sportspants/3.png' }] },
        { id: 'shorts', name: '短裤', items: [{ src: '/packageWardrobe/images/items/bottoms/shorts/1.png' }, { src: '/packageWardrobe/images/items/bottoms/shorts/2.png' }, { src: '/packageWardrobe/images/items/bottoms/shorts/3.png' }, { src: '/packageWardrobe/images/items/bottoms/shorts/4.png' }] },
        { id: 'dresspants', name: '西裤', items: [{ src: '/packageWardrobe/images/items/bottoms/dresspants/1.png' }, { src: '/packageWardrobe/images/items/bottoms/dresspants/2.png' }, { src: '/packageWardrobe/images/items/bottoms/dresspants/3.png' }, { src: '/packageWardrobe/images/items/bottoms/dresspants/4.png' }] },
        { id: 'skirt', name: '半身裙', items: [{ src: '/packageWardrobe/images/items/bottoms/skirt/1.png' }, { src: '/packageWardrobe/images/items/bottoms/skirt/2.png' }, { src: '/packageWardrobe/images/items/bottoms/skirt/3.png' }, { src: '/packageWardrobe/images/items/bottoms/skirt/4.png' }] }
      ])
    }
    if (categoryId === 'sets') {
      return applyCdn([
        { id: 'dresses', name: '连衣裙', items: [{ src: '/packageWardrobe/images/items/sets/dresses/1.png' }, { src: '/packageWardrobe/images/items/sets/dresses/2.png' }, { src: '/packageWardrobe/images/items/sets/dresses/3.png' }, { src: '/packageWardrobe/images/items/sets/dresses/4.png' }] },
        { id: 'casual', name: '连体牛仔', items: [{ src: '/packageWardrobe/images/items/sets/casual/1.png' }, { src: '/packageWardrobe/images/items/sets/casual/2.png' }, { src: '/packageWardrobe/images/items/sets/casual/3.png' }] },
        { id: 'homewear', name: '家居服', items: [{ src: '/packageWardrobe/images/items/sets/homewear/1.png' }, { src: '/packageWardrobe/images/items/sets/homewear/2.png' }, { src: '/packageWardrobe/images/items/sets/homewear/3.png' }] },
        { id: 'businessset', name: '商务套装', items: [{ src: '/packageWardrobe/images/items/sets/businessset/1.png' }, { src: '/packageWardrobe/images/items/sets/businessset/2.png' }, { src: '/packageWardrobe/images/items/sets/businessset/3.png' }, { src: '/packageWardrobe/images/items/sets/businessset/4.png' }] },
        { id: 'sportset', name: '运动套装', items: [{ src: '/packageWardrobe/images/items/sets/sportset/1.png' }, { src: '/packageWardrobe/images/items/sets/sportset/2.png' }, { src: '/packageWardrobe/images/items/sets/sportset/3.png' }, { src: '/packageWardrobe/images/items/sets/sportset/4.png' }] }
      ])
    }
    if (categoryId === 'inner') {
      return applyCdn([
        { id: 'baseshirt', name: '打底衫', items: [{ src: '/packageWardrobe/images/items/inner/baseshirt/1.png' }, { src: '/packageWardrobe/images/items/inner/baseshirt/2.png' }, { src: '/packageWardrobe/images/items/inner/baseshirt/3.png' }] },
        { id: 'underwear', name: '内裤', items: [{ src: '/packageWardrobe/images/items/inner/underwear/1.png' }, { src: '/packageWardrobe/images/items/inner/underwear/2.png' }, { src: '/packageWardrobe/images/items/inner/underwear/3.png' }] },
        { id: 'socks', name: '袜子', items: [{ src: '/packageWardrobe/images/items/inner/socks/1.png' }, { src: '/packageWardrobe/images/items/inner/socks/2.png' }, { src: '/packageWardrobe/images/items/inner/socks/3.png' }, { src: '/packageWardrobe/images/items/inner/socks/4.png' }] },
        { id: 'bra', name: '文胸', items: [{ src: '/packageWardrobe/images/items/inner/bra/1.png' }, { src: '/packageWardrobe/images/items/inner/bra/2.png' }, { src: '/packageWardrobe/images/items/inner/bra/3.png' }, { src: '/packageWardrobe/images/items/inner/bra/4.png' }] },
        { id: 'camisole', name: '吊带', items: [{ src: '/packageWardrobe/images/items/inner/camisole/1.png' }, { src: '/packageWardrobe/images/items/inner/camisole/2.png' }, { src: '/packageWardrobe/images/items/inner/camisole/3.png' }, { src: '/packageWardrobe/images/items/inner/camisole/4.png' }] },
        { id: 'tanktop', name: '打底背心', items: [{ src: '/packageWardrobe/images/items/inner/tanktop/1.png' }, { src: '/packageWardrobe/images/items/inner/tanktop/2.png' }, { src: '/packageWardrobe/images/items/inner/tanktop/3.png' }, { src: '/packageWardrobe/images/items/inner/tanktop/4.png' }] },
        { id: 'thermal', name: '保暖衣裤', items: [{ src: '/packageWardrobe/images/items/inner/thermal/1.png' }, { src: '/packageWardrobe/images/items/inner/thermal/2.png' }, { src: '/packageWardrobe/images/items/inner/thermal/3.png' }, { src: '/packageWardrobe/images/items/inner/thermal/4.png' }] }
      ])
    }
    if (categoryId === 'shoes') {
      return applyCdn([
        { id: 'casual', name: '休闲鞋', items: [{ src: '/packageWardrobe/images/items/shoes/casual/1.png' }, { src: '/packageWardrobe/images/items/shoes/casual/2.png' }, { src: '/packageWardrobe/images/items/shoes/casual/3.png' }] },
        { id: 'sports', name: '运动鞋', items: [{ src: '/packageWardrobe/images/items/shoes/sports/1.png' }, { src: '/packageWardrobe/images/items/shoes/sports/2.png' }, { src: '/packageWardrobe/images/items/shoes/sports/3.png' }, { src: '/packageWardrobe/images/items/shoes/sports/4.png' }] },
        { id: 'business', name: '商务鞋', items: [{ src: '/packageWardrobe/images/items/shoes/business/1.png' }, { src: '/packageWardrobe/images/items/shoes/business/2.png' }, { src: '/packageWardrobe/images/items/shoes/business/3.png' }] },
        { id: 'heels', name: '高跟鞋', items: [{ src: '/packageWardrobe/images/items/shoes/heels/1.png' }, { src: '/packageWardrobe/images/items/shoes/heels/2.png' }, { src: '/packageWardrobe/images/items/shoes/heels/3.png' }, { src: '/packageWardrobe/images/items/shoes/heels/4.png' }] },
        { id: 'sandals', name: '凉鞋', items: [{ src: '/packageWardrobe/images/items/shoes/sandals/1.png' }, { src: '/packageWardrobe/images/items/shoes/sandals/2.png' }, { src: '/packageWardrobe/images/items/shoes/sandals/3.png' }, { src: '/packageWardrobe/images/items/shoes/sandals/4.png' }] },
        { id: 'slippers', name: '拖鞋', items: [{ src: '/packageWardrobe/images/items/shoes/slippers/1.png' }, { src: '/packageWardrobe/images/items/shoes/slippers/2.png' }, { src: '/packageWardrobe/images/items/shoes/slippers/3.png' }, { src: '/packageWardrobe/images/items/shoes/slippers/4.png' }] },
        { id: 'boots', name: '靴子', items: [{ src: '/packageWardrobe/images/items/shoes/boots/1.png' }, { src: '/packageWardrobe/images/items/shoes/boots/2.png' }, { src: '/packageWardrobe/images/items/shoes/boots/3.png' }, { src: '/packageWardrobe/images/items/shoes/boots/4.png' }] },
        { id: 'functionalshoes', name: '功能鞋', items: [{ src: '/packageWardrobe/images/items/shoes/functionalshoes/1.png' }, { src: '/packageWardrobe/images/items/shoes/functionalshoes/2.png' }, { src: '/packageWardrobe/images/items/shoes/functionalshoes/3.png' }, { src: '/packageWardrobe/images/items/shoes/functionalshoes/4.png' }] }
      ])
    }
    if (typeof categoryId === 'string' && categoryId.startsWith('custom_')) {
      try {
        const app = getApp()
        const config = (app.getPrivateSubConfig && app.getPrivateSubConfig()) || {}
        const cfg = config[categoryId]
        const customTypes = (app.getCustomTypes && app.getCustomTypes()) || []
      const typeInfo = customTypes.find(t => t.id === categoryId)
      const typeName = typeInfo ? typeInfo.name : '自定义'
      if (cfg && cfg.subs && cfg.subs.length > 0) {
        const userItems = (app.getUserWardrobeItems && app.getUserWardrobeItems()) || {}
        return cfg.subs.map(s => {
          const key = `${categoryId}:${s.id}`
          const arr = userItems[key] || []
          const items = arr.map(e => (typeof e === 'string' ? { src: e } : (e && e.src ? { src: e.src } : e)))
          return { id: s.id, name: s.name || '自定义', items }
        })
      }
        const userItems = (app.getUserWardrobeItems && app.getUserWardrobeItems()) || {}
        const defaultKey = `${categoryId}:default`
        const arr = userItems[defaultKey] || []
        const items = arr.map(e => (typeof e === 'string' ? { src: e } : (e && e.src ? { src: e.src } : e)))
        return [{ id: 'default', name: typeName, items }]
      } catch (e) {
        return []
      }
    }
    if (categoryId === 'accessories') {
      return applyCdn([
        { id: 'hats', name: '帽子', items: [{ src: '/packageWardrobe/images/items/accessories/hats/1.png' }, { src: '/packageWardrobe/images/items/accessories/hats/2.png' }, { src: '/packageWardrobe/images/items/accessories/hats/3.png' }, { src: '/packageWardrobe/images/items/accessories/hats/4.png' }] },
        { id: 'bags', name: '包包', items: [{ src: '/packageWardrobe/images/items/accessories/bags/1.png' }, { src: '/packageWardrobe/images/items/accessories/bags/2.png' }, { src: '/packageWardrobe/images/items/accessories/bags/3.png' }, { src: '/packageWardrobe/images/items/accessories/bags/4.png' }] },
        { id: 'jewelry', name: '首饰', items: [{ src: '/packageWardrobe/images/items/accessories/jewelry/1.png' }, { src: '/packageWardrobe/images/items/accessories/jewelry/2.png' }, { src: '/packageWardrobe/images/items/accessories/jewelry/3.png' }, { src: '/packageWardrobe/images/items/accessories/jewelry/4.png' }] },
        { id: 'glasses', name: '眼镜', items: [{ src: '/packageWardrobe/images/items/accessories/glasses/1.png' }, { src: '/packageWardrobe/images/items/accessories/glasses/2.png' }, { src: '/packageWardrobe/images/items/accessories/glasses/3.png' }, { src: '/packageWardrobe/images/items/accessories/glasses/4.png' }] },
        { id: 'watch', name: '手表', items: [{ src: '/packageWardrobe/images/items/accessories/watch/1.png' }, { src: '/packageWardrobe/images/items/accessories/watch/2.png' }, { src: '/packageWardrobe/images/items/accessories/watch/3.png' }, { src: '/packageWardrobe/images/items/accessories/watch/4.png' }] },
        { id: 'hair', name: '发饰', items: [{ src: '/packageWardrobe/images/items/accessories/hair/1.png' }, { src: '/packageWardrobe/images/items/accessories/hair/2.png' }, { src: '/packageWardrobe/images/items/accessories/hair/3.png' }, { src: '/packageWardrobe/images/items/accessories/hair/4.png' }] },
        { id: 'scarf', name: '围巾', items: [{ src: '/packageWardrobe/images/items/accessories/scarf/1.png' }, { src: '/packageWardrobe/images/items/accessories/scarf/2.png' }, { src: '/packageWardrobe/images/items/accessories/scarf/3.png' }, { src: '/packageWardrobe/images/items/accessories/scarf/4.png' }] },
        { id: 'gloves', name: '手套', items: [{ src: '/packageWardrobe/images/items/accessories/gloves/1.png' }, { src: '/packageWardrobe/images/items/accessories/gloves/2.png' }, { src: '/packageWardrobe/images/items/accessories/gloves/3.png' }, { src: '/packageWardrobe/images/items/accessories/gloves/4.png' }] },
        { id: 'belt', name: '腰带', items: [{ src: '/packageWardrobe/images/items/accessories/belt/1.png' }, { src: '/packageWardrobe/images/items/accessories/belt/2.png' }, { src: '/packageWardrobe/images/items/accessories/belt/3.png' }, { src: '/packageWardrobe/images/items/accessories/belt/4.png' }] }
      ])
    }
    return []
  }

function applySubCategoryOrder(categoryId, list) {
    const app = getApp()
    const order = app.globalData.subCategoryOrder && app.globalData.subCategoryOrder[categoryId]
    if (!order || !Array.isArray(order) || order.length === 0) return list
    const map = {}
    list.forEach(function (item) { map[item.id] = item })
    const result = []
    order.forEach(function (id) {
      if (map[id]) { result.push(map[id]); delete map[id] }
    })
    Object.keys(map).forEach(function (id) { result.push(map[id]) })
    return result
  }

function applySubCategoryRenames(categoryId, subCategories) {
    const app = getApp()
    const config = app.getPrivateSubConfig ? app.getPrivateSubConfig() : {}
    const renames = (config[categoryId] && config[categoryId].renames) || {}
    if (Object.keys(renames).length === 0) return subCategories
    return subCategories.map(function (s) {
      const renamed = renames[s.id]
      return renamed ? Object.assign({}, s, { name: renamed }) : s
    })
  }

function mergeUserWardrobeItems(categoryId, subCategories, prefitMode) {
    const app = getApp()
    const mode = prefitMode || 'official'
    const userItems = app.getUserWardrobeItems ? app.getUserWardrobeItems() : (app.globalData.userWardrobeItems || {})
    return subCategories.map(function (sub) {
      const key = `${categoryId}:${sub.id}`
      const extra = userItems[key] || []
      const userItemsArr = extra.map(function (e) {
        return typeof e === 'string' ? { src: e } : (e && e.src ? { src: e.src } : e)
      })
      const originalItems = (sub.items || []).slice()
      const items = mode === 'private' ? userItemsArr : originalItems
      return Object.assign({}, sub, { items })
    })
  }

function getPrivateSubCategories(categoryId) {
    const app = getApp()
    const config = app.getPrivateSubConfig ? app.getPrivateSubConfig() : {}
    const cfg = config[categoryId]
    const baseSubs = getSubCategories(categoryId)
    const baseMap = {}
    baseSubs.forEach(function (s) { baseMap[s.id] = s })
    if (cfg && cfg.subs && cfg.subs.length > 0) {
      const userItems = app.getUserWardrobeItems ? app.getUserWardrobeItems() : {}
      return cfg.subs.map(function (entry) {
        const key = `${categoryId}:${entry.id}`
        const extra = userItems[key] || []
        const items = extra.map(function (e) {
          return typeof e === 'string' ? { src: e } : (e && e.src ? { src: e.src } : e)
        })
        const base = baseMap[entry.id]
        return {
          id: entry.id,
          name: entry.name || (base && base.name) || '自定义',
          items
        }
      })
    }
    const ordered = applySubCategoryOrder(categoryId, baseSubs)
    const merged = mergeUserWardrobeItems(categoryId, ordered, 'private')
    const subs = merged.map(function (s) { return { id: s.id, name: s.name } })
    if (app.savePrivateSubConfig) {
      const newConfig = Object.assign({}, config, { [categoryId]: { subs } })
      app.savePrivateSubConfig(newConfig)
    }
    return merged
  }

module.exports = {
  applyCdn,
  getSubCategories,
  applySubCategoryOrder,
  applySubCategoryRenames,
  mergeUserWardrobeItems,
  getPrivateSubCategories
}
