import type { CollectionConfig } from 'payload'

/**
 * Users Collection - 用户账号体系
 * 对应 PRD 2. 账号体系与权限
 * 包含：用户账号（租方）、商户账号（出方）、平台账号（运营方）
 *
 * 登录方式：
 * - 用户名(username) + 密码
 * - 手机号 + 验证码（需要自定义实现）
 * - 邮箱用于身份验证和通知
 */
export const Users: CollectionConfig = {
  slug: 'users',
  admin: {
    useAsTitle: 'username',
    defaultColumns: ['username', 'phone', 'email', 'role', 'status', 'updatedAt'],
    group: '账号管理',
  },
  access: {
    // 用户管理权限 - 只有 platform_admin 和 platform_operator 可以操作
    create: ({ req: { user } }) => {
      return user?.role === 'platform_admin' || user?.role === 'platform_operator'
    },
    read: ({ req: { user } }) => {
      // 只有 platform_admin 和 platform_operator 可以查看用户列表
      // 其他角色只能查看自己的信息（通过 /api/users/me）
      if (user?.role === 'platform_admin' || user?.role === 'platform_operator') {
        return true // 可以查看所有用户
      }
      // 其他角色只能查看自己
      return {
        id: {
          equals: user?.id,
        },
      }
    },
    update: ({ req: { user } }) => {
      // 只有 platform_admin 和 platform_operator 可以修改用户
      return user?.role === 'platform_admin' || user?.role === 'platform_operator'
    },
    delete: ({ req: { user } }) => {
      // 只有 platform_admin 可以删除用户
      return user?.role === 'platform_admin'
    },
  },
  auth: {
    tokenExpiration: 7 * 24 * 60 * 60, // 7天
    verify: false, // MVP阶段可选
    maxLoginAttempts: 5,
    lockTime: 2 * 60 * 60 * 1000, // 2小时锁定
    useAPIKey: false,
    loginWithUsername: {
      allowEmailLogin: false, // 禁用邮箱登录
      requireEmail: false, // 邮箱不是必填项
    },
  },
  fields: [
    {
      name: 'username',
      type: 'text',
      required: true,
      unique: true,
      label: '用户名',
      admin: {
        description: '用于登录的唯一账号名',
      },
    },
    {
      name: 'email',
      type: 'email',
      label: '邮箱',
      admin: {
        description: '用于身份验证和接收通知（非登录账号）',
      },
    },
    {
      name: 'phone',
      type: 'text',
      unique: true,
      label: '手机号',
      admin: {
        description: '用于身份验证和接收验证码（非登录账号，选填）',
      },
    },
    {
      name: 'role',
      type: 'select',
      required: true,
      defaultValue: 'customer',
      label: '角色',
      options: [
        { label: '用户（租方）', value: 'customer' },
        { label: '商户成员', value: 'merchant_member' },
        { label: '商户管理员', value: 'merchant_admin' },
        { label: '平台运营', value: 'platform_operator' },
        { label: '平台管理员', value: 'platform_admin' },
        { label: '平台客服', value: 'platform_support' },
      ],
      admin: {
        description: '决定用户在系统中的权限，只能由管理员设置',
        // 创建时可编辑，更新时根据权限判断
        readOnly: false,
      },
      access: {
        // 创建时可以设置角色（用于第一个用户）
        create: () => true,
        // 更新时只有平台管理员和平台运营可以修改角色
        update: ({ req: { user } }) => {
          return user?.role === 'platform_admin' || user?.role === 'platform_operator'
        },
        // 读取时所有人可见
        read: () => true,
      },
    },
    {
      name: 'merchant',
      type: 'relationship',
      relationTo: 'merchants',
      label: '所属商户',
      admin: {
        description: '仅商户成员/管理员需要',
        condition: (data) => data.role === 'merchant_member' || data.role === 'merchant_admin',
      },
    },
    {
      name: 'merchant_role',
      type: 'select',
      label: '商户内角色',
      options: [
        { label: '商户管理员', value: 'admin' },
        { label: '仓配人员', value: 'warehouse' },
        { label: '商品运营', value: 'operations' },
        { label: '财务人员', value: 'finance' },
        { label: '只读成员', value: 'readonly' },
      ],
      admin: {
        description: 'MVP建议先实现商户管理员角色',
        condition: (data) => data.role === 'merchant_member' || data.role === 'merchant_admin',
      },
    },
    {
      name: 'status',
      type: 'select',
      required: true,
      defaultValue: 'active',
      label: '账号状态',
      options: [
        { label: '正常', value: 'active' },
        { label: '已禁用', value: 'disabled' },
        { label: '已冻结', value: 'frozen' },
      ],
    },
    {
      name: 'last_login_at',
      type: 'date',
      label: '最后登录时间',
      admin: {
        date: {
          pickerAppearance: 'dayAndTime',
        },
        readOnly: true,
      },
    },
    {
      name: 'notes',
      type: 'textarea',
      label: '备注',
      admin: {
        description: '内部备注',
      },
    },
  ],
  hooks: {
    beforeChange: [
      async ({ data, req, operation }) => {
        // 记录最后登录时间
        if (operation === 'update' && req.user?.id === data.id) {
          data.last_login_at = new Date().toISOString()
        }
        return data
      },
    ],
  },
}
