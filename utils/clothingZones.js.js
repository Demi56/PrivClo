// utils/clothingZones.js
// 画布基准：750x1334 物理像素

const clothingZones = {
  female: {
    top: { x: 75, y: 260, w: 600, h: 300, label: '上衣' },
    shortBottom: { x: 140, y: 550, w: 470, h: 160, label: '短裤/短裙' },
    longBottom: { x: 120, y: 540, w: 510, h: 700, label: '长裤/长裙' },
    dress: { x: 60, y: 250, w: 630, h: 850, label: '连衣裙' },
    shoes: { x: 160, y: 1200, w: 430, h: 100, label: '鞋子' }
  },
  male: {
    top: { x: 50, y: 240, w: 650, h: 360, label: '上衣' },
    shortBottom: { x: 150, y: 590, w: 450, h: 200, label: '短裤' },
    longBottom: { x: 130, y: 580, w: 490, h: 680, label: '长裤' },
    dress: null,
    shoes: { x: 170, y: 1210, w: 410, h: 90, label: '鞋子' }
  }
};

function getZone(gender, clothingType) {
  var zones = clothingZones[gender];
  if (!zones) return null;
  var key = clothingType;
  if (clothingType === 'top') key = 'top';
  else if (clothingType === 'bottom' || clothingType === 'shortbottom') key = 'shortBottom';
  else if (clothingType === 'longbottom') key = 'longBottom';
  else if (clothingType === 'dress') key = 'dress';
  else if (clothingType === 'shoes') key = 'shoes';
  return zones[key] || null;
}

function isExclusiveType(clothingType) {
  return clothingType === 'dress';
}

module.exports = {
  clothingZones: clothingZones,
  getZone: getZone,
  isExclusiveType: isExclusiveType
};