/**
 * 业务错误码枚举
 * 用于前后端统一的错误类型标识
 */
export enum BusinessErrorCode {
  // 通用错误 (1000-1999)
  UNKNOWN_ERROR = 'UNKNOWN_ERROR',
  VALIDATION_ERROR = 'VALIDATION_ERROR',
  NOT_FOUND = 'NOT_FOUND',
  UNAUTHORIZED = 'UNAUTHORIZED',
  FORBIDDEN = 'FORBIDDEN',

  // 用户相关 (2000-2999)
  USER_NOT_FOUND = 'USER_NOT_FOUND',
  INVALID_USER_ROLE = 'INVALID_USER_ROLE',
  USER_ALREADY_EXISTS = 'USER_ALREADY_EXISTS',
  USER_ROLE_DUPLICATE = 'USER_ROLE_DUPLICATE',

  // 授信相关 (3000-3999)
  CREDIT_NOT_FOUND = 'CREDIT_NOT_FOUND',
  CREDIT_INSUFFICIENT = 'CREDIT_INSUFFICIENT',
  CREDIT_INVALID_USER_ROLE = 'CREDIT_INVALID_USER_ROLE',
  CREDIT_ALREADY_EXISTS = 'CREDIT_ALREADY_EXISTS',
  CREDIT_INCREMENTED = 'CREDIT_INCREMENTED', // 授信额度已累加（成功状态）

  // 订单相关 (4000-4999)
  ORDER_NOT_FOUND = 'ORDER_NOT_FOUND',
  ORDER_INVALID_STATUS = 'ORDER_INVALID_STATUS',
  ORDER_CANNOT_CANCEL = 'ORDER_CANNOT_CANCEL',

  // 商户相关 (5000-5999)
  MERCHANT_NOT_FOUND = 'MERCHANT_NOT_FOUND',
  MERCHANT_DISABLED = 'MERCHANT_DISABLED',

  // SKU/设备相关 (6000-6999)
  SKU_NOT_FOUND = 'SKU_NOT_FOUND',
  SKU_UNAVAILABLE = 'SKU_UNAVAILABLE',
  DEVICE_NOT_FOUND = 'DEVICE_NOT_FOUND',
  DEVICE_UNAVAILABLE = 'DEVICE_UNAVAILABLE',

  // 地址相关 (7000-7999)
  ADDRESS_PARSE_FAILED = 'ADDRESS_PARSE_FAILED',
  ADDRESS_INVALID = 'ADDRESS_INVALID',

  // 分类相关 (8000-8999)
  CATEGORY_CIRCULAR_REFERENCE = 'CATEGORY_CIRCULAR_REFERENCE',
  CATEGORY_INVALID_PARENT = 'CATEGORY_INVALID_PARENT',
}

/**
 * 业务错误类
 * 简单的 Error 子类，Payload 会提取 message 字段返回给前端
 */
export class BusinessError extends Error {
  code: BusinessErrorCode
  userMessage: string  // 前端显示给用户的消息
  details?: unknown    // 额外的错误详情（仅用于后端日志）
  status: number = 400
  isPublic: boolean = true

  constructor(
    code: BusinessErrorCode,
    userMessage: string,
    details?: unknown,
  ) {
    // message 设置为包含 code 的消息
    // 使用特殊格式使前端能够解析 code
    super(`[${code}] ${userMessage}`)

    this.name = 'BusinessError'
    this.code = code
    this.userMessage = userMessage
    this.details = details

    // 后端日志（使用 console.error 时会显示）
    if (details) {
      console.error(`[${code}] ${userMessage}`, details)
    }
  }
}

/**
 * 错误消息模板
 * 提供常用的用户友好错误消息
 */
export const ErrorMessages = {
  // 用户相关
  USER_NOT_FOUND: '用户不存在',
  INVALID_USER_ROLE: (role: string) => `该操作仅适用于特定角色的用户，当前角色: ${role}`,
  USER_ROLE_DUPLICATE: (role: string) => `该账号已存在 ${role} 角色，不能重复创建`,
  CREDIT_INVALID_USER_ROLE: '只能为普通用户（customer）创建授信',

  // 授信相关
  CREDIT_NOT_FOUND: '授信记录不存在',
  CREDIT_INSUFFICIENT: '授信额度不足',
  CREDIT_ALREADY_EXISTS: '该用户已存在授信记录',
  CREDIT_INCREMENTED: (oldLimit: number, newLimit: number, addAmount: number) =>
    `授信额度已累加：从 ${oldLimit}元 增加到 ${newLimit}元（新增 ${addAmount}元）`,

  // 订单相关
  ORDER_NOT_FOUND: '订单不存在',
  ORDER_INVALID_STATUS: (status: string) => `当前订单状态不允许该操作，当前状态: ${status}`,
  ORDER_CANNOT_CANCEL: '订单无法取消',

  // 商户相关
  MERCHANT_NOT_FOUND: '商户不存在',
  MERCHANT_DISABLED: '商户已被禁用',

  // SKU/设备相关
  SKU_NOT_FOUND: 'SKU不存在',
  SKU_UNAVAILABLE: 'SKU暂时无法租赁',
  DEVICE_NOT_FOUND: '设备不存在',
  DEVICE_UNAVAILABLE: '设备暂时不可用',

  // 地址相关
  ADDRESS_PARSE_FAILED: '地址解析失败，请检查地址格式',
  ADDRESS_INVALID: '地址信息不完整或格式错误',

  // 分类相关
  CATEGORY_CIRCULAR_REFERENCE: '不能选择自己的子孙节点作为父类目',
  CATEGORY_INVALID_PARENT: '不能选择自己作为父类目',
}

/**
 * 快捷错误创建函数
 */
export const createError = {
  // 用户相关
  userNotFound: (details?: unknown) =>
    new BusinessError(BusinessErrorCode.USER_NOT_FOUND, ErrorMessages.USER_NOT_FOUND, details),

  invalidUserRole: (role: string, details?: unknown) =>
    new BusinessError(BusinessErrorCode.INVALID_USER_ROLE, ErrorMessages.INVALID_USER_ROLE(role), details),

  userRoleDuplicate: (role: string, details?: unknown) =>
    new BusinessError(BusinessErrorCode.USER_ROLE_DUPLICATE, ErrorMessages.USER_ROLE_DUPLICATE(role), details),

  creditInvalidUserRole: (role: string) =>
    new BusinessError(
      BusinessErrorCode.CREDIT_INVALID_USER_ROLE,
      ErrorMessages.CREDIT_INVALID_USER_ROLE,
      { actualRole: role }
    ),

  // 授信相关
  creditNotFound: (details?: unknown) =>
    new BusinessError(BusinessErrorCode.CREDIT_NOT_FOUND, ErrorMessages.CREDIT_NOT_FOUND, details),

  creditInsufficient: (details?: unknown) =>
    new BusinessError(BusinessErrorCode.CREDIT_INSUFFICIENT, ErrorMessages.CREDIT_INSUFFICIENT, details),

  creditAlreadyExists: (details?: unknown) =>
    new BusinessError(BusinessErrorCode.CREDIT_ALREADY_EXISTS, ErrorMessages.CREDIT_ALREADY_EXISTS, details),

  creditIncremented: (oldLimit: number, newLimit: number, addAmount: number, details?: unknown) =>
    new BusinessError(
      BusinessErrorCode.CREDIT_INCREMENTED,
      ErrorMessages.CREDIT_INCREMENTED(oldLimit, newLimit, addAmount),
      details
    ),

  // 订单相关
  orderNotFound: (details?: unknown) =>
    new BusinessError(BusinessErrorCode.ORDER_NOT_FOUND, ErrorMessages.ORDER_NOT_FOUND, details),

  orderInvalidStatus: (status: string, details?: unknown) =>
    new BusinessError(BusinessErrorCode.ORDER_INVALID_STATUS, ErrorMessages.ORDER_INVALID_STATUS(status), details),

  orderCannotCancel: (details?: unknown) =>
    new BusinessError(BusinessErrorCode.ORDER_CANNOT_CANCEL, ErrorMessages.ORDER_CANNOT_CANCEL, details),

  // 商户相关
  merchantNotFound: (details?: unknown) =>
    new BusinessError(BusinessErrorCode.MERCHANT_NOT_FOUND, ErrorMessages.MERCHANT_NOT_FOUND, details),

  merchantDisabled: (details?: unknown) =>
    new BusinessError(BusinessErrorCode.MERCHANT_DISABLED, ErrorMessages.MERCHANT_DISABLED, details),

  // SKU/设备相关
  skuNotFound: (details?: unknown) =>
    new BusinessError(BusinessErrorCode.SKU_NOT_FOUND, ErrorMessages.SKU_NOT_FOUND, details),

  skuUnavailable: (details?: unknown) =>
    new BusinessError(BusinessErrorCode.SKU_UNAVAILABLE, ErrorMessages.SKU_UNAVAILABLE, details),

  deviceNotFound: (details?: unknown) =>
    new BusinessError(BusinessErrorCode.DEVICE_NOT_FOUND, ErrorMessages.DEVICE_NOT_FOUND, details),

  deviceUnavailable: (details?: unknown) =>
    new BusinessError(BusinessErrorCode.DEVICE_UNAVAILABLE, ErrorMessages.DEVICE_UNAVAILABLE, details),

  // 地址相关
  addressParseFailed: (details?: unknown) =>
    new BusinessError(BusinessErrorCode.ADDRESS_PARSE_FAILED, ErrorMessages.ADDRESS_PARSE_FAILED, details),

  addressInvalid: (details?: unknown) =>
    new BusinessError(BusinessErrorCode.ADDRESS_INVALID, ErrorMessages.ADDRESS_INVALID, details),

  // 分类相关
  categoryCircularReference: (details?: unknown) =>
    new BusinessError(BusinessErrorCode.CATEGORY_CIRCULAR_REFERENCE, ErrorMessages.CATEGORY_CIRCULAR_REFERENCE, details),

  categoryInvalidParent: (details?: unknown) =>
    new BusinessError(BusinessErrorCode.CATEGORY_INVALID_PARENT, ErrorMessages.CATEGORY_INVALID_PARENT, details),
}

/**
 * 统一的错误处理函数
 * 用于 Payload hooks 中捕获和转换错误
 */
export function handleBusinessError(error: unknown): never {
  if (error instanceof BusinessError) {
    // 已经是业务错误，直接重新抛出
    throw error
  }

  // 未知错误，包装为通用错误
  const message = error instanceof Error ? error.message : '未知错误'
  throw new BusinessError(
    BusinessErrorCode.UNKNOWN_ERROR,
    '操作失败，请稍后重试',
    { originalMessage: message }
  )
}
