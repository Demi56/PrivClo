const { getImageUrl } = require('../config/cdn.js')

const WARDROBE_CLOSET_IMAGE_PATH = '/images/wardrobe/wardrobe-closet.png'

function getWardrobeDisplayImageUrl() {
  return getImageUrl(WARDROBE_CLOSET_IMAGE_PATH)
}

module.exports = {
  WARDROBE_CLOSET_IMAGE_PATH,
  getWardrobeDisplayImageUrl
}
