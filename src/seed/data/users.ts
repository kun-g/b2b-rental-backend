/**
 * Seed 数据：用户
 */

export const usersData = {
  // ===== 平台端 =====
  platformAdmin: {
    username: 'kun',
    email: 'admin@platform.com',
    password: '123',
    role: 'platform_admin' as const,
    status: 'active' as const,
  },

  platformOperator: {
    username: 'operator',
    email: 'operator@platform.com',
    password: 'Operator123!',
    role: 'platform_operator' as const,
    status: 'active' as const,
  },

  platformSupport: {
    username: 'support',
    email: 'support@platform.com',
    password: 'Support123!',
    role: 'platform_support' as const,
    status: 'active' as const,
  },

  // ===== 租方端 =====
  alice: {
    username: 'alice',
    password: 'Alice123!',
    phone: '13800138001',
    role: 'customer' as const,
    status: 'active' as const,
    kyc_status: 'verified' as const,
    addresses: [
      {
        province: '广东省',
        city: '深圳市',
        district: '南山区',
        detail: '科技园南区',
        region_code: '440305',
        is_default: true,
      },
      {
        province: '北京市',
        city: '北京市',
        district: '朝阳区',
        detail: '三里屯SOHO',
        region_code: '110105',
        is_default: false,
      },
    ],
  },

  bob: {
    username: 'bob',
    password: 'Bob123!',
    phone: '13800138002',
    role: 'customer' as const,
    status: 'active' as const,
    kyc_status: 'verified' as const,
    addresses: [
      {
        province: '上海市',
        city: '上海市',
        district: '浦东新区',
        detail: '陆家嘴金融中心',
        region_code: '310115',
        is_default: true,
      },
    ],
  },

  charlie: {
    username: 'charlie',
    password: 'Charlie123!',
    phone: '13800138003',
    role: 'customer' as const,
    status: 'active' as const,
    kyc_status: 'verified' as const,
    addresses: [
      {
        province: '广东省',
        city: '广州市',
        district: '天河区',
        detail: '珠江新城',
        region_code: '440106',
        is_default: true,
      },
    ],
  },

  david: {
    username: 'david',
    password: 'David123!',
    phone: '13800138004',
    role: 'customer' as const,
    status: 'active' as const,
    kyc_status: 'verified' as const,
    addresses: [
      {
        province: '浙江省',
        city: '杭州市',
        district: '西湖区',
        detail: '西溪湿地',
        region_code: '330106',
        is_default: true,
      },
    ],
  },

  eve: {
    username: 'eve',
    password: 'Eve123!',
    phone: '13800138005',
    role: 'customer' as const,
    status: 'active' as const,
    kyc_status: 'verified' as const,
    addresses: [
      {
        province: '广东省',
        city: '深圳市',
        district: '福田区',
        detail: '华强北',
        region_code: '440304',
        is_default: true,
      },
    ],
  },

  frank: {
    username: 'frank',
    password: 'Frank123!',
    phone: '13800138006',
    role: 'customer' as const,
    status: 'active' as const,
    kyc_status: 'pending' as const, // 未认证
    addresses: [
      {
        province: '江苏省',
        city: '南京市',
        district: '玄武区',
        detail: '新街口',
        region_code: '320102',
        is_default: true,
      },
    ],
  },
}
