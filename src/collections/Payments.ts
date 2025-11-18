import type { CollectionConfig } from 'payload'
import { accountHasRole } from '../utils/accountUtils'

/**
 * Payments Collection - 支付记录（统一管理所有支付类型）
 * 对应 PRD 7 数据模型 payment 和 B2B_Collections_WithDesc.md
 *
 * 设计说明：
 * - 统一管理租赁支付、逾期补收、改址差额等所有支付场景
 * - 通过 type 字段区分支付用途
 * - 使用正负金额表示收款/退款（负数=退款）
 * - 替代原 Surcharges Collection（功能重复）
 */
export const Payments: CollectionConfig = {
  slug: 'payments',
  admin: {
    useAsTitle: 'transaction_no',
    defaultColumns: ['transaction_no', 'order', 'type', 'amount', 'status', 'paid_at'],
    group: '订单管理',
  },
  access: {
    create: async ({ req: { user, payload }, data }) => {
      if (!user) {
        console.log('🔒 [Payments Access] 未登录用户')
        return false
      }
      
      console.log('🔒 [Payments Access] 检查权限', {
        userId: user.id,
        orderId: data?.order,
      })
      
      // 平台和商户可以创建任何支付记录
      const hasAdminRole = await accountHasRole(payload, user.id, [
        'platform_admin',
        'platform_operator',
        'merchant_admin',
        'merchant_member',
      ])
      
      console.log('🔒 [Payments Access] 管理员角色检查', { hasAdminRole })
      if (hasAdminRole) return true
      
      // 客户可以为自己的订单创建支付记录
      const hasCustomerRole = await accountHasRole(payload, user.id, ['customer'])
      console.log('🔒 [Payments Access] 客户角色检查', { hasCustomerRole })
      
      if (hasCustomerRole && data?.order) {
        try {
          // 验证订单是否属于当前客户
          const { getUserFromAccount } = await import('../utils/accountUtils')
          const customerUser = await getUserFromAccount(payload, user.id, ['customer'])
          
          console.log('🔒 [Payments Access] 获取客户用户', { customerUser: customerUser?.id })
          
          if (customerUser) {
            const orderId = typeof data.order === 'object' ? data.order.id : data.order
            const order = await payload.findByID({
              collection: 'orders',
              id: orderId,
            })
            
            console.log('🔒 [Payments Access] 订单信息', {
              orderId,
              orderCustomerId: typeof order.customer === 'object' ? order.customer.id : order.customer,
              currentCustomerId: customerUser.id,
            })
            
            const orderCustomerId = typeof order.customer === 'object' ? order.customer.id : order.customer
            const isOwner = String(orderCustomerId) === String(customerUser.id)
            
            console.log('🔒 [Payments Access] 权限检查结果', { isOwner })
            return isOwner
          }
        } catch (error) {
          console.error('🔒 [Payments Access] 权限检查出错', error)
          return false
        }
      }
      
      console.log('🔒 [Payments Access] 权限检查失败')
      return false
    },
    update: async ({ req: { user, payload }, id }) => {
      if (!user) {
        console.log('🔒 [Payments Update] 未登录用户')
        return false
      }
      
      console.log('🔒 [Payments Update] 检查更新权限', {
        userId: user.id,
        paymentId: id,
      })
      
      // 平台可以修改任何支付记录
      const hasAdminRole = await accountHasRole(payload, user.id, ['platform_admin', 'platform_operator'])
      console.log('🔒 [Payments Update] 管理员角色检查', { hasAdminRole })
      if (hasAdminRole) return true
      
      // 客户可以更新自己订单的支付记录（仅限状态更新）
      const hasCustomerRole = await accountHasRole(payload, user.id, ['customer'])
      console.log('🔒 [Payments Update] 客户角色检查', { hasCustomerRole })
      
      if (hasCustomerRole && id) {
        try {
          // 获取支付记录
          const payment = await payload.findByID({
            collection: 'payments',
            id: id as string,
          })
          
          console.log('🔒 [Payments Update] 支付记录信息', {
            paymentId: payment.id,
            orderId: typeof payment.order === 'object' ? payment.order.id : payment.order,
          })
          
          // 获取订单信息
          const orderId = typeof payment.order === 'object' ? payment.order.id : payment.order
          const order = await payload.findByID({
            collection: 'orders',
            id: orderId,
          })
          
          // 验证订单是否属于当前客户
          const { getUserFromAccount } = await import('../utils/accountUtils')
          const customerUser = await getUserFromAccount(payload, user.id, ['customer'])
          
          if (customerUser) {
            const orderCustomerId = typeof order.customer === 'object' ? order.customer.id : order.customer
            const isOwner = String(orderCustomerId) === String(customerUser.id)
            
            console.log('🔒 [Payments Update] 权限检查结果', {
              orderCustomerId,
              currentCustomerId: customerUser.id,
              isOwner,
            })
            
            return isOwner
          }
        } catch (error) {
          console.error('🔒 [Payments Update] 权限检查出错', error)
          return false
        }
      }
      
      console.log('🔒 [Payments Update] 权限检查失败')
      return false
    },
    delete: async ({ req: { user, payload } }) => {
      if (!user) return false
      // 只有平台管理员可以删除支付记录
      return await accountHasRole(payload, user.id, ['platform_admin'])
    },
  },
  fields: [
    {
      name: 'transaction_no',
      type: 'text',
      required: true,
      unique: true,
      label: '交易流水号',
      admin: {
        description: '系统生成的唯一交易号',
        readOnly: true,
      },
    },
    {
      name: 'order_no',
      type: 'text',
      required: true,
      label: '租赁订单编号',
      admin: {
        description: '关联的订单编号',
      },
    },
    {
      name: 'order',
      type: 'relationship',
      relationTo: 'orders',
      required: true,
      label: '关联订单',
      admin: {
        description: '关联订单对象（用于查询）',
      },
    },
    {
      name: 'out_pay_no',
      type: 'text',
      label: '外部支付单号',
      admin: {
        description: '微信/支付宝等第三方支付平台返回的支付单号',
      },
    },
    {
      name: 'type',
      type: 'select',
      required: true,
      label: '支付类型',
      options: [
        { label: '租赁支付（租金+运费）', value: 'rent' },
        { label: '租赁取消退款', value: 'rent_canceled' },
        { label: '逾期补收', value: 'overdue' },
        { label: '改址补收（运费增加）', value: 'addr_up' },
        { label: '改址退款（运费减少）', value: 'addr_down' },
      ],
      admin: {
        description: '区分支付用途（统一管理所有支付场景）',
      },
    },
    {
      name: 'amount',
      type: 'number',
      required: true,
      label: '金额（元）',
      admin: {
        description: '正数表示应收款，负数表示退款',
      },
    },
    {
      name: 'amount_detail',
      type: 'group',
      label: '金额明细',
      admin: {
        description: '仅在 type=rent 时需要填写',
      },
      fields: [
        {
          name: 'rent',
          type: 'number',
          label: '租金（元）',
          admin: {
            description: '租期天数 × 日租金',
          },
        },
        {
          name: 'shipping',
          type: 'number',
          label: '运费（元）',
        },
      ],
    },
    {
      name: 'status',
      type: 'select',
      required: true,
      defaultValue: 'pending',
      label: '支付状态',
      options: [
        { label: '待支付', value: 'pending' },
        { label: '已支付', value: 'paid' },
        { label: '已退款', value: 'refunded' },
        { label: '已失败', value: 'failed' },
      ],
    },
    {
      name: 'pay_creat_at',
      type: 'date',
      label: '支付订单创建时间',
      admin: {
        date: {
          pickerAppearance: 'dayAndTime',
        },
        description: '支付订单创建的时间',
        readOnly: true,
      },
    },
    {
      name: 'paid_at',
      type: 'date',
      label: '支付时间',
      admin: {
        date: {
          pickerAppearance: 'dayAndTime',
        },
      },
    },
    {
      name: 'channel',
      type: 'select',
      label: '支付渠道',
      options: [
        { label: '微信支付', value: 'wechat' },
        { label: '支付宝', value: 'alipay' },
        { label: '银行转账', value: 'bank' },
        { label: '其他', value: 'other' },
      ],
    },
    {
      name: 'notes',
      type: 'textarea',
      label: '备注',
      admin: {
        description: '支付备注、退款原因等',
      },
    },
  ],
  hooks: {
    beforeChange: [
      async ({ data, operation }) => {
        // 创建支付记录时生成交易流水号和创建时间
        if (operation === 'create') {
          if (!data.transaction_no) {
            const typePrefix: Record<string, string> = {
              rent: 'RENT',
              rent_canceled: 'CANC',
              overdue: 'OVER',
              addr_up: 'ADDU',
              addr_down: 'ADDD',
            }
            const prefix = typePrefix[data.type || 'rent'] || 'RENT'

            data.transaction_no = `${prefix}-${Date.now()}-${Math.random().toString(36).substr(2, 9).toUpperCase()}`
          }
          data.pay_creat_at = new Date().toISOString()
        }

        return data
      },
    ],
  },
}
