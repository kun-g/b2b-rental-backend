import type { Access, FieldAccess } from 'payload/types';

/**
 * CMS 用户角色定义。
 */
export type CmsRole = 'superAdmin' | 'tenantAdmin' | 'tenantEditor';

/**
 * Payload 默认会把用户信息挂载在 req.user 上，这里补充自定义字段的类型。
 */
export interface CmsUser {
  id: string;
  email?: string;
  role: CmsRole;
  tenant?: string | null;
}

const asCmsUser = (user: unknown): CmsUser | undefined => {
  if (!user || typeof user !== 'object') {
    return undefined;
  }
  const candidate = user as Partial<CmsUser>;
  if (!candidate.role) {
    return undefined;
  }
  return candidate as CmsUser;
};

export const isSuperAdmin = (user?: CmsUser | null): boolean => user?.role === 'superAdmin';
export const isTenantAdmin = (user?: CmsUser | null): boolean => user?.role === 'tenantAdmin';
export const isTenantEditor = (user?: CmsUser | null): boolean => user?.role === 'tenantEditor';

/**
 * 读取权限：超级管理员读取全部，其余角色限定在所属租户。
 */
export const tenantScopedReadAccess: Access = ({ req }) => {
  const user = asCmsUser(req.user);
  if (!user) return false;
  if (isSuperAdmin(user)) return true;
  if (!user.tenant) return false;
  return {
    tenant: {
      equals: user.tenant
    }
  };
};

/**
 * 管理权限：超级管理员读取/修改全部，租户管理员限定在所属租户。
 */
export const tenantScopedManageAccess: Access = ({ req }) => {
  const user = asCmsUser(req.user);
  if (!user) return false;
  if (isSuperAdmin(user)) return true;
  if (!user.tenant || !isTenantAdmin(user)) {
    return false;
  }
  return {
    tenant: {
      equals: user.tenant
    }
  };
};

/**
 * 协作权限：允许管理员和编辑在租户内进行内容操作。
 */
export const tenantScopedCollaboratorAccess: Access = ({ req }) => {
  const user = asCmsUser(req.user);
  if (!user) return false;
  if (isSuperAdmin(user)) return true;
  if (!user.tenant || !(isTenantAdmin(user) || isTenantEditor(user))) {
    return false;
  }
  return {
    tenant: {
      equals: user.tenant
    }
  };
};

/**
 * 仅超级管理员可访问（用于 Tenants 表管理等）。
 */
export const superAdminOnlyAccess: Access = ({ req }) => {
  const user = asCmsUser(req.user);
  return !!user && isSuperAdmin(user);
};

/**
 * 判断是否登录。
 */
export const authenticatedAccess: Access = ({ req }) => !!asCmsUser(req.user);

/**
 * 创建权限（租户管理员级别）。
 */
export const tenantAdminCreateAccess: Access = ({ req }) => {
  const user = asCmsUser(req.user);
  if (!user) return false;
  if (isSuperAdmin(user)) return true;
  return !!user.tenant && isTenantAdmin(user);
};

/**
 * 创建权限（租户内容协作者，管理员/编辑可创建）。
 */
export const tenantCollaboratorCreateAccess: Access = ({ req }) => {
  const user = asCmsUser(req.user);
  if (!user) return false;
  if (isSuperAdmin(user)) return true;
  return !!user.tenant && (isTenantAdmin(user) || isTenantEditor(user));
};

/**
 * 用于字段层面的权限：仅超级管理员可编辑。
 */
export const fieldSuperAdminOnly: FieldAccess = ({ req }) => {
  const user = asCmsUser(req.user);
  return !!user && isSuperAdmin(user);
};

/**
 * 用于字段层面的权限：租户管理员可编辑，编辑只读。
 */
export const fieldTenantAdminWritable: FieldAccess = ({ req }) => {
  const user = asCmsUser(req.user);
  if (!user) return false;
  if (isSuperAdmin(user)) return true;
  return isTenantAdmin(user);
};

export const getUserTenantId = (user?: CmsUser | null): string | null => user?.tenant ?? null;

/**
 * 租户维度：超级管理员查看全部，非超级管理员仅能查看自己的租户记录。
 */
export const tenantSelfOrSuperAdminAccess: Access = ({ req }) => {
  const user = asCmsUser(req.user);
  if (!user) return false;
  if (isSuperAdmin(user)) return true;
  if (!user.tenant) return false;
  return {
    id: {
      equals: user.tenant
    }
  };
};
