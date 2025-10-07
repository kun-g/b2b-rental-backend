import type { CollectionConfig } from 'payload/types';
import { superAdminOnlyAccess, tenantSelfOrSuperAdminAccess } from '../access';

export const Tenants: CollectionConfig = {
  slug: 'tenants',
  admin: {
    useAsTitle: 'name',
    group: '租户管理',
    defaultColumns: ['name', 'code', 'createdAt']
  },
  access: {
    read: tenantSelfOrSuperAdminAccess,
    create: superAdminOnlyAccess,
    update: superAdminOnlyAccess,
    delete: superAdminOnlyAccess
  },
  timestamps: true,
  fields: [
    {
      name: 'name',
      label: '租户名称',
      type: 'text',
      required: true
    },
    {
      name: 'code',
      label: '租户标识',
      type: 'text',
      required: true,
      unique: true,
      admin: {
        description: '必须全局唯一，可与 Core 服务中的租户 ID 对齐。'
      }
    },
    {
      name: 'description',
      label: '备注',
      type: 'textarea'
    }
  ]
};
