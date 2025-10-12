/**
 * Seed 数据：商户 SKU
 */

export const skusData = {
  // ===== 商户A - 极客科技租赁 =====
  djiMini3: {
    name: '大疆 Mini 3 Pro 无人机',
    description: '轻便型无人机，4K视频，续航34分钟',
    daily_fee: 50,
    device_value: 5000,
    inventory_qty: 5,
    is_listed: true,
    listing_status: 'approved' as const,
    images: [],
  },

  sonyA7M4: {
    name: '索尼 A7M4 相机套装',
    description: '全画幅微单相机，含24-70mm镜头',
    daily_fee: 120,
    device_value: 18000,
    inventory_qty: 0, // 无库存
    is_listed: true,
    listing_status: 'approved' as const,
    images: [],
  },

  djiRS3: {
    name: '大疆 RS3 Pro 稳定器',
    description: '专业级手持云台稳定器',
    daily_fee: 35,
    device_value: 3500,
    inventory_qty: 3,
    is_listed: false, // 未上架
    listing_status: 'draft' as const,
    images: [],
  },

  goProHero12: {
    name: 'GoPro Hero 12 运动相机',
    description: '5.3K视频，防水防震',
    daily_fee: 30,
    device_value: 3000,
    inventory_qty: 4,
    is_listed: true,
    listing_status: 'pending' as const, // 待审核
    images: [],
  },

  // ===== 商户B - 户外探险装备 =====
  tent2Person: {
    name: '三季帐篷 2人款',
    description: '轻量化帐篷，适合三季使用',
    daily_fee: 25,
    device_value: 1500,
    inventory_qty: 3,
    is_listed: true,
    listing_status: 'approved' as const,
    images: [],
  },

  backpack60L: {
    name: '专业登山包 60L',
    description: '大容量登山背包，透气背负系统',
    daily_fee: 20,
    device_value: 1200,
    inventory_qty: 2,
    is_listed: true,
    listing_status: 'approved' as const,
    images: [],
  },

  // ===== 商户C - 数码潮品（待审核商户）=====
  switchOLED: {
    name: 'Nintendo Switch OLED',
    description: '任天堂游戏机 OLED版',
    daily_fee: 40,
    device_value: 2500,
    inventory_qty: 5,
    is_listed: false,
    listing_status: 'draft' as const, // 商户未审核，无法上架
    images: [],
  },
}
