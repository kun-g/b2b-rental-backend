import type { CollectionConfig } from 'payload'

/**
 * Statements Collection - 对账单
 * 对应 PRD 7 数据模型 statement
 */
export const Statements: CollectionConfig = {
  slug: 'statements',
  admin: {
    useAsTitle: 'statement_no',
    defaultColumns: ['statement_no', 'order', 'amount_total', 'issued_at'],
    group: '对账管理',
  },
  fields: [
    {
      name: 'statement_no',
      type: 'text',
      required: true,
      unique: true,
      label: '对账单号',
      admin: {
        description: '自动生成',
        readOnly: true,
      },
    },
    {
      name: 'order',
      type: 'relationship',
      relationTo: 'orders',
      required: true,
      label: '关联订单',
    },
    {
      name: 'issued_at',
      type: 'date',
      required: true,
      label: '出单时间',
      admin: {
        date: {
          pickerAppearance: 'dayAndTime',
        },
        readOnly: true,
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
      name: 'amount_overdue',
      type: 'number',
      defaultValue: 0,
      min: 0,
      label: '逾期费（元）',
    },
    {
      name: 'amount_surcharge',
      type: 'number',
      defaultValue: 0,
      label: '其他费用（元）',
      admin: {
        description: '改址差额等',
      },
    },
    {
      name: 'amount_total',
      type: 'number',
      required: true,
      min: 0,
      label: '总金额（元）',
      admin: {
        description: '租金+运费+逾期+其他',
        readOnly: true,
      },
    },
    {
      name: 'details_json',
      type: 'json',
      label: '明细（JSON）',
      admin: {
        description: '包含设备SN、关键时间戳等',
      },
    },
    {
      name: 'status',
      type: 'select',
      defaultValue: 'issued',
      label: '状态',
      options: [
        { label: '已出单', value: 'issued' },
        { label: '已确认', value: 'confirmed' },
        { label: '有争议', value: 'disputed' },
      ],
    },
  ],
  hooks: {
    beforeChange: [
      async ({ data, operation }) => {
        if (operation === 'create') {
          data.statement_no = `STMT-${Date.now()}-${Math.random().toString(36).substr(2, 9).toUpperCase()}`
          data.issued_at = new Date().toISOString()

          // 计算总金额
          data.amount_total =
            (data.amount_rent || 0) +
            (data.amount_shipping || 0) +
            (data.amount_overdue || 0) +
            (data.amount_surcharge || 0)
        }
        return data
      },
    ],
  },
}
