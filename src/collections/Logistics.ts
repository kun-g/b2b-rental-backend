import type { CollectionConfig } from 'payload'

/**
 * Logistics Collection - 物流信息
 * 对应 PRD 7 数据模型 logistics
 */
export const Logistics: CollectionConfig = {
  slug: 'logistics',
  admin: {
    useAsTitle: 'ship_no',
    defaultColumns: ['ship_no', 'carrier', 'ship_at', 'sign_at'],
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
      name: 'ship_no',
      type: 'text',
      label: '发货物流单号',
    },
    {
      name: 'carrier',
      type: 'text',
      label: '承运商',
      admin: {
        description: '如：顺丰、德邦',
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
      name: 'return_ship_no',
      type: 'text',
      label: '回寄物流单号',
    },
    {
      name: 'return_carrier',
      type: 'text',
      label: '回寄承运商',
    },
    {
      name: 'return_ship_at',
      type: 'date',
      label: '回寄发货时间',
      admin: {
        date: {
          pickerAppearance: 'dayAndTime',
        },
      },
    },
    {
      name: 'return_sign_at',
      type: 'date',
      label: '回寄签收时间',
      admin: {
        date: {
          pickerAppearance: 'dayAndTime',
        },
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
}
