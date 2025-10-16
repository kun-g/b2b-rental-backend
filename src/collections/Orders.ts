import type { AccessArgs, CollectionConfig } from 'payload'
import { calculateShippingFee } from '../utils/calculateShipping'
import { getUserFromAccount, accountHasRole, getAccountMerchantId } from '../utils/accountUtils'

/**
 * Orders Collection - 订单管理（核心业务流）
 * 对应 PRD 5. 订单流程与状态机 v0.3 和 7 数据模型 order
 * 单订单=单商户×单SKU×1台；不支持多SKU/多商户
 */
export const Orders: CollectionConfig = {
  slug: 'orders',
  admin: {
    useAsTitle: 'order_no',
    defaultColumns: ['order_no', 'customer', 'merchant', 'merchant_sku', 'status', 'createdAt'],
    group: '订单管理',
  },
  access: {
    read: (async ({ req: { user, payload } }: AccessArgs<any>) => {
      if (!user) return false

      // 平台角色可以查看所有订单
      if (await accountHasRole(payload, user.id, ['platform_admin', 'platform_operator'])) {
        return true
      }

      // 商户角色只能查看自己商户的订单
      const merchantId = await getAccountMerchantId(payload, user.id, [])
      if (merchantId) {
        return {
          merchant: {
            equals: merchantId,
          },
        }
      }

      // 用户角色只能查看自己的订单
      const customerUser = await getUserFromAccount(payload, user.id, ['customer'])
      if (customerUser) {
        return {
          customer: {
            equals: customerUser.id,
          },
        }
      }

      return false
    }) as any,
    create: (async ({ req: { user, payload } }) => {
      if (!user) return false

      // 只有 customer 角色可以创建订单
      return await accountHasRole(payload, user.id, ['customer'])
    }) as any,
    update: (async ({ req: { user, payload } }: AccessArgs<any>) => {
      if (!user) return false

      // 平台角色可以更新所有订单
      if (await accountHasRole(payload, user.id, ['platform_admin', 'platform_operator'])) {
        return true
      }

      // 商户角色只能更新自己商户的订单
      const merchantId = await getAccountMerchantId(payload, user.id, [])
      if (merchantId) {
        return {
          merchant: {
            equals: merchantId,
          },
        }
      }

      // 用户角色只能更新自己的订单
      const customerUser = await getUserFromAccount(payload, user.id, ['customer'])
      if (customerUser) {
        return {
          customer: {
            equals: customerUser.id,
          },
        }
      }

      return false
    }) as any,
    delete: (async ({ req: { user, payload } }) => {
      if (!user) return false

      // 只有平台管理员可以删除订单
      return await accountHasRole(payload, user.id, ['platform_admin'])
    }) as any,
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
      name: 'transaction_no',
      type: 'text',
      label: '交易流水号',
      admin: {
        description: '关联的交易流水号',
      },
    },
    {
      name: 'out_pay_no',
      type: 'text',
      label: '外部支付单号',
      admin: {
        description: '第三方支付平台返回的支付单号',
      },
    },
    {
      name: 'customer',
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
      name: 'shipping_date',
      type: 'date',
      label: '发货时间',
      admin: {
        date: {
          pickerAppearance: 'dayAndTime',
        },
        description: '商户实际发货的时间',
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
      name: 'order_creat_at',
      type: 'date',
      label: '租赁订单创建时间',
      admin: {
        date: {
          pickerAppearance: 'dayAndTime',
        },
        description: '订单创建的时间',
        readOnly: true,
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
      name: 'shipping_fee_snapshot',
      type: 'number',
      label: '运费快照（元）',
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
      name: 'return_address',
      type: 'group',
      label: '归还地址',
      admin: {
        description: '用户归还设备的地址（自动从商户归还信息中获取）',
      },
      fields: [
        {
          name: 'contact_name',
          type: 'text',
          label: '归还联系人',
        },
        {
          name: 'contact_phone',
          type: 'text',
          label: '联系电话',
        },
        {
          name: 'province',
          type: 'text',
          label: '省',
        },
        {
          name: 'city',
          type: 'text',
          label: '市',
        },
        {
          name: 'district',
          type: 'text',
          label: '区',
        },
        {
          name: 'address',
          type: 'text',
          label: '详细地址',
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
      admin: {
        description: '包含租赁支付、逾期补收、改址差额等所有支付',
      },
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
      name: 'order_total_amount',
      type: 'number',
      label: '订单总额（元）',
      admin: {
        description: '租金 + 运费 + 逾期',
        readOnly: true,
      },
    },
    {
      name: 'shipping_no',
      type: 'text',
      label: '发货快递单号',
      admin: {
        description: '发货时的物流单号',
      },
    },
    {
      name: 'return_no',
      type: 'text',
      label: '归还物流单号',
      admin: {
        description: '用户归还设备时的物流单号',
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
          data.order_creat_at = new Date().toISOString()

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

                  // 设置运费快照
                  data.shipping_fee_snapshot = shippingResult.fee
                }
              } else if (!shippingTemplateId) {
                throw new Error('无法找到可用的运费模板，请联系商户')
              }
            }
          }

          // 自动填充归还地址（从商户的默认归还信息中获取）
          if (!data.return_address && data.merchant) {
            const merchantId = typeof data.merchant === 'object' ? data.merchant.id : data.merchant

            const returnInfo = await req.payload.find({
              collection: 'return-info',
              where: {
                and: [
                  {
                    merchant: {
                      equals: merchantId,
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

            if (returnInfo.docs.length > 0) {
              const defaultReturnInfo = returnInfo.docs[0]
              data.return_address = {
                contact_name: defaultReturnInfo.return_contact_name,
                contact_phone: defaultReturnInfo.return_contact_phone,
                province: defaultReturnInfo.return_address.province,
                city: defaultReturnInfo.return_address.city,
                district: defaultReturnInfo.return_address.district || '',
                address: defaultReturnInfo.return_address.address,
              }
            } else {
              throw new Error('商户未设置归还地址，请联系商户')
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
      async ({ doc, req: _req, operation, previousDoc }) => {
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
