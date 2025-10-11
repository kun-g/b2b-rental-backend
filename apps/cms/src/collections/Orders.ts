import type { CollectionConfig } from 'payload'
import { calculateShippingFee } from '../utils/calculateShipping'

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
    read: ({ req: { user } }): any => {
      if (user?.role === 'platform_admin' || user?.role === 'platform_operator') {
        return true
      }
      if (user?.role === 'merchant_admin' || user?.role === 'merchant_member') {
        const merchantId = typeof user.merchant === 'object' ? user.merchant?.id : user.merchant
        if (!merchantId) return false
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
    update: ({ req: { user } }): any => {
      // 用户、商户、平台都可以更新订单（不同状态不同权限）
      if (user?.role === 'platform_admin' || user?.role === 'platform_operator') {
        return true
      }
      if (user?.role === 'merchant_admin' || user?.role === 'merchant_member') {
        const merchantId = typeof user.merchant === 'object' ? user.merchant?.id : user.merchant
        if (!merchantId) return false
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
      label: '商户',
      admin: {
        description: '自动从 SKU 中获取',
        readOnly: true,
      },
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
      label: '日租金快照（元）',
      admin: {
        description: '下单时SKU的日租金(自动从SKU获取)',
        readOnly: true,
      },
    },
    {
      name: 'device_value_snapshot',
      type: 'number',
      label: '设备价值快照（元）',
      admin: {
        description: '用于授信冻结(自动从SKU获取)',
        readOnly: true,
      },
    },
    {
      name: 'shipping_fee',
      type: 'number',
      label: '运费（元）',
      admin: {
        description: '下单时计算的运费(自动计算)',
        readOnly: true,
      },
    },
    {
      name: 'shipping_template_id',
      type: 'relationship',
      relationTo: 'shipping-templates',
      label: '运费模板',
      admin: {
        description: '订单使用的运费模板（自动从 SKU 获取）',
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
        description: '租金 + 运费 + 逾期',
        readOnly: true,
      },
    },
    {
      name: 'notes',
      type: 'textarea',
      label: '备注',
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

          // 从 SKU 中获取商户、价格快照等信息
          if (data.merchant_sku) {
            const skuId = typeof data.merchant_sku === 'object' ? data.merchant_sku.id : data.merchant_sku

            // 查询 SKU 详细信息
            const sku = await req.payload.findByID({
              collection: 'merchant-skus',
              id: skuId,
              depth: 1,
            })

            if (sku) {
              // 自动填充商户
              data.merchant = typeof sku.merchant === 'object' ? sku.merchant.id : sku.merchant

              // 自动填充价格快照
              data.daily_fee_snapshot = sku.daily_fee
              data.device_value_snapshot = sku.device_value

              // 获取运费模板（优先使用 SKU 的，如果没有则需要从商户获取默认的）
              let shippingTemplateId = sku.shipping_template
                ? typeof sku.shipping_template === 'object'
                  ? sku.shipping_template.id
                  : sku.shipping_template
                : null

              // 如果 SKU 没有运费模板，从商户获取默认模板
              if (!shippingTemplateId) {
                const merchantTemplates = await req.payload.find({
                  collection: 'shipping-templates',
                  where: {
                    and: [
                      {
                        merchant: {
                          equals: data.merchant,
                        },
                      },
                      {
                        is_default: {
                          equals: true,
                        },
                      },
                      {
                        status: {
                          equals: 'active',
                        },
                      },
                    ],
                  },
                  limit: 1,
                })

                if (merchantTemplates.docs.length > 0) {
                  shippingTemplateId = merchantTemplates.docs[0].id
                }
              }

              // 保存运费模板 ID
              data.shipping_template_id = shippingTemplateId

              // 计算运费
              if (shippingTemplateId && data.shipping_address) {
                // 查询运费模板详情
                const shippingTemplate = await req.payload.findByID({
                  collection: 'shipping-templates',
                  id: shippingTemplateId,
                })

                if (shippingTemplate) {
                  const shippingResult = calculateShippingFee(shippingTemplate as any, data.shipping_address)

                  // 检查是否为黑名单地区
                  if (shippingResult.isBlacklisted) {
                    throw new Error(
                      `该地址不在配送范围内: ${shippingResult.blacklistReason || '该地区不发货'}`,
                    )
                  }

                  // 设置运费
                  data.shipping_fee = shippingResult.fee
                }
              } else if (!shippingTemplateId) {
                throw new Error('无法找到可用的运费模板，请联系商户')
              }
            }
          }

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
