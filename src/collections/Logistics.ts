import type { CollectionConfig } from 'payload'

/**
 * Logistics Collection - 物流信息
 * 对应 PRD 7 数据模型 logistics
 */
export const Logistics: CollectionConfig = {
  slug: 'logistics',
  admin: {
    useAsTitle: 'logistics_id',
    defaultColumns: ['logistics_id', 'order_no', 'logistics_type', 'carrier', 'ship_at'],
    group: '订单管理',
  },
  fields: [
    {
      name: 'logistics_id',
      type: 'text',
      required: true,
      unique: true,
      label: '租赁平台的物流ID',
      admin: {
        description: '系统生成的物流记录唯一标识',
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
      name: 'carrier',
      type: 'text',
      label: '物流承运商',
      admin: {
        description: '如：顺丰、德邦',
      },
    },
    {
      name: 'logistics_no',
      type: 'text',
      label: '物流单号',
      admin: {
        description: '承运商提供的物流单号',
      },
    },
    {
      name: 'ship_at',
      type: 'date',
      label: '发货时间',
      admin: {
        date: {
          pickerAppearance: 'dayAndTime',
        },
      },
    },
    {
      name: 'logistics_type',
      type: 'select',
      required: true,
      label: '物流类型',
      options: [
        { label: '发货', value: 'shipping' },
        { label: '归还', value: 'return' },
      ],
      admin: {
        description: '区分是发货还是归还',
      },
    },
    {
      name: 'sign_at',
      type: 'date',
      label: '签收时间',
      admin: {
        date: {
          pickerAppearance: 'dayAndTime',
        },
        description: '物流API回传或商户确认',
      },
    },
    {
      name: 'tracking_events',
      type: 'array',
      label: '物流轨迹',
      fields: [
        {
          name: 'time',
          type: 'date',
          required: true,
          label: '时间',
        },
        {
          name: 'desc',
          type: 'text',
          required: true,
          label: '描述',
        },
        {
          name: 'location',
          type: 'text',
          label: '地点',
        },
      ],
    },
  ],
  hooks: {
    beforeChange: [
      async ({ data, operation }) => {
        // 创建物流记录时自动生成 logistics_id
        if (operation === 'create' && !data.logistics_id) {
          const typePrefix = data.logistics_type === 'return' ? 'LOGR' : 'LOG'
          const timestamp = Date.now()
          const random = Math.random().toString(36).substr(2, 6).toUpperCase()
          data.logistics_id = `${typePrefix}-${timestamp}-${random}`
        }
        return data
      },
    ],
  },
}
