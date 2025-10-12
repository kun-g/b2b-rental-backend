/**
 * Seed 数据：类目
 */

export const categoriesData = {
  // ===== 一级类目 =====
  electronics: {
    name: '电子设备',
    sort: 1,
    status: 'active' as const,
  },

  outdoor: {
    name: '户外装备',
    sort: 2,
    status: 'active' as const,
  },

  sports: {
    name: '运动器材',
    sort: 3,
    status: 'inactive' as const, // 不活跃类目
  },

  // ===== 二级类目（parent 在创建时动态关联）=====
  drone: {
    name: '无人机',
    sort: 1,
    status: 'active' as const,
  },

  camera: {
    name: '相机',
    sort: 2,
    status: 'active' as const,
  },

  gimbal: {
    name: '稳定器',
    sort: 3,
    status: 'active' as const,
  },

  tent: {
    name: '帐篷',
    sort: 1,
    status: 'active' as const,
  },

  climbing: {
    name: '登山装备',
    sort: 2,
    status: 'active' as const,
  },

  fitness: {
    name: '健身设备',
    sort: 1,
    status: 'inactive' as const,
  },
}
