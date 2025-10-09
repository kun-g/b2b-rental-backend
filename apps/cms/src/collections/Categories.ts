import type { CollectionConfig } from 'payload'

/**
 * Categories Collection - 类目管理（平台维护）
 * 对应 PRD 3.1 类目
 */
export const Categories: CollectionConfig = {
  slug: 'categories',
  admin: {
    useAsTitle: 'name',
    defaultColumns: ['name', 'path', 'sort', 'updatedAt'],
    group: '平台管理',
  },
  access: {
    // 所有人可读，仅平台运营/管理员可写
    read: () => true,
    create: ({ req: { user } }) => {
      return user?.role === 'platform_admin' || user?.role === 'platform_operator'
    },
    update: ({ req: { user } }) => {
      return user?.role === 'platform_admin' || user?.role === 'platform_operator'
    },
    delete: ({ req: { user } }) => {
      return user?.role === 'platform_admin'
    },
  },
  fields: [
    {
      name: 'name',
      type: 'text',
      required: true,
      label: '类目名称',
    },
    {
      name: 'parent',
      type: 'relationship',
      relationTo: 'categories',
      label: '父类目',
      admin: {
        description: '留空表示顶级类目',
      },
    },
    {
      name: 'path',
      type: 'text',
      label: '类目路径',
      admin: {
        description: '自动生成，如：/电子设备/无人机',
        readOnly: true,
      },
    },
    {
      name: 'sort',
      type: 'number',
      label: '排序',
      defaultValue: 0,
      admin: {
        description: '数字越小越靠前',
      },
    },
    {
      name: 'status',
      type: 'select',
      label: '状态',
      defaultValue: 'active',
      options: [
        { label: '启用', value: 'active' },
        { label: '停用', value: 'inactive' },
      ],
    },
  ],
  hooks: {
    beforeChange: [
      // 自动生成 path
      async ({ data, req, operation }) => {
        if (operation === 'create' || operation === 'update') {
          if (data.parent) {
            const parent = await req.payload.findByID({
              collection: 'categories',
              id: data.parent,
            })
            data.path = `${parent.path}/${data.name}`
          } else {
            data.path = `/${data.name}`
          }
        }
        return data
      },
    ],
  },
}
