import type { CollectionConfig } from 'payload'

/**
 * Payments Collection - 支付记录
 * 对应 PRD 7 数据模型 payment
 */
export const Payments: CollectionConfig = {
  slug: 'payments',
  admin: {
    useAsTitle: 'transaction_no',
    defaultColumns: ['transaction_no', 'order', 'amount_total', 'status', 'paid_at'],
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
      name: 'transaction_no',
      type: 'text',
      required: true,
      unique: true,
      label: '交易流水号',
      admin: {
        description: '支付渠道返回的交易号',
      },
    },
    {
      name: 'amount_rent',
      type: 'number',
      required: true,
      min: 0,
      label: '租金（元）',
    },
    {
      name: 'amount_shipping',
      type: 'number',
      required: true,
      min: 0,
      label: '运费（元）',
    },
    {
      name: 'amount_total',
      type: 'number',
      required: true,
      min: 0,
      label: '总金额（元）',
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
      name: 'refund_amount',
      type: 'number',
      label: '退款金额（元）',
      min: 0,
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
      name: 'refund_reason',
      type: 'textarea',
      label: '退款原因',
    },
  ],
}
