/**
 * Seed 数据：Accounts（登录凭证）和 Users（业务身份）
 */

/**
 * Accounts 数据 - 登录凭证
 */
export const accountsData = {
  // ===== 平台端 =====
  platformAdmin: {
    username: 'kun',
    email: 'admin@platform.com',
    phone: '13900000001',
    password: '123',
    status: 'active' as const,
  },

  platformOperator: {
    username: 'operator',
    email: 'operator@platform.com',
    phone: '13900000002',
    password: 'Operator123!',
    status: 'active' as const,
  },

  platformSupport: {
    username: 'support',
    email: 'support@platform.com',
    phone: '13900000003',
    password: 'Support123!',
    status: 'active' as const,
  },

  testAll: {
    username: 'test_all',
    email: 'test_all@demo.local',
    phone: '13900000999',
    password: '123',
    status: 'active' as const,
  },

  // ===== 租方端 =====
  alice: {
    username: 'alice',
    phone: '13800138001',
    password: 'Alice123!',
    status: 'active' as const,
  },

  bob: {
    username: 'bob',
    phone: '13800138002',
    password: 'Bob123!',
    status: 'active' as const,
  },

  charlie: {
    username: 'charlie',
    phone: '13800138003',
    password: 'Charlie123!',
    status: 'active' as const,
  },

  david: {
    username: 'david',
    phone: '13800138004',
    password: 'David123!',
    status: 'active' as const,
  },

  eve: {
    username: 'eve',
    phone: '13800138005',
    password: 'Eve123!',
    status: 'active' as const,
  },

  frank: {
    username: 'frank',
    phone: '13800138006',
    password: 'Frank123!',
    status: 'active' as const,
  },
}

/**
 * Users 数据 - 业务身份（关联到 Account）
 */
export const usersData = {
  // ===== 平台端 =====
  platformAdmin: {
    user_type: 'platform' as const,
    role: 'platform_admin' as const,
    status: 'active' as const,
  },

  platformOperator: {
    user_type: 'platform' as const,
    role: 'platform_operator' as const,
    status: 'active' as const,
  },

  platformSupport: {
    user_type: 'platform' as const,
    role: 'platform_support' as const,
    status: 'active' as const,
  },

  // ===== 租方端 =====
  alice: {
    user_type: 'customer' as const,
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
    user_type: 'customer' as const,
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
    user_type: 'customer' as const,
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
    user_type: 'customer' as const,
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
    user_type: 'customer' as const,
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
    user_type: 'customer' as const,
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

  testAllCustomer: {
    user_type: 'customer' as const,
    role: 'customer' as const,
    status: 'active' as const,
  },
}
