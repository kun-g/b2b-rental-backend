import type { CollectionConfig, Where } from 'payload'
import {
  accountHasRole,
  getAccountMerchantId,
  getUserCreditedMerchantIds,
  getUserFromAccount,
  canViewPlatformOnlyField,
} from '../utils/accountUtils'

/**
 * MerchantSKUs Collection - 商户SKU（商户自建，归属类目）
 * 对应 PRD 3.2 商户SKU 和 7 数据模型 merchant_sku
 */
export const MerchantSKUs: CollectionConfig = {
  slug: 'merchant-skus',
  admin: {
    useAsTitle: 'name',
    defaultColumns: ['name', 'merchant', 'category', 'daily_fee', 'inventory_qty', 'is_listed', 'updatedAt'],
    group: '商户管理',
  },
  access: {
    read: async ({ req: { user, payload } }) => {
      if (!user) return false

      // 平台角色可以查看所有 SKU
      if (await accountHasRole(payload, user.id, ['platform_admin', 'platform_operator'])) {
        return true
      }

      // 商户角色只能查看自己的 SKU
      const merchantId = await getAccountMerchantId(payload, user.id, [])
      if (merchantId) {
        return {
          merchant: {
            equals: merchantId,
          },
        }
      }

      // 普通用户只能查看有授信的商户的已上架SKU
      const merchantIds = await getUserCreditedMerchantIds(payload, user.id)

      if (merchantIds.length > 0) {
        return {
          and: [
            {
              merchant: {
                in: merchantIds,
              },
            },
            {
              is_listed: {
                equals: true,
              },
            },
            {
              listing_status: {
                equals: 'approved',
              },
            },
          ],
        } as Where
      }

      return false
    },
    create: async ({ req: { user, payload } }) => {
      if (!user) return false

      // 只有商户管理员和成员可以创建 SKU
      return await accountHasRole(payload, user.id, ['merchant_admin', 'merchant_member'])
    },
    update: async ({ req: { user, payload } }) => {
      if (!user) return false

      // 平台角色可以更新所有 SKU
      if (await accountHasRole(payload, user.id, ['platform_admin', 'platform_operator'])) {
        return true
      }

      // 商户角色只能更新自己的 SKU
      const merchantId = await getAccountMerchantId(payload, user.id, [])
      if (merchantId) {
        return {
          merchant: {
            equals: merchantId,
          },
        }
      }

      return false
    },
    delete: async ({ req: { user, payload } }) => {
      if (!user) return false

      // 平台管理员可以删除所有 SKU
      if (await accountHasRole(payload, user.id, ['platform_admin'])) {
        return true
      }

      // 商户管理员只能删除自己的 SKU
      const merchantId = await getAccountMerchantId(payload, user.id, ['merchant_admin'])
      if (merchantId) {
        return {
          merchant: {
            equals: merchantId,
          },
        }
      }

      return false
    },
  },
  fields: [
    {
      name: 'merchant',
      type: 'relationship',
      relationTo: 'merchants',
      required: true,
      label: '所属商户',
      admin: {
        description: '该SKU归属的商户',
      },
    },
    {
      name: 'category',
      type: 'relationship',
      relationTo: 'categories',
      required: true,
      label: '所属类目',
    },
    {
      name: 'name',
      type: 'text',
      required: true,
      label: 'SKU名称',
      admin: {
        description: '如：大疆 Mavic 3 Pro',
      },
    },
    {
      name: 'description',
      type: 'richText',
      label: '商品描述',
    },
    {
      name: 'images',
      type: 'array',
      label: '商品图片',
      fields: [
        {
          name: 'image',
          type: 'upload',
          relationTo: 'media',
          required: true,
        },
      ],
    },
    {
      name: 'daily_fee',
      type: 'number',
      required: true,
      label: '日租金（元）',
      min: 0,
      admin: {
        description: '单位：元/天',
      },
    },
    {
      name: 'device_value',
      type: 'number',
      required: true,
      label: '设备价值（元）',
      min: 0,
      admin: {
        description: '用于授信计算和押金参考',
      },
    },
    {
      name: 'inventory_qty',
      type: 'number',
      required: true,
      defaultValue: 0,
      label: '库存数量',
      min: 0,
      admin: {
        description: '可租数量，MVP不做租期日历',
      },
    },
    {
      name: 'shipping_template',
      type: 'relationship',
      relationTo: 'shipping-templates',
      label: '运费模板',
      admin: {
        description: '留空则使用商户默认模板',
      },
    },
    {
      name: 'is_listed',
      type: 'checkbox',
      defaultValue: false,
      label: '是否上架',
      admin: {
        description: '上架后对授信用户可见',
      },
    },
    {
      name: 'listing_status',
      type: 'select',
      defaultValue: 'draft',
      label: '上架状态',
      options: [
        { label: '草稿', value: 'draft' },
        { label: '待审核', value: 'pending' },
        { label: '已通过', value: 'approved' },
        { label: '已拒绝', value: 'rejected' },
      ],
      admin: {
        description: 'MVP默认需平台审核后才能上架',
      },
      access: {
        // 只有平台和商户可以查看上架状态
        read: async ({ req: { user, payload } }) => {
          if (!user) return false
          // 平台角色可以查看
          if (await accountHasRole(payload, user.id, ['platform_admin', 'platform_operator'])) {
            return true
          }
          // 商户角色可以查看
          const merchantId = await getAccountMerchantId(payload, user.id, [])
          return !!merchantId
        },
      },
    },
    {
      name: 'rejection_reason',
      type: 'textarea',
      label: '拒绝原因',
      admin: {
        condition: (data) => data.listing_status === 'rejected',
      },
      access: {
        read: canViewPlatformOnlyField,
      },
    },
    {
      name: 'specifications',
      type: 'array',
      label: '规格参数',
      fields: [
        {
          name: 'name',
          type: 'text',
          required: true,
          label: '参数名',
        },
        {
          name: 'value',
          type: 'text',
          required: true,
          label: '参数值',
        },
      ],
    },
    {
      name: 'created_by',
      type: 'relationship',
      relationTo: 'users',
      label: '创建人',
      admin: {
        readOnly: true,
      },
      access: {
        read: canViewPlatformOnlyField,
      },
    },
    {
      name: 'updated_by',
      type: 'relationship',
      relationTo: 'users',
      label: '更新人',
      admin: {
        readOnly: true,
      },
      access: {
        read: canViewPlatformOnlyField,
      },
    },
  ],
  hooks: {
    beforeChange: [
      async ({ data, req, operation }) => {
        // 获取当前操作者的 User（业务身份）
        const user = req.user
          ? await getUserFromAccount(req.payload, req.user.id)
          : null

        // 自动设置创建人/更新人
        if (operation === 'create') {
          data.created_by = user?.id
        }
        data.updated_by = user?.id

        // 如果状态为已通过且is_listed为true，才真正上架
        if (data.listing_status === 'approved' && data.is_listed) {
          // 可以触发其他业务逻辑，如通知
        }

        return data
      },
    ],
  },
}
