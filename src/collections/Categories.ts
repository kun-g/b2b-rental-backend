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
      // 过滤选项：不能选择自己作为父类目
      filterOptions: ({ id }) => {
        if (id) {
          return {
            id: {
              not_equals: id,
            },
          }
        }
        return true
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
      // 验证：不能选择自己或子孙节点作为父类目
      async ({ data, req, operation, originalDoc }) => {
        if (operation === 'update' && data.parent) {
          const currentId = originalDoc.id

          // 检查是否选择了自己
          if (data.parent === currentId) {
            throw new Error('不能选择自己作为父类目')
          }

          // 检查是否选择了自己的子孙节点（防止循环引用）
          const checkCircular = async (parentId: string): Promise<boolean> => {
            if (parentId === currentId) {
              return true // 发现循环引用
            }

            try {
              const parent = await req.payload.findByID({
                collection: 'categories',
                id: parentId,
              })

              if (parent.parent) {
                // parent.parent 可能是 ID (number/string) 或完整对象
                const parentParentId = typeof parent.parent === 'object'
                  ? String(parent.parent.id)
                  : String(parent.parent)
                return await checkCircular(parentParentId)
              }
            } catch (_error) {
              // 如果查询失败，说明父类目不存在，允许保存
              return false
            }

            return false
          }

          // data.parent 可能是 ID (number/string) 或完整对象
          const parentId = typeof data.parent === 'object'
            ? String(data.parent.id)
            : String(data.parent)
          const hasCircular = await checkCircular(parentId)
          if (hasCircular) {
            throw new Error('不能选择自己的子孙节点作为父类目，这会造成循环引用')
          }
        }

        return data
      },
      // 自动生成 path
      async ({ data, req, operation }) => {
        if (operation === 'create' || operation === 'update') {
          if (data.parent) {
            // data.parent 可能是 ID (number/string) 或完整对象
            const parentId = typeof data.parent === 'object'
              ? String(data.parent.id)
              : String(data.parent)
            const parent = await req.payload.findByID({
              collection: 'categories',
              id: parentId,
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
