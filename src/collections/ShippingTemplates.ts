import type { AccessArgs, CollectionConfig } from 'payload'
import {
  accountHasRole,
  getAccountMerchantId,
  getUserCreditedMerchantIds,
} from '../utils/accountUtils'

/**
 * ShippingTemplates Collection - 运费模板（商户×商户SKU）
 * 对应 PRD 6. 计费与运费 和 7 数据模型 shipping_template
 */
export const ShippingTemplates: CollectionConfig = {
  slug: 'shipping-templates',
  admin: {
    useAsTitle: 'name',
    defaultColumns: ['name', 'merchant', 'version', 'status', 'updatedAt'],
    group: '商户管理',
  },
  access: {
    read: (async ({ req: { user, payload } }: AccessArgs<any>) => {
      if (!user) return false

      // 平台角色可以查看所有模板
      if (await accountHasRole(payload, user.id, ['platform_admin', 'platform_operator'])) {
        return true
      }

      // 商户角色只能看到自己商户的模板
      const merchantId = await getAccountMerchantId(payload, user.id, [])
      if (merchantId) {
        return {
          merchant: {
            equals: merchantId,
          },
        }
      }

      // 普通用户可以看到有授信的商户的模板
      const merchantIds = await getUserCreditedMerchantIds(payload, user.id)

      if (merchantIds.length > 0) {
        return {
          merchant: {
            in: merchantIds,
          },
        }
      }

      return false
    }) as any,
    create: ({ req: { user } }) => {
      return user?.role === 'merchant_admin' || user?.role === 'merchant_member'
    },
    update: ({ req: { user } }) => {
      if (user?.role === 'platform_admin') {
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
      return false
    },
    delete: ({ req: { user } }) => {
      if (user?.role === 'platform_admin') {
        return true
      }
      if (user?.role === 'merchant_admin') {
        const merchantId = typeof user.merchant === 'object' ? user.merchant?.id : user.merchant
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
    },
    {
      name: 'name',
      type: 'text',
      required: true,
      label: '模板名称',
      admin: {
        description: '如：默认运费模板、偏远地区模板',
      },
    },
    {
      name: 'version',
      type: 'number',
      defaultValue: 1,
      min: 1,
      label: '版本号',
      admin: {
        description: '每次修改自动递增，用于订单快照追溯',
        readOnly: true,
      },
    },
    {
      name: 'default_fee',
      type: 'number',
      required: true,
      defaultValue: 0,
      min: 0,
      label: '默认运费（元）',
      admin: {
        description: '未匹配到指定地区时的运费',
      },
    },
    {
      name: 'region_rules',
      type: 'array',
      label: '地区运费规则',
      admin: {
        description: '按地区设置固定价，优先级：不发地区 > 指定地区价 > 默认价',
      },
      fields: [
        {
          name: 'region_code_path',
          type: 'text',
          required: true,
          label: '地区编码路径',
          admin: {
            description: '如：110000（北京）、440300（深圳）',
          },
        },
        {
          name: 'region_name',
          type: 'text',
          required: true,
          label: '地区名称',
          admin: {
            description: '如：北京市、广东省深圳市',
          },
        },
        {
          name: 'fee',
          type: 'number',
          required: true,
          min: 0,
          label: '运费（元）',
        },
      ],
    },
    {
      name: 'blacklist_regions',
      type: 'array',
      label: '不发地区（黑名单）',
      admin: {
        description: '命中后下单拦截，平台可豁免',
      },
      fields: [
        {
          name: 'region_code_path',
          type: 'text',
          required: true,
          label: '地区编码路径',
        },
        {
          name: 'region_name',
          type: 'text',
          required: true,
          label: '地区名称',
        },
        {
          name: 'reason',
          type: 'text',
          label: '不发原因',
          admin: {
            description: '如：偏远地区、无物流覆盖',
          },
        },
      ],
    },
    {
      name: 'status',
      type: 'select',
      required: true,
      defaultValue: 'active',
      label: '状态',
      options: [
        { label: '启用', value: 'active' },
        { label: '停用', value: 'inactive' },
        { label: '已归档', value: 'archived' },
      ],
    },
    {
      name: 'is_default',
      type: 'checkbox',
      defaultValue: false,
      label: '是否为商户默认模板',
      admin: {
        description: 'SKU未指定模板时使用此模板',
      },
    },
    {
      name: 'notes',
      type: 'textarea',
      label: '备注',
    },
  ],
  hooks: {
    beforeChange: [
      async ({ data, operation, originalDoc }) => {
        // 更新时自动递增版本号
        if (operation === 'update' && originalDoc) {
          // 检查是否有实质性修改（运费相关字段）
          const hasChanges =
            data.default_fee !== originalDoc.default_fee ||
            JSON.stringify(data.region_rules) !== JSON.stringify(originalDoc.region_rules) ||
            JSON.stringify(data.blacklist_regions) !== JSON.stringify(originalDoc.blacklist_regions)

          if (hasChanges) {
            data.version = (originalDoc.version || 1) + 1
          }
        }
        return data
      },
    ],
    afterChange: [
      async ({ doc, req, operation }) => {
        // 如果设置为默认模板，取消同商户其他模板的默认状态
        if (doc.is_default && operation === 'update') {
          await req.payload.update({
            collection: 'shipping-templates',
            where: {
              and: [
                {
                  merchant: {
                    equals: doc.merchant,
                  },
                },
                {
                  id: {
                    not_equals: doc.id,
                  },
                },
              ],
            },
            data: {
              is_default: false,
            },
          })
        }
      },
    ],
  },
}
