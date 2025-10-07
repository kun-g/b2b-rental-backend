import type { CollectionConfig } from 'payload/types';
import {
  fieldSuperAdminOnly,
  tenantCollaboratorCreateAccess,
  tenantScopedCollaboratorAccess,
  tenantScopedManageAccess,
  tenantScopedReadAccess
} from '../access';
import { assignCurrentTenant } from '../hooks/assignTenant';

export const TenantPages: CollectionConfig = {
  slug: 'tenant-pages',
  admin: {
    useAsTitle: 'title',
    group: '内容管理',
    defaultColumns: ['title', 'tenant', 'updatedAt', '_status']
  },
  versions: {
    drafts: true,
    maxPerDoc: 10
  },
  access: {
    read: tenantScopedReadAccess,
    create: tenantCollaboratorCreateAccess,
    update: tenantScopedCollaboratorAccess,
    delete: tenantScopedManageAccess
  },
  hooks: {
    beforeValidate: [assignCurrentTenant('tenant')]
  },
  fields: [
    {
      name: 'title',
      label: '标题',
      type: 'text',
      required: true
    },
    {
      name: 'slug',
      label: '页面地址',
      type: 'text',
      required: true,
      unique: true,
      admin: {
        description: '建议使用短横线连接的小写英文，例如：index 或 rental-guide。'
      }
    },
    {
      name: 'tenant',
      label: '所属租户',
      type: 'relationship',
      relationTo: 'tenants',
      required: true,
      access: {
        read: tenantScopedReadAccess,
        create: fieldSuperAdminOnly,
        update: fieldSuperAdminOnly
      }
    },
    {
      name: 'summary',
      label: '摘要',
      type: 'textarea'
    },
    {
      name: 'content',
      label: '内容',
      type: 'richText'
    },
    {
      name: 'publishDate',
      label: '建议发布日期',
      type: 'date'
    }
  ]
};
