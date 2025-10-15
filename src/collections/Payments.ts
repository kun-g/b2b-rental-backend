import type { AccessArgs, CollectionConfig } from 'payload'

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
    create: ({ req: { user } }) => {
      // 只有平台和商户可以创建支付记录
      return ['platform_admin', 'platform_operator', 'merchant_admin', 'merchant_member'].includes(
        user?.role || '',
      )
    },
    update: (({ req: { user } }: AccessArgs<any>) => {
      // 只有平台可以修改支付记录
      if (user?.role === 'platform_admin' || user?.role === 'platform_operator') {
        return true
      }
      return false
    }) as any,
    delete: ({ req: { user } }) => {
      // 只有平台管理员可以删除支付记录
      return user?.role === 'platform_admin'
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
            const typePrefix = {
              rent: 'RENT',
              rent_canceled: 'CANC',
              overdue: 'OVER',
              addr_up: 'ADDU',
              addr_down: 'ADDD',
            }[data.type || 'rent']

            data.transaction_no = `${typePrefix}-${Date.now()}-${Math.random().toString(36).substr(2, 9).toUpperCase()}`
          }
          data.pay_creat_at = new Date().toISOString()
        }

        return data
      },
    ],
  },
}
