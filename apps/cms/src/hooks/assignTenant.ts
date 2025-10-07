import type { CollectionBeforeValidateHook } from 'payload/types';
import type { CmsUser } from '../access';
import { getUserTenantId, isSuperAdmin } from '../access';

/**
 * 在租户上下文中创建或更新文档时，自动把当前用户的租户写入指定字段。
 */
export const assignCurrentTenant = (fieldName: string): CollectionBeforeValidateHook => async ({
  data,
  req
}) => {
  const user = req.user as CmsUser | undefined;
  if (!user || isSuperAdmin(user)) {
    return data;
  }

  const tenantId = getUserTenantId(user);
  if (!tenantId) {
    throw new Error('当前用户未关联租户，无法保存租户相关数据');
  }

  return {
    ...data,
    [fieldName]: tenantId
  };
};

/**
 * 针对用户集合的特殊 Hook：创建时默认赋予租户，全局更新时保持原值或强制写回当前租户。
 */
export const enforceUserTenant: CollectionBeforeValidateHook = async ({ data, req }) => {
  const user = req.user as CmsUser | undefined;
  if (!user || isSuperAdmin(user)) {
    return data;
  }

  const tenantId = getUserTenantId(user);
  if (!tenantId) {
    throw new Error('当前用户未关联租户，无法维护用户列表');
  }

  return {
    ...data,
    tenant: tenantId
  };
};
