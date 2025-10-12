/**
 * Seed 数据：设备
 * 每个 SKU 下的具体设备实例
 */

export const devicesData = {
  // ===== 大疆 Mini 3 Pro（5个设备）=====
  djiMini3_001: {
    sn: 'DJI-MINI3-001',
    status: 'in_stock' as const,
    rental_count: 5,
    purchase_date: '2024-01-15',
    notes: '成色良好',
  },

  djiMini3_002: {
    sn: 'DJI-MINI3-002',
    status: 'in_stock' as const,
    rental_count: 3,
    purchase_date: '2024-02-20',
    notes: '',
  },

  djiMini3_003: {
    sn: 'DJI-MINI3-003',
    status: 'in_rent' as const,
    rental_count: 8,
    purchase_date: '2023-12-10',
    notes: '',
    // current_order 在创建订单时设置
  },

  djiMini3_004: {
    sn: 'DJI-MINI3-004',
    status: 'in_maintenance' as const,
    rental_count: 12,
    purchase_date: '2023-11-05',
    notes: '电池老化，待更换',
  },

  djiMini3_005: {
    sn: 'DJI-MINI3-005',
    status: 'in_stock' as const,
    rental_count: 1,
    purchase_date: '2024-09-01',
    notes: '全新设备',
  },

  // ===== 索尼 A7M4（3个设备，全部非 in_stock）=====
  sonyA7M4_001: {
    sn: 'SONY-A7M4-001',
    status: 'in_rent' as const,
    rental_count: 6,
    purchase_date: '2024-01-10',
    notes: '',
  },

  sonyA7M4_002: {
    sn: 'SONY-A7M4-002',
    status: 'in_maintenance' as const,
    rental_count: 10,
    purchase_date: '2023-10-15',
    notes: '快门按钮松动',
  },

  sonyA7M4_003: {
    sn: 'SONY-A7M4-003',
    status: 'scrapped' as const,
    rental_count: 20,
    purchase_date: '2023-06-01',
    notes: '摔落损坏，已报废',
  },

  // ===== 大疆 RS3 Pro（3个设备）=====
  djiRS3_001: {
    sn: 'DJI-RS3-001',
    status: 'in_stock' as const,
    rental_count: 4,
    purchase_date: '2024-03-10',
    notes: '',
  },

  djiRS3_002: {
    sn: 'DJI-RS3-002',
    status: 'in_stock' as const,
    rental_count: 2,
    purchase_date: '2024-05-15',
    notes: '',
  },

  djiRS3_003: {
    sn: 'DJI-RS3-003',
    status: 'in_stock' as const,
    rental_count: 0,
    purchase_date: '2024-10-01',
    notes: '全新未租',
  },

  // ===== GoPro Hero 12（4个设备）=====
  goProHero12_001: {
    sn: 'GOPRO-HERO12-001',
    status: 'in_stock' as const,
    rental_count: 7,
    purchase_date: '2024-02-01',
    notes: '',
  },

  goProHero12_002: {
    sn: 'GOPRO-HERO12-002',
    status: 'in_stock' as const,
    rental_count: 3,
    purchase_date: '2024-04-10',
    notes: '',
  },

  goProHero12_003: {
    sn: 'GOPRO-HERO12-003',
    status: 'in_stock' as const,
    rental_count: 1,
    purchase_date: '2024-08-15',
    notes: '',
  },

  goProHero12_004: {
    sn: 'GOPRO-HERO12-004',
    status: 'in_stock' as const,
    rental_count: 0,
    purchase_date: '2024-10-05',
    notes: '',
  },

  // ===== 三季帐篷（3个设备）=====
  tent2Person_001: {
    sn: 'TENT-2P-001',
    status: 'in_stock' as const,
    rental_count: 2,
    purchase_date: '2024-03-01',
    notes: '',
  },

  tent2Person_002: {
    sn: 'TENT-2P-002',
    status: 'in_stock' as const,
    rental_count: 0,
    purchase_date: '2024-07-20',
    notes: '全新',
  },

  tent2Person_003: {
    sn: 'TENT-2P-003',
    status: 'in_rent' as const,
    rental_count: 4,
    purchase_date: '2024-01-15',
    notes: '',
  },

  // ===== 登山包（2个设备）=====
  backpack60L_001: {
    sn: 'BACKPACK-60L-001',
    status: 'in_stock' as const,
    rental_count: 3,
    purchase_date: '2024-02-10',
    notes: '',
  },

  backpack60L_002: {
    sn: 'BACKPACK-60L-002',
    status: 'in_stock' as const,
    rental_count: 1,
    purchase_date: '2024-06-01',
    notes: '',
  },

  // ===== Nintendo Switch（5个设备，商户未审核）=====
  switchOLED_001: {
    sn: 'SWITCH-OLED-001',
    status: 'in_stock' as const,
    rental_count: 0,
    purchase_date: '2024-09-10',
    notes: '',
  },

  switchOLED_002: {
    sn: 'SWITCH-OLED-002',
    status: 'in_stock' as const,
    rental_count: 0,
    purchase_date: '2024-09-10',
    notes: '',
  },

  switchOLED_003: {
    sn: 'SWITCH-OLED-003',
    status: 'in_stock' as const,
    rental_count: 0,
    purchase_date: '2024-09-10',
    notes: '',
  },

  switchOLED_004: {
    sn: 'SWITCH-OLED-004',
    status: 'in_stock' as const,
    rental_count: 0,
    purchase_date: '2024-09-10',
    notes: '',
  },

  switchOLED_005: {
    sn: 'SWITCH-OLED-005',
    status: 'in_stock' as const,
    rental_count: 0,
    purchase_date: '2024-09-10',
    notes: '',
  },
}
