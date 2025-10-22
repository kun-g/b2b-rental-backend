import type { CollectionConfig } from 'payload'
import { accountHasRole, getAccountMerchantId } from '../utils/accountUtils'

/**
 * ReturnInfo Collection - 归还信息管理
 * 对应 PRD 商户管理部分
 * 每个商户可以设置多个归还地址，用于用户回寄设备
 */
export const ReturnInfo: CollectionConfig = {
  slug: 'return-info',
  admin: {
    useAsTitle: 'return_contact_name',
    defaultColumns: ['merchant', 'return_contact_name', 'return_contact_phone', 'status', 'updatedAt'],
    group: '商户管理',
  },
  access: {
    read: async ({ req: { user, payload } }) => {
      if (!user) return false

      // 平台角色可以查看所有归还信息
      if (await accountHasRole(payload, user.id, ['platform_admin', 'platform_operator'])) {
        return true
      }

      // 商户角色只能查看自己的归还信息
      const merchantId = await getAccountMerchantId(payload, user.id, [])
      if (merchantId) {
        return {
          merchant: {
            equals: merchantId,
          },
        }
      }

      // 普通用户在下单时可以查看商户的归还信息
      if (await accountHasRole(payload, user.id, ['customer'])) {
        return true
      }

      return false
    },
    create: async ({ req: { user, payload } }) => {
      if (!user) return false

      // 只有商户管理员可以创建归还信息
      return await accountHasRole(payload, user.id, ['merchant_admin'])
    },
    update: async ({ req: { user, payload } }) => {
      if (!user) return false

      // 平台管理员可以更新所有归还信息
      if (await accountHasRole(payload, user.id, ['platform_admin'])) {
        return true
      }

      // 商户管理员只能更新自己的归还信息
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
    delete: async ({ req: { user, payload } }) => {
      if (!user) return false

      // 平台管理员可以删除所有归还信息
      if (await accountHasRole(payload, user.id, ['platform_admin'])) {
        return true
      }

      // 商户管理员只能删除自己的归还信息
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
        description: '该归还信息所属的商户',
      },
    },
    {
      name: 'return_contact_name',
      type: 'text',
      required: true,
      label: '回收联系人姓名',
      admin: {
        description: '设备回收的联系人姓名',
      },
    },
    {
      name: 'return_contact_phone',
      type: 'text',
      required: true,
      label: '回收联系人电话',
      admin: {
        description: '设备回收的联系人电话（建议格式：1xxxxxxxxxx）',
      },
    },
    {
      name: 'return_address',
      type: 'group',
      label: '回收地址',
      fields: [
        {
          name: 'province',
          type: 'text',
          required: true,
          label: '省份',
        },
        {
          name: 'city',
          type: 'text',
          required: true,
          label: '城市',
        },
        {
          name: 'district',
          type: 'text',
          label: '区/县',
        },
        {
          name: 'address',
          type: 'textarea',
          required: true,
          label: '详细地址',
          admin: {
            description: '街道、门牌号等详细地址信息',
          },
        },
        {
          name: 'postal_code',
          type: 'text',
          label: '邮政编码',
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
        { label: '停用', value: 'disabled' },
      ],
      admin: {
        description: '停用后该地址将不可用于新订单',
      },
    },
    {
      name: 'is_default',
      type: 'checkbox',
      defaultValue: false,
      label: '是否为默认地址',
      admin: {
        description: '每个商户只能有一个默认归还地址',
      },
    },
    {
      name: 'notes',
      type: 'textarea',
      label: '备注',
      admin: {
        description: '地址相关的补充说明，如营业时间、特殊要求等',
      },
    },
  ],
  hooks: {
    beforeChange: [
      async ({ data, req, operation, originalDoc }) => {
        // 如果设置为默认地址，需要将同一商户的其他地址设为非默认
        if (data.is_default && req.payload) {
          const merchantId = data.merchant || originalDoc?.merchant
          if (merchantId) {
            // 查找同一商户的其他默认地址
            const existingDefault = await req.payload.find({
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
                  ...(operation === 'update' && originalDoc?.id
                    ? [
                        {
                          id: {
                            not_equals: originalDoc.id,
                          },
                        },
                      ]
                    : []),
                ],
              },
            })

            // 将其他默认地址更新为非默认
            if (existingDefault.docs.length > 0) {
              for (const doc of existingDefault.docs) {
                await req.payload.update({
                  collection: 'return-info',
                  id: doc.id,
                  data: {
                    is_default: false,
                  },
                })
              }
            }
          }
        }

        return data
      },
    ],
  },
}
