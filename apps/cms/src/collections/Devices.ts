import type { CollectionConfig } from 'payload'

/**
 * Devices Collection - 设备管理（实体设备，绑定到SKU）
 * 对应 PRD 7 数据模型 device
 */
export const Devices: CollectionConfig = {
  slug: 'devices',
  admin: {
    useAsTitle: 'sn',
    defaultColumns: ['sn', 'merchant_sku', 'status', 'current_order', 'updatedAt'],
    group: '商户管理',
  },
  access: {
    read: ({ req: { user } }) => {
      if (user?.role === 'platform_admin' || user?.role === 'platform_operator') {
        return true
      }
      if (user?.role === 'merchant_admin' || user?.role === 'merchant_member') {
        // TODO: 需要通过merchant_sku关联查询
        return true
      }
      return false
    },
    create: ({ req: { user } }) => {
      return user?.role === 'merchant_admin' || user?.role === 'merchant_member'
    },
    update: ({ req: { user } }) => {
      if (user?.role === 'platform_admin') {
        return true
      }
      if (user?.role === 'merchant_admin' || user?.role === 'merchant_member') {
        // TODO: 需要通过merchant_sku关联查询
        return true
      }
      return false
    },
    delete: ({ req: { user } }) => {
      if (user?.role === 'platform_admin') {
        return true
      }
      if (user?.role === 'merchant_admin') {
        // TODO: 需要通过merchant_sku关联查询
        return true
      }
      return false
    },
  },
  fields: [
    {
      name: 'merchant_sku',
      type: 'relationship',
      relationTo: 'merchant-skus',
      required: true,
      label: '所属SKU',
      admin: {
        description: '该设备属于哪个商户SKU',
      },
    },
    {
      name: 'sn',
      type: 'text',
      required: true,
      unique: true,
      label: '设备序列号（SN）',
      admin: {
        description: '唯一标识，用于追踪和绑定订单',
      },
    },
    {
      name: 'status',
      type: 'select',
      required: true,
      defaultValue: 'in_stock',
      label: '设备状态',
      options: [
        { label: '在库', value: 'in_stock' },
        { label: '租赁中', value: 'in_rent' },
        { label: '运输中', value: 'in_transit' },
        { label: '维修中', value: 'in_maintenance' },
        { label: '已报废', value: 'scrapped' },
      ],
    },
    {
      name: 'current_order',
      type: 'relationship',
      relationTo: 'orders',
      label: '当前订单',
      admin: {
        description: '如果设备正在租赁中，关联到当前订单',
        condition: (data) => data.status === 'in_rent' || data.status === 'in_transit',
      },
    },
    {
      name: 'purchase_date',
      type: 'date',
      label: '采购日期',
      admin: {
        date: {
          pickerAppearance: 'dayOnly',
        },
      },
    },
    {
      name: 'purchase_price',
      type: 'number',
      label: '采购价格（元）',
      min: 0,
    },
    {
      name: 'condition',
      type: 'select',
      label: '设备成色',
      defaultValue: 'new',
      options: [
        { label: '全新', value: 'new' },
        { label: '99新', value: 'like_new' },
        { label: '95新', value: 'excellent' },
        { label: '9成新', value: 'good' },
        { label: '8成新', value: 'fair' },
      ],
    },
    {
      name: 'notes',
      type: 'textarea',
      label: '备注',
      admin: {
        description: '设备特殊说明、维修记录等',
      },
    },
    {
      name: 'qr_code',
      type: 'upload',
      relationTo: 'media',
      label: '设备二维码',
      admin: {
        description: '可生成设备专属二维码，用于扫码管理',
      },
    },
    {
      name: 'last_maintenance_date',
      type: 'date',
      label: '上次维护日期',
      admin: {
        date: {
          pickerAppearance: 'dayOnly',
        },
      },
    },
    {
      name: 'rental_count',
      type: 'number',
      label: '租赁次数',
      defaultValue: 0,
      min: 0,
      admin: {
        description: '该设备累计被租赁的次数',
        readOnly: true,
      },
    },
  ],
  hooks: {
    beforeChange: [
      async ({ data, operation, originalDoc }) => {
        // 当设备状态从in_rent变为in_stock时，清空current_order
        if (operation === 'update' && originalDoc.status === 'in_rent' && data.status === 'in_stock') {
          data.current_order = null
        }
        return data
      },
    ],
  },
}
