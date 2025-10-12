/**
 * Seed 数据：商户
 */

export const merchantsData = {
  geekRental: {
    name: '极客科技租赁',
    status: 'approved' as const,
    contact: {
      name: '张三',
      phone: '13900001111',
      email: 'contact@geek-rental.com',
    },
    settlement_account: {
      bank_name: '招商银行',
      account_number: '6214850123456789',
      account_name: '极客科技有限公司',
    },
    // business_license: 营业执照文件，seed阶段暂不上传
    notes: '营业执照号: 91110000MA01234567 / 公司名: 极客科技有限公司',
  },

  outdoorAdventure: {
    name: '户外探险装备',
    status: 'approved' as const,
    contact: {
      name: '李四',
      phone: '13900002222',
      email: 'contact@outdoor-adventure.com',
    },
    settlement_account: {
      bank_name: '工商银行',
      account_number: '6212260123456789',
      account_name: '户外探险有限公司',
    },
    // business_license: 营业执照文件，seed阶段暂不上传
    notes: '营业执照号: 91440300MA9876543X / 公司名: 户外探险有限公司',
  },

  digitalTrends: {
    name: '数码潮品',
    status: 'pending' as const, // 待审核
    contact: {
      name: '王五',
      phone: '13900003333',
      email: 'contact@digital-trends.com',
    },
    settlement_account: {
      bank_name: '建设银行',
      account_number: '6217000123456789',
      account_name: '数码潮品有限公司',
    },
    // business_license: 营业执照文件，seed阶段暂不上传
    notes: '营业执照号: 91310000MA5555555Y / 公司名: 数码潮品有限公司',
  },
}

// 商户管理员数据（关联到商户）
export const merchantAdminsData = {
  geekAdmin: {
    username: 'geek_admin',
    email: 'admin@geek-rental.com',
    password: 'MerchantA123!',
    role: 'merchant_admin' as const,
  },

  geekMember: {
    username: 'geek_member',
    email: 'member@geek-rental.com',
    password: 'MemberA123!',
    role: 'merchant_member' as const,
  },

  outdoorAdmin: {
    username: 'outdoor_admin',
    email: 'admin@outdoor-adventure.com',
    password: 'MerchantB123!',
    role: 'merchant_admin' as const,
  },
}
