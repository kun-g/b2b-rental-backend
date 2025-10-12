import type { CollectionConfig } from 'payload'

/**
 * Surcharges Collection - 附加费用（逾期、改址差额）
 * 对应 PRD 7 数据模型 surcharge
 */
export const Surcharges: CollectionConfig = {
  slug: 'surcharges',
  admin: {
    useAsTitle: 'id',
    defaultColumns: ['order', 'type', 'amount', 'status', 'createdAt'],
    group: '订单管理',
  },
  fields: [
    {
      name: 'order',
      type: 'relationship',
      relationTo: 'orders',
      required: true,
      label: '关联订单',
    },
    {
      name: 'type',
      type: 'select',
      required: true,
      label: '费用类型',
      options: [
        { label: '逾期费', value: 'overdue' },
        { label: '改址补差', value: 'addr_up' },
        { label: '改址退款', value: 'addr_down' },
      ],
    },
    {
      name: 'amount',
      type: 'number',
      required: true,
      label: '金额（元）',
      admin: {
        description: '正数为补收，负数为退款',
      },
    },
    {
      name: 'status',
      type: 'select',
      required: true,
      defaultValue: 'pending',
      label: '状态',
      options: [
        { label: '待支付', value: 'pending' },
        { label: '已支付', value: 'paid' },
        { label: '已退款', value: 'refunded' },
      ],
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
      name: 'refund_at',
      type: 'date',
      label: '退款时间',
      admin: {
        date: {
          pickerAppearance: 'dayAndTime',
        },
      },
    },
    {
      name: 'description',
      type: 'textarea',
      label: '说明',
      admin: {
        description: '如：逾期3天、改址到偏远地区补差20元',
      },
    },
  ],
}
