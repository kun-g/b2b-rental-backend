import type { CollectionConfig, Where } from 'payload'
import { APIError } from 'payload'
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
  endpoints: [
    {
      path: '/stats',
      method: 'get',
      handler: async (req) => {
        try {
          const { user, payload, query } = req

          if (!user) {
            return Response.json({ error: '未授权' }, { status: 401 })
          }

          // 构建基础查询条件（权限过滤）
          const baseWhere: any = { and: [] }

          // 权限过滤
          const hasRole = await accountHasRole(payload, user.id, ['platform_admin', 'platform_operator'])
          if (!hasRole) {
            const merchantId = await getAccountMerchantId(payload, user.id, [])
            if (merchantId) {
              baseWhere.and.push({ merchant: { equals: merchantId } })
            } else {
              const customerUser = await getUserFromAccount(payload, user.id, ['customer'])
              if (customerUser) {
                baseWhere.and.push({ customer: { equals: customerUser.id } })
              } else {
                return Response.json({ error: '无权限' }, { status: 403 })
              }
            }
          }

          // 添加筛选条件（订单号、时间范围等）
          if (query.order_no) {
            baseWhere.and.push({ order_no: { contains: query.order_no } })
          }
          if (query.createdAt_gte) {
            baseWhere.and.push({ createdAt: { greater_than_equal: query.createdAt_gte } })
          }
          if (query.createdAt_lte) {
            baseWhere.and.push({ createdAt: { less_than_equal: query.createdAt_lte } })
          }
          if (query.merchantId) {
            baseWhere.and.push({ merchant: { equals: query.merchantId } })
          }
          if (query.userId) {
            baseWhere.and.push({ customer: { equals: query.userId } })
          }

          // 定义所有状态
          const statuses = ['NEW', 'PAID', 'TO_SHIP', 'SHIPPED', 'IN_RENT', 'RETURNING', 'RETURNED', 'COMPLETED', 'CANCELED']

          // 并行查询所有状态的数量
          const statsPromises = statuses.map(async (status) => {
            const where = {
              and: [
                ...baseWhere.and,
                { status: { equals: status } }
              ]
            }
            const result = await payload.find({
              collection: 'orders',
              where: baseWhere.and.length > 0 ? where : { status: { equals: status } },
              limit: 0, // 只获取数量，不获取数据
              depth: 0,
            })
            return { status, count: result.totalDocs }
          })

          // 查询总数（所有状态）
          const totalResult = await payload.find({
            collection: 'orders',
            where: baseWhere.and.length > 0 ? baseWhere : {},
            limit: 0,
            depth: 0,
          })

          const stats = await Promise.all(statsPromises)

          // 转换为对象格式
          const statsMap: Record<string, number> = {}
          stats.forEach(({ status, count }) => {
            statsMap[status] = count
          })

          return Response.json({
            total: totalResult.totalDocs,
            byStatus: statsMap,
          })
        } catch (error) {
          console.error('[Orders stats endpoint] 错误:', error)
          return Response.json(
            { error: error instanceof Error ? error.message : '统计失败' },
            { status: 500 }
          )
        }
      },
    },
    {
      path: '/search',
      method: 'get',
      handler: async (req) => {
        try {
          const { user, payload, query } = req

          if (!user) {
            return Response.json({ error: '未授权' }, { status: 401 })
          }

          // 构建查询条件
          const where: any = { and: [] }

          // 权限过滤
          const hasRole = await accountHasRole(payload, user.id, ['platform_admin', 'platform_operator'])
          if (!hasRole) {
            const merchantId = await getAccountMerchantId(payload, user.id, [])
            if (merchantId) {
              where.and.push({ merchant: { equals: merchantId } })
            } else {
              const customerUser = await getUserFromAccount(payload, user.id, ['customer'])
              if (customerUser) {
                where.and.push({ customer: { equals: customerUser.id } })
              } else {
                return Response.json({ error: '无权限' }, { status: 403 })
              }
            }
          }

          // 订单号筛选
          if (query.order_no) {
            where.and.push({ order_no: { contains: query.order_no } })
          }

          // 状态筛选
          if (query.status) {
            where.and.push({ status: { equals: query.status } })
          }

          // 创建时间筛选
          if (query.createdAt_gte) {
            where.and.push({ createdAt: { greater_than_equal: query.createdAt_gte } })
          }
          if (query.createdAt_lte) {
            where.and.push({ createdAt: { less_than_equal: query.createdAt_lte } })
          }

          // 商户筛选（平台后台使用）
          if (query.merchantId) {
            where.and.push({ merchant: { equals: query.merchantId } })
          }

          // 客户筛选（商户后台使用）
          if (query.userId) {
            where.and.push({ customer: { equals: query.userId } })
          }

          // 分页参数
          const page = parseInt(query.page as string) || 1
          const limit = parseInt(query.limit as string) || 20
          const depth = parseInt(query.depth as string) || 3

          // 查询订单
          const result = await payload.find({
            collection: 'orders',
            where: where.and.length > 0 ? where : {},
            page,
            limit,
            depth,
            sort: '-createdAt',
          })

          // 用户名筛选（前端传递的参数）
          let filteredDocs = result.docs
          if (query.username) {
            filteredDocs = filteredDocs.filter((order: any) => {
              const username = order.customer?.username || ''
              return username.toLowerCase().includes((query.username as string).toLowerCase())
            })
          }

          // 商户名称筛选（前端传递的参数）
          if (query.merchantName) {
            filteredDocs = filteredDocs.filter((order: any) => {
              const merchantName = typeof order.merchant === 'object' ? (order.merchant.name || '') : ''
              return merchantName.toLowerCase().includes((query.merchantName as string).toLowerCase())
            })
          }

          return Response.json({
            docs: filteredDocs,
            totalDocs: result.totalDocs,
            limit: result.limit,
            totalPages: result.totalPages,
            page: result.page,
            pagingCounter: result.pagingCounter,
            hasPrevPage: result.hasPrevPage,
            hasNextPage: result.hasNextPage,
            prevPage: result.prevPage,
            nextPage: result.nextPage,
          })
        } catch (error) {
          console.error('[Orders search endpoint] 错误:', error)
          return Response.json(
            { error: error instanceof Error ? error.message : '查询失败' },
            { status: 500 }
          )
        }
      },
    },
  ],
  access: {
    read: async ({ req: { user, payload } }) => {
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
        } as Where
      }

      // 用户角色只能查看自己的订单
      const customerUser = await getUserFromAccount(payload, user.id, ['customer'])
      if (customerUser) {
        return {
          customer: {
            equals: customerUser.id,
          },
        } as Where
      }

      return false
    },
    create: async ({ req: { user, payload } }) => {
      if (!user) return false

      // 只有 customer 角色可以创建订单
      return await accountHasRole(payload, user.id, ['customer'])
    },
    update: async ({ req: { user, payload } }) => {
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
        } as Where
      }

      // 用户角色只能更新自己的订单
      const customerUser = await getUserFromAccount(payload, user.id, ['customer'])
      if (customerUser) {
        return {
          customer: {
            equals: customerUser.id,
          },
        } as Where
      }

      return false
    },
    delete: async ({ req: { user, payload } }) => {
      if (!user) return false

      // 只有平台管理员可以删除订单
      return await accountHasRole(payload, user.id, ['platform_admin'])
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
      name: 'out_pay_no',
      type: 'text',
      label: '外部支付单号',
      admin: {
        description: '第三方支付平台返回的支付单号（冗余字段，方便快速查询）',
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
        description: '发货时绑定的设备ID（系统会根据设备SN自动查找或创建设备）',
      },
    },
    {
      name: 'device_sn',
      type: 'text',
      label: '设备序列号',
      admin: {
        description: '发货时输入设备SN，系统会自动处理设备绑定',
        condition: (data) => ['SHIPPED', 'IN_RENT', 'RETURNING', 'RETURNED', 'COMPLETED'].includes(data.status),
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
      name: 'return_confirm_time',
      type: 'date',
      label: '归还签收确认时间',
      admin: {
        date: {
          pickerAppearance: 'dayAndTime',
        },
        description: '商户确认收到归还设备的时间，用于计算实际租期',
        readOnly: true,
        condition: (data) => ['RETURNED', 'COMPLETED'].includes(data.status),
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
      name: 'shipping_fee_adjustment',
      type: 'number',
      label: '运费补差价（元）',
      admin: {
        description: '商户在发货后添加的运费补差价',
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
      label: '地址修改次数',
      admin: {
        readOnly: true,
        description: '记录收货地址被修改的次数',
      },
    },
    {
      name: 'address_change_history',
      type: 'array',
      label: '地址修改历史',
      admin: {
        readOnly: true,
        description: '记录每次地址修改的详细信息',
      },
      fields: [
        {
          name: 'changed_at',
          type: 'date',
          required: true,
          label: '修改时间',
          admin: {
            date: {
              pickerAppearance: 'dayAndTime',
            },
          },
        },
        {
          name: 'operator',
          type: 'relationship',
          relationTo: 'users',
          label: '操作人',
        },
        {
          name: 'old_address',
          type: 'group',
          label: '原地址',
          fields: [
            {
              name: 'contact_name',
              type: 'text',
              label: '收货人',
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
            {
              name: 'region_code',
              type: 'text',
              label: '地区编码',
            },
          ],
        },
        {
          name: 'new_address',
          type: 'group',
          label: '新地址',
          fields: [
            {
              name: 'contact_name',
              type: 'text',
              label: '收货人',
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
            {
              name: 'region_code',
              type: 'text',
              label: '地区编码',
            },
          ],
        },
        {
          name: 'shipping_fee_change',
          type: 'group',
          label: '运费变化',
          fields: [
            {
              name: 'old_fee',
              type: 'number',
              label: '原运费（元）',
            },
            {
              name: 'new_fee',
              type: 'number',
              label: '新运费（元）',
            },
            {
              name: 'adjustment',
              type: 'number',
              label: '运费差额（元）',
            },
          ],
        },
      ],
    },
    {
      name: 'return_address_display',
      type: 'ui',
      label: '归还地址（便于复制）',
      admin: {
        components: {
          Field: '@/components/ReturnAddressDisplay',
        },
        condition: (data) => {
          // 只在有归还地址时显示
          return data.return_address && data.return_address.contact_name
        },
      },
    },
    {
      name: 'return_address',
      type: 'group',
      label: '归还地址（编辑）',
      admin: {
        description: '商户可在"归还中"之前修改归还地址',
      },
      fields: [
        {
          name: 'contact_name',
          type: 'text',
          label: '归还联系人',
          admin: {
            description: '订单状态为 RETURNING 及之后不可修改',
          },
          access: {
            update: ({ data }) => {
              // 在 RETURNING 及之后的状态，归还地址不可编辑
              const readOnlyStatuses = ['RETURNING', 'RETURNED', 'COMPLETED', 'CANCELED']
              return !readOnlyStatuses.includes(data?.status)
            },
          },
        },
        {
          name: 'contact_phone',
          type: 'text',
          label: '联系电话',
          admin: {
            description: '订单状态为 RETURNING 及之后不可修改',
          },
          access: {
            update: ({ data }) => {
              const readOnlyStatuses = ['RETURNING', 'RETURNED', 'COMPLETED', 'CANCELED']
              return !readOnlyStatuses.includes(data?.status)
            },
          },
        },
        {
          name: 'province',
          type: 'text',
          label: '省',
          admin: {
            description: '订单状态为 RETURNING 及之后不可修改',
          },
          access: {
            update: ({ data }) => {
              const readOnlyStatuses = ['RETURNING', 'RETURNED', 'COMPLETED', 'CANCELED']
              return !readOnlyStatuses.includes(data?.status)
            },
          },
        },
        {
          name: 'city',
          type: 'text',
          label: '市',
          admin: {
            description: '订单状态为 RETURNING 及之后不可修改',
          },
          access: {
            update: ({ data }) => {
              const readOnlyStatuses = ['RETURNING', 'RETURNED', 'COMPLETED', 'CANCELED']
              return !readOnlyStatuses.includes(data?.status)
            },
          },
        },
        {
          name: 'district',
          type: 'text',
          label: '区',
          admin: {
            description: '订单状态为 RETURNING 及之后不可修改',
          },
          access: {
            update: ({ data }) => {
              const readOnlyStatuses = ['RETURNING', 'RETURNED', 'COMPLETED', 'CANCELED']
              return !readOnlyStatuses.includes(data?.status)
            },
          },
        },
        {
          name: 'address',
          type: 'text',
          label: '详细地址',
          admin: {
            description: '订单状态为 RETURNING 及之后不可修改',
          },
          access: {
            update: ({ data }) => {
              const readOnlyStatuses = ['RETURNING', 'RETURNED', 'COMPLETED', 'CANCELED']
              return !readOnlyStatuses.includes(data?.status)
            },
          },
        },
        {
          name: 'postal_code',
          type: 'text',
          label: '邮政编码',
          admin: {
            description: '订单状态为 RETURNING 及之后不可修改',
          },
          access: {
            update: ({ data }) => {
              const readOnlyStatuses = ['RETURNING', 'RETURNED', 'COMPLETED', 'CANCELED']
              return !readOnlyStatuses.includes(data?.status)
            },
          },
        },
      ],
    },
    {
      name: 'shipping_logistics',
      type: 'relationship',
      relationTo: 'logistics',
      label: '发货物流',
      admin: {
        description: '订单的发货物流信息（logistics_type=shipping）',
      },
    },
    {
      name: 'return_logistics',
      type: 'relationship',
      relationTo: 'logistics',
      label: '归还物流',
      admin: {
        description: '订单的归还物流信息（logistics_type=return）',
      },
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
        // 调试日志：打印接收到的数据
        if (operation === 'update') {
          console.log('📦 [Orders beforeChange] 接收到的更新数据:', {
            status: data.status,
            shipping_logistics: data.shipping_logistics,
            return_logistics: data.return_logistics,
            device_sn: data.device_sn,
          })
        }

        // 创建订单时生成订单号
        if (operation === 'create') {
          data.order_no = `ORD-${Date.now()}-${Math.random().toString(36).substr(2, 9).toUpperCase()}`
          data.order_creat_at = new Date().toISOString()

          // 自动验证并填充 customer 字段（安全性增强）
          if (req.user) {
            const { getUserFromAccount } = await import('../utils/accountUtils')
            const customerUser = await getUserFromAccount(req.payload, req.user.id, ['customer'])

            if (!customerUser) {
              throw new APIError('当前账号没有 customer 角色，无法创建订单', 400)
            }

            // 验证前端传来的 customer 是否匹配当前登录用户
            const requestedCustomerId = typeof data.customer === 'object' ? data.customer.id : data.customer
            if (requestedCustomerId && String(requestedCustomerId) !== String(customerUser.id)) {
              throw new APIError('无法为其他用户创建订单', 403)
            }

            // 自动填充 customer 字段
            data.customer = customerUser.id
          }

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

              // 解析和验证收货地址
              if (data.shipping_address) {
                // 优先处理：如果已有标准的6位数字编码，根据编码反查省市区名称
                if (data.shipping_address.region_code?.match(/^\d{6}$/)) {
                  try {
                    // 动态导入 china-division 库
                    const chinaData = await import('china-division/dist/provinces.json')
                    const citiesData = await import('china-division/dist/cities.json')
                    const areasData = await import('china-division/dist/areas.json')

                    const code = data.shipping_address.region_code

                    // 查找区/县
                    const areaItem = areasData.default.find((a: any) => a.code === code)
                    if (areaItem) {
                      // 找到区/县，反查市和省
                      const cityItem = citiesData.default.find((c: any) => c.code === areaItem.cityCode)
                      const provinceItem = chinaData.default.find((p: any) => p.code === areaItem.provinceCode)
                      
                      data.shipping_address.district = areaItem.name
                      data.shipping_address.city = cityItem?.name || ''
                      data.shipping_address.province = provinceItem?.name || ''
                    } else {
                      // 查找市
                      const cityItem = citiesData.default.find((c: any) => c.code === code)
                      if (cityItem) {
                        const provinceItem = chinaData.default.find((p: any) => p.code === cityItem.provinceCode)
                        data.shipping_address.city = cityItem.name
                        data.shipping_address.province = provinceItem?.name || ''
                        data.shipping_address.district = '' // 市级编码，没有区
                      } else {
                        // 查找省
                        const provinceItem = chinaData.default.find((p: any) => p.code === code)
                        if (provinceItem) {
                          data.shipping_address.province = provinceItem.name
                          data.shipping_address.city = ''
                          data.shipping_address.district = ''
                        } else {
                          throw new APIError(`无法识别地区编码: ${code}`, 400)
                        }
                      }
                    }

                    console.log(
                      `[Orders] 地区编码反查成功: ${code} -> ${data.shipping_address.province} ${data.shipping_address.city} ${data.shipping_address.district}`
                    )
                  } catch (error) {
                    if (error instanceof APIError) {
                      throw error
                    }
                    const err = error as Error
                    throw new APIError(
                      `地区编码反查失败: ${err.message}`,
                      400,
                    )
                  }
                } else if (!data.shipping_address.region_code?.match(/^\d{6}$/)) {
                  // 如果 region_code 不是标准的6位数字编码，则根据省市区名称查询编码
                  try {
                    // 动态导入 china-division 库
                    const chinaData = await import('china-division/dist/provinces.json')
                    const citiesData = await import('china-division/dist/cities.json')
                    const areasData = await import('china-division/dist/areas.json')

                    // 查询省编码
                    const provinceItem = chinaData.default.find(
                      (p: any) => p.name === data.shipping_address.province
                    )
                    if (!provinceItem) {
                      throw new APIError(
                        `无法识别省份: ${data.shipping_address.province}，请检查地址格式是否正确`,
                        400,
                      )
                    }

                    // 查询市编码
                    const cityItem = citiesData.default.find(
                      (c: any) => c.name === data.shipping_address.city && c.provinceCode === provinceItem.code
                    )

                    // 特殊处理：直辖市（北京、上海、天津、重庆）
                    // 直辖市的省和市名称相同，但在 cities 数据中没有对应记录
                    // 这种情况下，直接使用省级编码
                    const isDirectMunicipality = ['北京市', '上海市', '天津市', '重庆市'].includes(provinceItem.name)
                    if (!cityItem && !isDirectMunicipality) {
                      throw new APIError(
                        `无法识别城市: ${data.shipping_address.city}（${data.shipping_address.province}），请检查地址格式是否正确`,
                        400,
                      )
                    }

                    // 查询区/县编码
                    let areaItem
                    if (data.shipping_address.district) {
                      // 对于直辖市，区编码的 cityCode 应该是省级编码（因为没有市级编码）
                      const parentCode = isDirectMunicipality ? provinceItem.code : cityItem?.code

                      areaItem = areasData.default.find(
                        (a: any) => a.name === data.shipping_address.district && a.cityCode === parentCode
                      )
                      if (!areaItem) {
                        // 如果找不到区级编码，降级使用市级或省级编码
                        console.warn(
                          `[Orders] 无法识别区县: ${data.shipping_address.district}（${data.shipping_address.city}），将使用${isDirectMunicipality ? '省级' : '市级'}编码`
                        )
                      }
                    }

                    // 优先使用区级编码，其次市级，最后省级
                    data.shipping_address.region_code = areaItem?.code || cityItem?.code || provinceItem?.code

                    console.log(
                      `[Orders] 地区编码转换成功: ${data.shipping_address.province} ${data.shipping_address.city} ${data.shipping_address.district} -> ${data.shipping_address.region_code}`
                    )
                  } catch (error) {
                    if (error instanceof APIError) {
                      throw error
                    }
                    const err = error as Error
                    throw new APIError(
                      `地址编码转换失败: ${err.message}，请检查省市区是否完整和正确`,
                      400,
                    )
                  }
                }

                // 验证地址完整性（在编码转换/反查之后）
                const { parseAddress } = await import('../utils/addressParser')

                // 尝试从完整地址中解析省市区（作为补充）
                const fullAddress = [
                  data.shipping_address.province || '',
                  data.shipping_address.city || '',
                  data.shipping_address.district || '',
                  data.shipping_address.address || '',
                ].join('')

                const parsed = parseAddress(fullAddress)

                // 补全地址字段
                if (!data.shipping_address.province && parsed.province) {
                  data.shipping_address.province = parsed.province
                }

                if (!data.shipping_address.city && parsed.city) {
                  data.shipping_address.city = parsed.city
                }

                // 重点：如果 district 为空或者与 city 重复，尝试从解析结果补全
                if (
                  (!data.shipping_address.district ||
                   data.shipping_address.district === data.shipping_address.city) &&
                  parsed.district
                ) {
                  data.shipping_address.district = parsed.district
                }

                // 最终验证：必须有省市区
                if (!data.shipping_address.province) {
                  throw new APIError('收货地址缺少省份信息，请检查地址格式', 400)
                }

                if (!data.shipping_address.city) {
                  throw new APIError('收货地址缺少城市信息，请检查地址格式', 400)
                }

                if (!data.shipping_address.district) {
                  throw new APIError(
                    `收货地址缺少区县信息。当前地址：${fullAddress}，请提供完整的省市区信息`,
                    400,
                  )
                }

                // 验证联系信息
                if (!data.shipping_address.contact_name || !data.shipping_address.contact_phone) {
                  throw new APIError('收货地址缺少联系人或联系电话', 400)
                }

                // 验证详细地址
                if (!data.shipping_address.address || data.shipping_address.address.trim() === '') {
                  throw new APIError('请提供详细的收货地址（街道、门牌号等）', 400)
                }
              }

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
                    throw new APIError(
                      `该地址不在配送范围内: ${shippingResult.blacklistReason || '该地区不发货'}`,
                      400,
                    )
                  }

                  // 设置运费快照
                  data.shipping_fee_snapshot = shippingResult.fee
                }
              } else if (!shippingTemplateId) {
                throw new APIError('无法找到可用的运费模板，请联系商户', 400)
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
              throw new APIError('商户未设置归还地址，请联系商户', 400)
            }
          }

          // 计算租期天数
          const startDate = new Date(data.rent_start_date)
          const endDate = new Date(data.rent_end_date)
          data.rent_days = Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24))

          // 设置授信冻结金额
          data.credit_hold_amount = data.device_value_snapshot

          // 实际冻结授信额度
          const { freezeCredit } = await import('../utils/creditUtils')
          await freezeCredit(
            req.payload,
            data.customer,
            data.merchant,
            data.credit_hold_amount,
          )
        }

        // 更新订单时，如果修改了地址，重新计算运费
        if (operation === 'update' && data.shipping_address && originalDoc.shipping_address) {
          // 检查地址是否发生变化
          const addressChanged =
            originalDoc.shipping_address.province !== data.shipping_address.province ||
            originalDoc.shipping_address.city !== data.shipping_address.city ||
            originalDoc.shipping_address.district !== data.shipping_address.district

          if (addressChanged) {
            console.log('📍 [Orders] 检测到地址变化，重新计算运费')

            // 检查订单状态，只有 NEW、PAID、TO_SHIP 状态可以修改地址
            const canEditAddress = ['NEW', 'PAID', 'TO_SHIP'].includes(originalDoc.status)
            if (!canEditAddress) {
              throw new APIError('当前订单状态不允许修改收货地址', 400)
            }

            // 检查修改次数限制（最多2次）
            const currentChangeCount = originalDoc.address_change_count || 0
            if (currentChangeCount >= 2) {
              throw new APIError('地址修改次数已达上限（最多2次）', 400)
            }

            // 获取运费模板
            const shippingTemplateId = originalDoc.shipping_template_id

            if (shippingTemplateId) {
              const shippingTemplate = await req.payload.findByID({
                collection: 'shipping-templates',
                id: shippingTemplateId,
              })

              if (shippingTemplate) {
                const shippingResult = calculateShippingFee(shippingTemplate as any, data.shipping_address)

                // 检查是否为黑名单地区
                if (shippingResult.isBlacklisted) {
                  throw new APIError(
                    `该地址不在配送范围内: ${shippingResult.blacklistReason || '该地区不发货'}`,
                    400,
                  )
                }

                const newShippingFee = shippingResult.fee
                const oldShippingFee = originalDoc.shipping_fee_snapshot
                const adjustment = newShippingFee - oldShippingFee

                // 根据订单状态决定如何处理运费变化
                if (originalDoc.status === 'NEW') {
                  // 未支付订单：直接更新运费快照和订单总额
                  data.shipping_fee_snapshot = newShippingFee

                  // 重新计算订单总额
                  const rentAmount = originalDoc.daily_fee_snapshot * originalDoc.rent_days
                  data.order_total_amount = rentAmount + newShippingFee

                  console.log(
                    `✅ [Orders] 未支付订单修改地址，更新运费: ${oldShippingFee} -> ${newShippingFee}，订单总额: ${data.order_total_amount}`,
                  )
                } else if (['PAID', 'TO_SHIP'].includes(originalDoc.status)) {
                  // 已支付订单：计算运费补差价
                  if (adjustment !== 0) {
                    data.shipping_fee_adjustment = adjustment
                    console.log(
                      `✅ [Orders] 已支付订单修改地址，运费补差价: ${adjustment > 0 ? '+' : ''}${adjustment}元`,
                    )
                  }
                }

                // 记录地址修改历史
                if (!data.address_change_history) {
                  data.address_change_history = originalDoc.address_change_history || []
                }

                data.address_change_history.push({
                  changed_at: new Date().toISOString(),
                  operator: req.user?.id,
                  old_address: {
                    contact_name: originalDoc.shipping_address.contact_name,
                    contact_phone: originalDoc.shipping_address.contact_phone,
                    province: originalDoc.shipping_address.province,
                    city: originalDoc.shipping_address.city,
                    district: originalDoc.shipping_address.district,
                    address: originalDoc.shipping_address.address,
                    region_code: originalDoc.shipping_address.region_code,
                  },
                  new_address: {
                    contact_name: data.shipping_address.contact_name,
                    contact_phone: data.shipping_address.contact_phone,
                    province: data.shipping_address.province,
                    city: data.shipping_address.city,
                    district: data.shipping_address.district,
                    address: data.shipping_address.address,
                    region_code: data.shipping_address.region_code,
                  },
                  shipping_fee_change: {
                    old_fee: oldShippingFee,
                    new_fee: newShippingFee,
                    adjustment: adjustment,
                  },
                })

                // 更新修改次数
                data.address_change_count = (originalDoc.address_change_count || 0) + 1

                console.log(
                  `📝 [Orders] 记录地址修改历史，第 ${data.address_change_count} 次修改`,
                )
              }
            }
          }
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

          // PAID 状态自动流转到 TO_SHIP（待发货）
          if (data.status === 'PAID' && originalDoc.status === 'NEW') {
            console.log('💰 [订单支付成功] 自动流转到待发货状态')
            data.status = 'TO_SHIP'
            
            // 记录自动流转
            data.status_history.push({
              status: 'TO_SHIP',
              changed_at: new Date().toISOString(),
              operator: req.user?.id,
              notes: '支付成功，自动流转到待发货',
            })
          }

          // SHIPPED时设置计费起点和处理设备绑定
          if (data.status === 'SHIPPED') {
            // 设置计费起点
            if (!data.actual_start_date) {
              const now = new Date()
              const nextDay = new Date(now.getTime() + 24 * 60 * 60 * 1000)
              nextDay.setHours(0, 0, 0, 0)
              data.actual_start_date = nextDay.toISOString()
            }

            // 处理设备绑定：根据 device_sn 查找或创建设备
            if (data.device_sn) {
              const skuId = typeof data.merchant_sku === 'object' ? data.merchant_sku.id : data.merchant_sku

              // 查找是否已存在该 SN 的设备
              const existingDevices = await req.payload.find({
                collection: 'devices',
                where: {
                  sn: {
                    equals: data.device_sn.trim(),
                  },
                },
                limit: 1,
              })

              if (existingDevices.docs.length > 0) {
                // 设备已存在，直接关联
                const device = existingDevices.docs[0]

                // 检查设备SKU是否匹配
                const deviceSkuId = typeof device.merchant_sku === 'object' ? device.merchant_sku.id : device.merchant_sku
                if (String(deviceSkuId) !== String(skuId)) {
                  throw new APIError(
                    `设备 ${data.device_sn} 属于其他SKU，无法绑定到此订单`,
                    400
                  )
                }

                // 检查设备状态
                if (device.status !== 'in_stock' && device.status !== 'in_transit') {
                  throw new APIError(
                    `设备 ${data.device_sn} 状态为 ${device.status}，无法发货`,
                    400
                  )
                }

                data.device = device.id
              } else {
                // 设备不存在，自动创建
                const newDevice = await req.payload.create({
                  collection: 'devices',
                  data: {
                    merchant_sku: skuId,
                    sn: data.device_sn.trim(),
                    status: 'in_transit',
                    condition: 'new',
                    notes: `订单 ${data.order_no} 发货时自动创建`,
                  },
                })

                data.device = newDevice.id
              }
            }
          }

          // RETURNED时记录签收时间并计算超期
          if (data.status === 'RETURNED' && originalDoc.status === 'RETURNING') {
            // 记录归还签收确认时间
            if (!data.return_confirm_time) {
              data.return_confirm_time = new Date().toISOString()
            }

            // 计算实际租期和是否超期
            if (data.actual_start_date && data.rent_days && data.daily_fee_snapshot) {
              const actualStartDate = new Date(data.actual_start_date)
              const returnConfirmTime = new Date(data.return_confirm_time)

              // 计算实际租期（向上取整）
              const actualDays = Math.ceil(
                (returnConfirmTime.getTime() - actualStartDate.getTime()) / (1000 * 60 * 60 * 24)
              )

              console.log('📊 [超期计算]', {
                actual_start_date: data.actual_start_date,
                return_confirm_time: data.return_confirm_time,
                actualDays,
                rent_days: data.rent_days,
              })

              // 判断是否超期
              if (actualDays > data.rent_days) {
                const overdueDays = actualDays - data.rent_days
                const overdueAmount = overdueDays * data.daily_fee_snapshot

                // 更新超期信息
                data.is_overdue = true
                data.overdue_days = overdueDays
                data.overdue_amount = overdueAmount

                // 更新订单总额
                const originalTotal = data.order_total_amount || 0
                data.order_total_amount = originalTotal + overdueAmount

                console.log('⚠️  [订单超期]', {
                  overdueDays,
                  overdueAmount,
                  originalTotal,
                  newTotal: data.order_total_amount,
                })
              } else {
                // 未超期
                data.is_overdue = false
                data.overdue_days = 0
                data.overdue_amount = 0

                console.log('✅ [订单未超期]', {
                  actualDays,
                  rent_days: data.rent_days,
                })
              }
            }
          }

          // COMPLETED时检查是否有未支付的补差价
          if (data.status === 'COMPLETED' && originalDoc.status === 'RETURNED') {
            // 如果订单有超期费用，检查是否已支付
            if (data.is_overdue && data.overdue_amount > 0) {
              // 查询是否存在已支付的逾期补差价记录
              const overduePayments = await req.payload.find({
                collection: 'payments',
                where: {
                  and: [
                    {
                      order: {
                        equals: originalDoc.id,
                      },
                    },
                    {
                      type: {
                        equals: 'overdue',
                      },
                    },
                    {
                      status: {
                        equals: 'paid',
                      },
                    },
                  ],
                },
              })

              const totalPaid = overduePayments.docs.reduce((sum, payment) => {
                return sum + (payment.amount || 0)
              }, 0)

              console.log('💰 [补差价支付检查]', {
                overdue_amount: data.overdue_amount,
                totalPaid,
                hasUnpaid: totalPaid < data.overdue_amount,
              })

              if (totalPaid < data.overdue_amount) {
                throw new APIError(
                  `订单超期 ${data.overdue_days} 天，需要客户支付补差价 ${data.overdue_amount - totalPaid} 元后才能完成订单`,
                  400
                )
              }
            }
          }
        }

        return data
      },
    ],
    afterChange: [
      async ({ doc, req, operation, previousDoc }) => {
        const { releaseCredit } = await import('../utils/creditUtils')

        // 订单完成时释放授信
        if (operation === 'update' && previousDoc.status !== 'COMPLETED' && doc.status === 'COMPLETED') {
          if (doc.credit_hold_amount && doc.credit_hold_amount > 0) {
            const customerId = typeof doc.customer === 'object' ? doc.customer.id : doc.customer
            const merchantId = typeof doc.merchant === 'object' ? doc.merchant.id : doc.merchant

            await releaseCredit(
              req.payload,
              customerId,
              merchantId,
              doc.credit_hold_amount,
            )
          }
        }

        // 订单取消时释放授信
        if (operation === 'update' && previousDoc.status !== 'CANCELED' && doc.status === 'CANCELED') {
          if (doc.credit_hold_amount && doc.credit_hold_amount > 0) {
            const customerId = typeof doc.customer === 'object' ? doc.customer.id : doc.customer
            const merchantId = typeof doc.merchant === 'object' ? doc.merchant.id : doc.merchant

            await releaseCredit(
              req.payload,
              customerId,
              merchantId,
              doc.credit_hold_amount,
            )
          }
        }
      },
    ],
    afterRead: [
      async ({ doc, req }) => {
        // 填充 customer 的 username（从关联的 account 获取）
        if (doc.customer) {
          try {
            // 如果 customer 是对象
            if (typeof doc.customer === 'object') {
              // 如果已经有 username，跳过
              if (doc.customer.username) {
                return doc
              }

              // 获取 account ID
              const accountId = doc.customer.account
                ? (typeof doc.customer.account === 'object' 
                    ? doc.customer.account.id 
                    : doc.customer.account)
                : null

              if (accountId) {
                const account = await req.payload.findByID({
                  collection: 'accounts',
                  id: accountId,
                })
                
                if (account && account.username) {
                  doc.customer.username = account.username
                }
              }
            } 
            // 如果 customer 只是 ID，需要查询完整的 user 信息
            else if (typeof doc.customer === 'number') {
              const user = await req.payload.findByID({
                collection: 'users',
                id: doc.customer,
                depth: 1,
              })

              if (user && user.account) {
                const accountId = typeof user.account === 'object' 
                  ? user.account.id 
                  : user.account

                const account = await req.payload.findByID({
                  collection: 'accounts',
                  id: accountId,
                })

                // 将 customer 替换为包含 username 的对象
                doc.customer = {
                  id: user.id,
                  username: account.username || `user_${user.id}`,
                  account: user.account,
                  user_type: user.user_type,
                  role: user.role,
                  merchant: user.merchant,
                  status: user.status,
                }
              }
            }
          } catch (error) {
            // 忽略错误，不影响主流程
            const err = error as Error
            console.warn(`[Orders afterRead] 无法获取 customer username: ${err.message}`)
          }
        }

        return doc
      },
    ],
  },
}
