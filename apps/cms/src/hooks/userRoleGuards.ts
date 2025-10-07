import type { CollectionBeforeValidateHook } from 'payload/types';
import type { CmsUser, CmsRole } from '../access';
import { isSuperAdmin, isTenantAdmin } from '../access';

const TENANT_ROLES: CmsRole[] = ['tenantAdmin', 'tenantEditor'];

/**
 * 限制非超级管理员只能在租户级角色之间切换。
 */
export const restrictUserRole: CollectionBeforeValidateHook = async ({ data, req, originalDoc }) => {
  const actingUser = req.user as CmsUser | undefined;
  if (!actingUser || isSuperAdmin(actingUser)) {
    return data;
  }

  const nextRole = (data?.role ?? originalDoc?.role) as CmsRole | undefined;

  if (!nextRole) {
    return {
      ...data,
      role: isTenantAdmin(actingUser) ? 'tenantEditor' : actingUser.role
    };
  }

  if (!TENANT_ROLES.includes(nextRole)) {
    return {
      ...data,
      role: isTenantAdmin(actingUser) ? nextRole : 'tenantEditor'
    };
  }

  return {
    ...data,
    role: nextRole
  };
};
