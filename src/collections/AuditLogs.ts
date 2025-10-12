import type { CollectionConfig } from 'payload'

/**
 * AuditLogs Collection - 审计日志
 * 对应 PRD 7 数据模型 audit_log
 * 记录敏感操作：授信调整、强制流转、豁免等
 */
export const AuditLogs: CollectionConfig = {
  slug: 'audit-logs',
  admin: {
    useAsTitle: 'action',
    defaultColumns: ['entity', 'action', 'operator', 'createdAt'],
    group: '系统管理',
  },
  access: {
    read: ({ req: { user } }) => {
      // 仅平台可查看审计日志
      return user?.role === 'platform_admin' || user?.role === 'platform_operator'
    },
    create: () => true, // 系统自动创建
    update: () => false, // 审计日志不可修改
    delete: ({ req: { user } }) => {
      return user?.role === 'platform_admin'
    },
  },
  fields: [
    {
      name: 'entity',
      type: 'select',
      required: true,
      label: '实体类型',
      options: [
        { label: '订单', value: 'order' },
        { label: '授信', value: 'credit' },
        { label: '商户', value: 'merchant' },
        { label: 'SKU', value: 'sku' },
        { label: '用户', value: 'user' },
        { label: '运费模板', value: 'shipping_template' },
      ],
    },
    {
      name: 'entity_id',
      type: 'text',
      required: true,
      label: '实体ID',
    },
    {
      name: 'action',
      type: 'select',
      required: true,
      label: '操作',
      options: [
        { label: '创建', value: 'create' },
        { label: '更新', value: 'update' },
        { label: '删除', value: 'delete' },
        { label: '强制流转', value: 'force_transition' },
        { label: '豁免不发地区', value: 'exempt_blacklist' },
        { label: '调整授信', value: 'adjust_credit' },
        { label: '撤销授信', value: 'revoke_credit' },
        { label: '审核通过', value: 'approve' },
        { label: '审核拒绝', value: 'reject' },
      ],
    },
    {
      name: 'operator',
      type: 'relationship',
      relationTo: 'users',
      label: '操作人',
    },
    {
      name: 'operator_role',
      type: 'text',
      label: '操作人角色',
      admin: {
        description: '冗余字段，便于查询',
      },
    },
    {
      name: 'reason',
      type: 'textarea',
      label: '操作原因',
      admin: {
        description: '敏感操作必填',
      },
    },
    {
      name: 'before_data',
      type: 'json',
      label: '操作前数据',
      admin: {
        description: '用于追溯',
      },
    },
    {
      name: 'after_data',
      type: 'json',
      label: '操作后数据',
    },
    {
      name: 'ip_address',
      type: 'text',
      label: 'IP地址',
    },
    {
      name: 'user_agent',
      type: 'text',
      label: 'User Agent',
    },
  ],
  timestamps: true,
}
