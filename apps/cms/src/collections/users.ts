import type { CollectionConfig } from 'payload/types';
import {
  authenticatedAccess,
  fieldSuperAdminOnly,
  fieldTenantAdminWritable,
  tenantAdminCreateAccess,
  tenantScopedManageAccess,
  tenantScopedReadAccess
} from '../access';
import { enforceUserTenant } from '../hooks/assignTenant';
import { restrictUserRole } from '../hooks/userRoleGuards';

export const Users: CollectionConfig = {
  slug: 'users',
  auth: true,
  admin: {
    useAsTitle: 'email',
    group: '租户管理',
    defaultColumns: ['email', 'role', 'tenant', 'updatedAt']
  },
  access: {
    admin: authenticatedAccess,
    read: tenantScopedReadAccess,
    create: tenantAdminCreateAccess,
    update: tenantScopedManageAccess,
    delete: tenantScopedManageAccess
  },
  hooks: {
    beforeValidate: [enforceUserTenant, restrictUserRole]
  },
  fields: [
    {
      name: 'displayName',
      label: '显示名称',
      type: 'text'
    },
    {
      name: 'role',
      label: '角色',
      type: 'select',
      defaultValue: 'tenantEditor',
      options: [
        {
          label: '超级管理员',
          value: 'superAdmin'
        },
        {
          label: '租户管理员',
          value: 'tenantAdmin'
        },
        {
          label: '租户编辑',
          value: 'tenantEditor'
        }
      ],
      required: true,
      admin: {
        description: '超级管理员仅能由超级管理员分配。'
      },
      access: {
        read: authenticatedAccess,
        create: fieldTenantAdminWritable,
        update: fieldTenantAdminWritable
      }
    },
    {
      name: 'tenant',
      label: '所属租户',
      type: 'relationship',
      relationTo: 'tenants',
      required: false,
      access: {
        read: authenticatedAccess,
        create: fieldSuperAdminOnly,
        update: fieldSuperAdminOnly
      },
      admin: {
        description: '租户管理员创建成员时系统会自动关联自身租户。'
      }
    }
  ]
};
