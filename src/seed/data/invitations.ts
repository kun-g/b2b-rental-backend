/**
 * Seed 数据：授信邀请码
 */

export const invitationsData = {
  // ===== 商户A的邀请码 =====
  invite2024A: {
    code: 'INVITE2024A',
    credit_limit: 5000,
    max_uses: 10,
    used_count: 2, // Alice 和 Frank 已使用
    expires_at: () => {
      const date = new Date()
      date.setDate(date.getDate() + 30) // 30天后过期
      return date.toISOString()
    },
    status: 'active' as const,
    description: '新用户授信活动',
  },

  // ===== 商户B的邀请码 =====
  invite2024B: {
    code: 'INVITE2024B',
    credit_limit: 3000,
    max_uses: 5,
    used_count: 1, // Bob 已使用
    expires_at: () => {
      const date = new Date()
      date.setDate(date.getDate() + 60) // 60天后过期
      return date.toISOString()
    },
    status: 'active' as const,
    description: '户外装备体验活动',
  },

  // ===== 已过期的邀请码 =====
  expired2023: {
    code: 'EXPIRED2023',
    credit_limit: 10000,
    max_uses: 100,
    used_count: 0,
    expires_at: () => {
      const date = new Date()
      date.setDate(date.getDate() - 30) // 30天前过期
      return date.toISOString()
    },
    status: 'expired' as const,
    description: '2023年终大促（已过期）',
  },
}

// 邀请码使用记录
export const invitationUsagesData = {
  usage1: {
    // invitation: 动态设置
    // user: alice
    used_at: '2024-09-15T10:00:00.000Z',
    credit_amount: 5000,
  },

  usage2: {
    // invitation: 动态设置
    // user: frank
    used_at: '2024-10-01T14:30:00.000Z',
    credit_amount: 5000,
  },

  usage3: {
    // invitation: 动态设置
    // user: bob
    used_at: '2024-09-20T16:00:00.000Z',
    credit_amount: 3000,
  },
}
