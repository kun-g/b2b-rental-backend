# Payload CMS Collections 设计文档

本文档说明基于 [PRD v0.2](../../docs/prd.md) 设计的 Payload CMS Collections 结构。

## 总览

系统共包含 14 个 Collections，按功能模块分组：

### 1. 账号管理 (1个)
- **Users** - 用户账号体系（包含租方、商户、平台三类角色）

### 2. 平台管理 (1个)
- **Categories** - 类目管理（平台维护，树形结构）

### 3. 商户管理 (4个)
- **Merchants** - 商户信息（入驻、审核、资质）
- **MerchantSKUs** - 商户SKU（商品上架、库存）
- **Devices** - 设备管理（实体设备，绑定SN）
- **ReturnInfo** - 归还信息（商品归还的联系人、电话与地址）
- **ShippingTemplates** - 运费模板（地区定价、不发地区）

### 4. 授信管理 (1个)
- **UserMerchantCredit** - 用户×商户授信关系（额度、状态）

### 5. 订单管理 (4个)
- **Orders** - 订单核心（状态机流转：NEW→PAID→TO_SHIP→SHIPPED→IN_RENT→RETURNING→RETURNED→COMPLETED）
- **Logistics** - 物流信息（发货/回寄单号、签收时间）
- **Payments** - 支付记录（租金、运费）
- **Surcharges** - 附加费用（逾期、改址差额）

### 6. 对账管理 (1个)
- **Statements** - 对账单（订单完成后生成）

### 7. 系统管理 (2个)
- **AuditLogs** - 审计日志（敏感操作留痕）
- **Media** - 媒体文件（图片、文件上传）

---

## Collections 详细说明

### Users (用户账号体系)

**对应 PRD**: 2. 账号体系与权限

**角色类型**:
- `customer` - 用户（租方）
- `merchant_member` - 商户成员
- `merchant_admin` - 商户管理员
- `platform_operator` - 平台运营
- `platform_admin` - 平台管理员
- `platform_support` - 平台客服

**关键字段**:
- `role` - 角色（决定权限）
- `merchant` - 所属商户（商户角色必填）
- `kyc_status` - 认证状态（unverified/pending/verified/rejected）
- `addresses` - 地址簿（用户角色）
- `invoice_info` - 发票信息

**权限逻辑**:
- 用户端：手机号+验证码 / 微信授权登录
- 商户端：手机号+密码 / 手机验证码
- 平台端：账号密码 + 二次验证（可选）

---

### Categories (类目管理)

**对应 PRD**: 3.1 类目

**特点**:
- 树形结构（支持无限层级）
- 自动生成 `path`（如：/电子设备/无人机）
- 平台运营/管理员可维护

**关键字段**:
- `name` - 类目名称
- `parent` - 父类目（留空=顶级）
- `path` - 类目路径（自动生成）
- `sort` - 排序
- `status` - 状态（active/inactive）

---

### Merchants (商户管理)

**对应 PRD**: 2.1 账号类型 - 商户账号

**入驻流程**:
1. 平台发送邀请码/链接
2. 商户接受邀请，填写资料
3. 平台审核（pending→approved/rejected）
4. 通过后可上架SKU

**关键字段**:
- `name` - 商户名称
- `contact` - 联系信息（姓名、电话、邮箱）
- `settlement_account` - 结算账户
- `status` - 状态（pending/approved/rejected/disabled）
- `invitation_code` - 邀请码（自动生成）
- `business_license` - 营业执照

**审核状态**:
- `pending` - 待审核
- `approved` - 已通过（可上架SKU）
- `rejected` - 已拒绝
- `disabled` - 已禁用

---

### MerchantSKUs (商户SKU)

**对应 PRD**: 3.2 商户SKU

**可见性规则**:
- 仅对**有授信**的用户展示
- 上架需要：`is_listed=true` + `listing_status=approved`

**关键字段**:
- `merchant` - 所属商户
- `category` - 所属类目
- `name` - SKU名称
- `daily_fee` - 日租金
- `device_value` - 设备价值（授信参考）
- `inventory_qty` - 库存数量（可租数量）
- `is_listed` - 是否上架
- `listing_status` - 上架状态（draft/pending/approved/rejected）

**权限**:
- 商户可创建/编辑自己的SKU
- 平台可审核SKU上架

---

### Devices (设备管理)

**对应 PRD**: 7 数据模型 device

**语义**: 代表**实体设备**，发货时在订单上绑定 `device_id/SN`

**设备状态**:
- `in_stock` - 在库
- `in_rent` - 租赁中
- `in_transit` - 运输中
- `in_maintenance` - 维修中
- `scrapped` - 已报废

**关键字段**:
- `merchant_sku` - 所属SKU
- `sn` - 设备序列号（唯一）
- `status` - 设备状态
- `current_order` - 当前订单（租赁中时）
- `rental_count` - 累计租赁次数

---

### UserMerchantCredit (授信管理)

**对应 PRD**: 4. 授信与可见性

**维度**: `user × merchant`

**可见性规则**:
- 用户仅能浏览/下单**授信启用**的商户下SKU
- 撤销授信即刻生效，相关SKU**不可见**
- 不影响已创建订单

**关键字段**:
- `user` - 被授信用户
- `merchant` - 授信商户
- `credit_limit` - 授信额度
- `used_credit` - 已用额度（订单冻结，完成后释放）
- `available_credit` - 可用额度（计算字段）
- `status` - 状态（enabled/disabled/frozen）
- `credit_history` - 额度调整历史

**授信流转**:
- 创建：商户管理员授予
- 调整：记录到 `credit_history`
- 撤销：立即生效，设置 `status=disabled`

---

### ShippingTemplates (运费模板)

**对应 PRD**: 6. 计费与运费

**价格优先级**: **不发地区 > 指定地区价 > 默认价**

**关键字段**:
- `merchant` - 所属商户
- `name` - 模板名称
- `version` - 版本号（每次修改自动递增）
- `default_fee` - 默认运费
- `region_rules` - 地区运费规则（数组）
- `blacklist_regions` - 不发地区（命中则下单拦截）
- `is_default` - 是否为商户默认模板

**不发地区豁免**:
- 平台运营可对特例豁免
- 订单记录豁免人、时间、原因

**版本管理**:
- 下单时锁定模板**版本快照**
- 用于追溯运费计算依据

---

### Orders (订单管理)

**对应 PRD**: 5. 订单流程与状态机 v0.3

**状态机流转**:
```
NEW → PAID → TO_SHIP → SHIPPED → IN_RENT → RETURNING → RETURNED → COMPLETED
                 ↓
             CANCELED (仅NEW/PAID可取消)
```

**关键字段**:
- `order_no` - 租赁订单编号（自动生成）
- `pay_no` - 系统内的支付订单编号
- `out_pay_no` - 支付渠道方订单编号
- `user` - 下单用户
- `merchant` - 商户
- `merchant_sku` - 租赁SKU
- `device` - 绑定设备（发货时绑定）
- `status` - 订单状态
- `rent_start_date` / `rent_end_date` - 租期
- `actual_start_date` - 实际计费起点（发货当日次日00:00）
- `daily_fee_snapshot` - 日租金快照
- `shipping_fee_snapshot` - 运费快照
- `credit_hold_amount` - 授信冻结金额（按设备价值）
- `shipping_address` - 收货地址
- `address_change_count` - 改址次数（≤2次）
- `shipping_no` - 发货物流单号
- `return_no` - 归还物流单号

**状态说明**:
- `NEW`: 新订单（未支付）
- `PAID`: 已支付 → **自动流转** → `TO_SHIP`
- `TO_SHIP`: 待发货（用户可改址≤2次）
- `SHIPPED`: 已发货（商户录入物流+SN）
- `IN_RENT`: 租赁中（签收后开始计费）
- `RETURNING`: 归还中（用户录回寄单号）
- `RETURNED`: 已归还（商户签收回寄）
- `COMPLETED`: 已完成（商户确认，生成对账单，释放授信）
- `CANCELED`: 已取消（全额退款，释放授信）

**计费规则**:
- 计费起点：发货当日**次日00:00**（默认UTC+8）
- 逾期：超出租期 → 生成逾期支付单（COMPLETED时支付）
- 逾期金额 = `ceil(逾期小时/24) × 日费率`

**改址规则**:
- 仅 `TO_SHIP` 期可改址，≤2次
- 更贵地区 → 生成补差支付单（未付不可发货）
- 更便宜地区 → 自动退款
- 差额阈值 ≥ 1元

---

### Logistics (物流信息)

**对应 PRD**: 7 数据模型 logistics

**关键字段**:
- `order` - 关联订单
- `ship_no` - 发货物流单号
- `carrier` - 承运商
- `ship_at` - 发货时间
- `sign_at` - 签收时间（API回传优先，或商户确认）
- `return_ship_no` - 回寄物流单号
- `return_sign_at` - 回寄签收时间
- `tracking_events` - 物流轨迹

---

### Payments (支付记录)

**对应 PRD**: 7 数据模型 payment

**关键字段**:
- `order` - 关联订单
- `transaction_no` - 交易流水号
- `amount_rent` - 租金
- `amount_shipping` - 运费
- `amount_total` - 总金额
- `status` - 支付状态（pending/paid/refunded/failed）
- `paid_at` - 支付时间
- `channel` - 支付渠道（wechat/alipay/bank/other）

---

### Surcharges (附加费用)

**对应 PRD**: 7 数据模型 surcharge

**费用类型**:
- `overdue` - 逾期费
- `addr_up` - 改址补差
- `addr_down` - 改址退款

**关键字段**:
- `order` - 关联订单
- `type` - 费用类型
- `amount` - 金额（正数=补收，负数=退款）
- `status` - 状态（pending/paid/refunded）

---

### Statements (对账单)

**对应 PRD**: 7 数据模型 statement

**生成时机**: 订单完成（`COMPLETED`）时自动生成

**关键字段**:
- `statement_no` - 对账单号（自动生成）
- `order` - 关联订单
- `issued_at` - 出单时间
- `amount_rent` - 租金
- `amount_shipping` - 运费
- `amount_overdue` - 逾期费
- `amount_surcharge` - 其他费用（改址差额等）
- `amount_total` - 总金额
- `details_json` - 明细（包含设备SN、关键时间戳等）
- `status` - 状态（issued/confirmed/disputed）

**对账双方**:
- 用户（租方）可查看自己的对账单
- 商户（出方）可查看自己的对账单
- 平台可查看全部对账单

---

### AuditLogs (审计日志)

**对应 PRD**: 9. 运营与风控

**记录范围**:
- 授信调整
- 强制流转（解卡）
- 不发地区豁免
- 商户审核
- SKU审核
- 其他敏感操作

**关键字段**:
- `entity` - 实体类型（order/credit/merchant/sku/user）
- `entity_id` - 实体ID
- `action` - 操作（create/update/delete/force_transition/exempt_blacklist等）
- `operator` - 操作人
- `reason` - 操作原因（敏感操作必填）
- `before_data` / `after_data` - 操作前后数据（JSON）
- `ip_address` / `user_agent` - 请求信息

**权限**:
- 仅平台运营/管理员可查看
- 审计日志不可修改
- 仅平台管理员可删除

---

## 权限矩阵（Collection级别）

| Collection | 用户(租方) | 商户成员 | 商户管理员 | 平台运营 | 平台管理员 |
|-----------|-----------|---------|-----------|---------|-----------|
| **Users** | 读自己 | 读自己 | 读自己 | 读全部 | 全部 |
| **Categories** | 读 | 读 | 读 | 读写 | 读写 |
| **Merchants** | - | 读自家 | 读写自家 | 读写全部 | 全部 |
| **MerchantSKUs** | 读授信的 | 读写自家 | 读写自家 | 读全部 | 全部 |
| **Devices** | - | 读写自家 | 读写自家 | 读全部 | 全部 |
| **UserMerchantCredit** | 读自己的 | 读自家的 | 读写自家的 | 读全部 | 全部 |
| **ShippingTemplates** | - | 读写自家 | 读写自家 | 读全部 | 全部 |
| **Orders** | 读写自己的 | 读写自家的 | 读写自家的 | 读全部 | 全部 |
| **Logistics** | 读自己的 | 读写自家的 | 读写自家的 | 读全部 | 全部 |
| **Payments** | 读自己的 | 读自家的 | 读自家的 | 读全部 | 全部 |
| **Surcharges** | 读自己的 | 读自家的 | 读自家的 | 读全部 | 全部 |
| **Statements** | 读自己的 | 读自家的 | 读自家的 | 读全部 | 全部 |
| **AuditLogs** | - | - | - | 读 | 读写 |
| **Media** | 读写自己的 | 读写 | 读写 | 读写 | 全部 |

---

## 数据关系图

```
Users
  ├─ role: customer ──┐
  ├─ role: merchant_* ──┐
  └─ role: platform_* ──┘
                        │
                        ├─> UserMerchantCredit <── Merchants
                        │                            │
                        │                            ├─> MerchantSKUs ──> Categories
                        │                            │   │
                        │                            │   └─> Devices
                        │                            │
                        │                            └─> ShippingTemplates
                        │
                        └─> Orders ──┬─> Logistics
                                     ├─> Payments
                                     ├─> Surcharges
                                     └─> Statements

AuditLogs (记录所有敏感操作)
```

---

## 开发指南

### 1. 本地开发

```bash
# 安装依赖
pnpm install

# 启动开发服务器
cd apps/cms
pnpm dev

# 生成类型定义
pnpm run generate:types

# 构建
pnpm build
```

### 2. 数据库连接

配置 `.env` 文件：

```env
DATABASE_URI=postgresql://user:password@localhost:5432/database
PAYLOAD_SECRET=your-secret-key
```

### 3. 扩展 Collection

如需新增字段，编辑对应的 Collection 文件：

```typescript
// apps/cms/src/collections/Orders.ts
export const Orders: CollectionConfig = {
  slug: 'orders',
  fields: [
    // 新增字段
    {
      name: 'new_field',
      type: 'text',
      label: '新字段',
    },
  ],
}
```

然后重新生成类型：

```bash
pnpm run generate:types
```

### 4. 自定义 Hooks

所有 Collections 都支持 Payload Hooks：

- `beforeChange` - 数据保存前
- `afterChange` - 数据保存后
- `beforeRead` - 数据读取前
- `afterRead` - 数据读取后
- `beforeDelete` - 数据删除前
- `afterDelete` - 数据删除后

示例：

```typescript
hooks: {
  beforeChange: [
    async ({ data, req, operation }) => {
      // 自定义逻辑
      return data
    },
  ],
}
```

---

## 下一步

1. **配置数据库连接** - 设置 PostgreSQL 连接字符串
2. **创建初始数据** - 创建平台管理员账号、默认类目
3. **测试 Collections** - 在 Payload Admin 中测试 CRUD 操作
4. **实现业务逻辑** - 补充 Hooks 中的 TODO（授信冻结/释放、逾期计算等）
5. **集成支付** - 对接微信支付/支付宝
6. **物流API对接** - 实现物流轨迹自动回传

---

## 参考文档

- [PRD v0.2](../../docs/prd.md) - 产品需求文档
- [Payload CMS 官方文档](https://payloadcms.com/docs)
- [技术架构设计文档](../../docs/技术架构设计文档.md)
