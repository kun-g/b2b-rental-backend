import type { CollectionConfig } from 'payload'

/**
 * Orders Collection - 订单管理（核心业务流）
 * 对应 PRD 5. 订单流程与状态机 v0.3 和 7 数据模型 order
 * 单订单=单商户×单SKU×1台；不支持多SKU/多商户
 */
export const Orders: CollectionConfig = {
  slug: 'orders',
  admin: {
    useAsTitle: 'order_no',
    defaultColumns: ['order_no', 'user', 'merchant', 'merchant_sku', 'status', 'createdAt'],
    group: '订单管理',
  },
  access: {
    read: ({ req: { user } }) => {
      if (user?.role === 'platform_admin' || user?.role === 'platform_operator') {
        return true
      }
      if (user?.role === 'merchant_admin' || user?.role === 'merchant_member') {
        const merchantId = typeof user.merchant === 'object' ? user.merchant?.id : user.merchant
        return {
          merchant: {
            equals: merchantId,
          },
        }
      }
      if (user?.role === 'customer') {
        return {
          user: {
            equals: user.id,
          },
        }
      }
      return false
    },
    create: ({ req: { user } }) => {
      // 只有用户可以创建订单
      return user?.role === 'customer'
    },
    update: ({ req: { user } }) => {
      // 用户、商户、平台都可以更新订单（不同状态不同权限）
      if (user?.role === 'platform_admin' || user?.role === 'platform_operator') {
        return true
      }
      if (user?.role === 'merchant_admin' || user?.role === 'merchant_member') {
        const merchantId = typeof user.merchant === 'object' ? user.merchant?.id : user.merchant
        return {
          merchant: {
            equals: merchantId,
          },
        }
      }
      if (user?.role === 'customer') {
        return {
          user: {
            equals: user.id,
          },
        }
      }
      return false
    },
    delete: ({ req: { user } }) => {
      // 只有平台管理员可以删除订单
      return user?.role === 'platform_admin'
    },
  },
  fields: [
    {
      name: 'order_no',
      type: 'text',
      required: true,
      unique: true,
      label: '订单编号',
      admin: {
        description: '自动生成的唯一订单号',
        readOnly: true,
      },
    },
    {
      name: 'user',
      type: 'relationship',
      relationTo: 'users',
      required: true,
      label: '下单用户',
    },
    {
      name: 'merchant',
      type: 'relationship',
      relationTo: 'merchants',
      required: true,
      label: '商户',
    },
    {
      name: 'merchant_sku',
      type: 'relationship',
      relationTo: 'merchant-skus',
      required: true,
      label: '租赁SKU',
    },
    {
      name: 'device',
      type: 'relationship',
      relationTo: 'devices',
      label: '绑定设备',
      admin: {
        description: '发货时绑定设备SN',
      },
    },
    {
      name: 'status',
      type: 'select',
      required: true,
      defaultValue: 'NEW',
      label: '订单状态',
      options: [
        { label: 'NEW - 新订单', value: 'NEW' },
        { label: 'PAID - 已支付', value: 'PAID' },
        { label: 'TO_SHIP - 待发货', value: 'TO_SHIP' },
        { label: 'SHIPPED - 已发货', value: 'SHIPPED' },
        { label: 'IN_RENT - 租赁中', value: 'IN_RENT' },
        { label: 'RETURNING - 归还中', value: 'RETURNING' },
        { label: 'RETURNED - 已归还', value: 'RETURNED' },
        { label: 'COMPLETED - 已完成', value: 'COMPLETED' },
        { label: 'CANCELED - 已取消', value: 'CANCELED' },
      ],
      admin: {
        description: '对应PRD状态机流转',
      },
    },
    {
      name: 'rent_start_date',
      type: 'date',
      required: true,
      label: '租期开始日期',
      admin: {
        date: {
          pickerAppearance: 'dayOnly',
        },
      },
    },
    {
      name: 'rent_end_date',
      type: 'date',
      required: true,
      label: '租期结束日期',
      admin: {
        date: {
          pickerAppearance: 'dayOnly',
        },
      },
    },
    {
      name: 'rent_days',
      type: 'number',
      label: '租期天数',
      admin: {
        description: '自动计算：rent_end_date - rent_start_date',
        readOnly: true,
      },
    },
    {
      name: 'actual_start_date',
      type: 'date',
      label: '实际计费起点',
      admin: {
        date: {
          pickerAppearance: 'dayAndTime',
        },
        description: '发货当日次日00:00（默认UTC+8）',
        readOnly: true,
      },
    },
    {
      name: 'timezone',
      type: 'text',
      defaultValue: 'Asia/Shanghai',
      label: '时区',
      admin: {
        description: '默认北京时间（UTC+8）',
      },
    },
    {
      name: 'daily_fee_snapshot',
      type: 'number',
      required: true,
      label: '日租金快照（元）',
      admin: {
        description: '下单时SKU的日租金',
        readOnly: true,
      },
    },
    {
      name: 'device_value_snapshot',
      type: 'number',
      required: true,
      label: '设备价值快照（元）',
      admin: {
        description: '用于授信冻结',
        readOnly: true,
      },
    },
    {
      name: 'shipping_fee_snapshot',
      type: 'number',
      required: true,
      label: '运费快照（元）',
      admin: {
        description: '下单时计算的运费',
        readOnly: true,
      },
    },
    {
      name: 'shipping_template_id',
      type: 'relationship',
      relationTo: 'shipping-templates',
      label: '运费模板',
      admin: {
        description: '订单使用的运费模板',
      },
    },
    {
      name: 'shipping_template_version',
      type: 'number',
      label: '运费模板版本',
      admin: {
        description: '用于追溯',
        readOnly: true,
      },
    },
    {
      name: 'credit_hold_amount',
      type: 'number',
      label: '授信冻结金额（元）',
      admin: {
        description: '按设备价值冻结，完成时释放',
        readOnly: true,
      },
    },
    {
      name: 'shipping_address',
      type: 'group',
      label: '收货地址',
      fields: [
        {
          name: 'contact_name',
          type: 'text',
          required: true,
          label: '收货人',
        },
        {
          name: 'contact_phone',
          type: 'text',
          required: true,
          label: '联系电话',
        },
        {
          name: 'province',
          type: 'text',
          required: true,
          label: '省',
        },
        {
          name: 'city',
          type: 'text',
          required: true,
          label: '市',
        },
        {
          name: 'district',
          type: 'text',
          required: true,
          label: '区',
        },
        {
          name: 'address',
          type: 'text',
          required: true,
          label: '详细地址',
        },
        {
          name: 'region_code',
          type: 'text',
          label: '地区编码',
        },
      ],
    },
    {
      name: 'address_change_count',
      type: 'number',
      defaultValue: 0,
      label: '改址次数',
      admin: {
        description: '待发货期改址次数，≤2次',
        readOnly: true,
      },
    },
    {
      name: 'address_change_history',
      type: 'array',
      label: '改址历史',
      admin: {
        readOnly: true,
      },
      fields: [
        {
          name: 'changed_at',
          type: 'date',
          label: '改址时间',
        },
        {
          name: 'old_address',
          type: 'textarea',
          label: '原地址',
        },
        {
          name: 'new_address',
          type: 'textarea',
          label: '新地址',
        },
        {
          name: 'fee_diff',
          type: 'number',
          label: '运费差额（元）',
        },
      ],
    },
    {
      name: 'logistics',
      type: 'relationship',
      relationTo: 'logistics',
      label: '物流信息',
    },
    {
      name: 'payments',
      type: 'relationship',
      relationTo: 'payments',
      hasMany: true,
      label: '支付记录',
    },
    {
      name: 'surcharges',
      type: 'relationship',
      relationTo: 'surcharges',
      hasMany: true,
      label: '附加费用',
    },
    {
      name: 'statement',
      type: 'relationship',
      relationTo: 'statements',
      label: '对账单',
    },
    {
      name: 'is_overdue',
      type: 'checkbox',
      defaultValue: false,
      label: '是否逾期',
      admin: {
        readOnly: true,
      },
    },
    {
      name: 'overdue_days',
      type: 'number',
      defaultValue: 0,
      label: '逾期天数',
      admin: {
        readOnly: true,
      },
    },
    {
      name: 'overdue_amount',
      type: 'number',
      defaultValue: 0,
      label: '逾期金额（元）',
      admin: {
        description: 'ceil(逾期小时/24) × 日费率',
        readOnly: true,
      },
    },
    {
      name: 'total_amount',
      type: 'number',
      label: '订单总额（元）',
      admin: {
        description: '租金 + 运费 + 逾期 + 改址差额',
        readOnly: true,
      },
    },
    {
      name: 'notes',
      type: 'textarea',
      label: '备注',
    },
    {
      name: 'blacklist_exemption',
      type: 'group',
      label: '不发地区豁免',
      admin: {
        description: '平台豁免不发地区的记录',
      },
      fields: [
        {
          name: 'is_exempted',
          type: 'checkbox',
          label: '是否豁免',
        },
        {
          name: 'exempted_at',
          type: 'date',
          label: '豁免时间',
        },
        {
          name: 'exempted_by',
          type: 'relationship',
          relationTo: 'users',
          label: '豁免人',
        },
        {
          name: 'reason',
          type: 'textarea',
          label: '豁免原因',
        },
      ],
    },
    {
      name: 'status_history',
      type: 'array',
      label: '状态流转历史',
      admin: {
        readOnly: true,
      },
      fields: [
        {
          name: 'status',
          type: 'text',
          required: true,
          label: '状态',
        },
        {
          name: 'changed_at',
          type: 'date',
          required: true,
          label: '变更时间',
        },
        {
          name: 'operator',
          type: 'relationship',
          relationTo: 'users',
          label: '操作人',
        },
        {
          name: 'notes',
          type: 'text',
          label: '备注',
        },
      ],
    },
  ],
  hooks: {
    beforeChange: [
      async ({ data, req, operation, originalDoc }) => {
        // 创建订单时生成订单号
        if (operation === 'create') {
          data.order_no = `ORD-${Date.now()}-${Math.random().toString(36).substr(2, 9).toUpperCase()}`

          // 计算租期天数
          const startDate = new Date(data.rent_start_date)
          const endDate = new Date(data.rent_end_date)
          data.rent_days = Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24))

          // 冻结授信金额
          data.credit_hold_amount = data.device_value_snapshot
        }

        // 记录状态流转
        if (operation === 'update' && originalDoc.status !== data.status) {
          if (!data.status_history) {
            data.status_history = originalDoc.status_history || []
          }
          data.status_history.push({
            status: data.status,
            changed_at: new Date().toISOString(),
            operator: req.user?.id,
            notes: data.notes,
          })

          // PAID自动流转TO_SHIP
          if (data.status === 'PAID') {
            data.status = 'TO_SHIP'
            data.status_history.push({
              status: 'TO_SHIP',
              changed_at: new Date().toISOString(),
              operator: 'system',
              notes: '支付成功自动进入待发货',
            })
          }

          // SHIPPED时设置计费起点
          if (data.status === 'SHIPPED' && !data.actual_start_date) {
            const now = new Date()
            const nextDay = new Date(now.getTime() + 24 * 60 * 60 * 1000)
            nextDay.setHours(0, 0, 0, 0)
            data.actual_start_date = nextDay.toISOString()
          }
        }

        return data
      },
    ],
    afterChange: [
      async ({ doc, req, operation, previousDoc }) => {
        // 订单完成时释放授信
        if (operation === 'update' && previousDoc.status !== 'COMPLETED' && doc.status === 'COMPLETED') {
          // TODO: 调用授信释放逻辑
        }

        // 订单取消时释放授信
        if (operation === 'update' && previousDoc.status !== 'CANCELED' && doc.status === 'CANCELED') {
          // TODO: 调用授信释放逻辑
        }
      },
    ],
  },
}
