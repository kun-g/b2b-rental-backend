# 🧭 B2B 数据结构（Payload CMS 版，含中文说明）

## 更新说明
- 10-15更新
	- 增加account的collections，取消原先在uesr中的account类型定义;
 	- payments增加type，可了解每一笔支付订单是正常租赁，还是修改地址亦或是补差价；	
- 10-14更新
	- 结合当前设计，参考原设计对collections进行了更新
https://github.com/kun-g/b2b-rental-backend/blob/main/docs/COLLECTIONS.md
	- 修改了的device的状态
	- 更新了字段命名以及相关内容关联的主键
 	- user增加account(账号类型)，订单管理增加logistics_id（租赁平台的物流ID）
  	- Logistics增加logistics_type区分是发货还是归还
---
## 总览

系统共包含 13 个 Collections，按功能模块分组：

### 1. 账号管理 (2个)
- **Accounts** - 用户账号
- **Users** - 业务账号（包含租方、商户、平台三类角色）

### 2. 商户管理 (5个)
- **Merchants** - 商户信息（入驻、审核、资质）
- **MerchantSKUs** - 商户SKU（商品上架、库存）
- **Devices** - 设备管理（实体设备，绑定SN）
- **ReturnInfo** - 归还信息（商品归还的联系人、电话与地址）
- **ShippingTemplates** - 运费模板（地区定价、不发地区）

### 3. 授信管理 (1个)
- **UserMerchantCredit** - 用户×商户授信关系（额度、状态）

### 4. 订单管理 (3个)
- **Orders** - 订单核心（状态机流转：NEW→PAID→TO_SHIP→SHIPPED→IN_RENT→RETURNING→RETURNED→COMPLETED）
- **Logistics** - 物流信息（发货/回寄单号、签收时间）
- **Payments** - 支付记录（租金、运费）

### 5. 系统管理 (1个)
- **AuditLogs** - 审计日志（敏感操作留痕）

### 6. 平台管理 (1个)
- **Categories** - 类目管理（平台维护，树形结构）
---

## Collections说明

### 1. Accounts（用户账号）

| 字段名 | 中文说明 |
|--------|-----------|
| account_id | 用户的账号ID |
| phone | 手机号 |
| email | 邮箱 |
| user_name| 用户名 |
| password | 密码 |
| status | 账号状态（active / disabled） |

---

### 2. Users（业务账号）

| 字段名 | 中文说明 |
|--------|-----------|
| user_id | 用户在业务后台的ID |
| account_id | 用户的账号ID |
| user_type | 账号类型（merchant、customer、platform） |
| role | 角色（customer / merchant_member / merchant_admin / platform_operator / platform_admin / platform_support） |
| merchant | 所属商户（商户角色必填） |
| last_login_at | 最近登录时间 |
| status | 账号状态（active / disabled） |

---

### 3.  Merchants（商户信息）

| 字段名 | 中文说明 |
|--------|-----------|
| name | 商户名称 |
| contact | 联系信息对象（姓名、电话、邮箱） |
| settlement_account | 结算账户 |
| business_license | 营业执照 |
| address | 商户办公地址 |

---

### 4.  MerchantSKUs（商户SKU）

| 字段名 | 中文说明 |
|--------|-----------|
| merchant | 所属商户 |
| category | 所属类目 |
| name | SKU 名称 |
| daily_fee | 日租金 |
| device_value | 设备价值 |
| inventory_qty | 库存数量 |
| is_listed | 是否上架 |

---

### 5.  Devices（设备管理）

| 字段名 | 中文说明 |
|--------|-----------|
| merchant_sku | 所属 SKU |
| sn | 设备序列号（唯一） |
| status | 设备状态（in_active / used / active） |
| current_order | 当前绑定订单 |
| rental_count | 累计租赁次数 |

---

### 6. ReturnInfo（归还信息）

| 字段名 | 中文说明 |
|--------|-----------|
| merchant | 所属商户 |
| return_contact_name | 回收联系人姓名 |
| return_contact_phone | 回收联系人电话 |
| return_address | 回收地址 |
| status | 状态（active / in_active） |

---

### 7.  ShippingTemplates（运费模板）

| 字段名 | 中文说明 |
|--------|-----------|
| merchant | 所属商户 |
| name | 模板名称 |
| version | 模板版本号 |
| default_fee | 默认运费 |
| region_rules | 地区运费规则（JSON 数组） |
| blacklist_regions | 不发地区 |
| is_default | 是否默认模板 |

---

### 8.  UserMerchantCredit（用户商户授信）

| 字段名 | 中文说明 |
|--------|-----------|
| user | 用户 |
| merchant | 商户 |
| credit_limit | 授信额度 |
| used_credit | 已用额度 |
| available_credit | 可用额度 |
| status | 状态（enabled / disabled / frozen） |
| credit_history | 授信调整记录（JSON） |

---

### 9.  Orders（订单管理）

| 字段名 | 中文说明 |
|--------|-----------|
| order_no | 租赁订单编号（自动生成） |
| transaction_no | 交易流水号 |
| out_pay_no | 外部支付单号 |
| logistics_id | 租赁平台的物流ID |
| customer | 下单用户 |
| merchant | 商户 |
| merchant_sku | SKU |
| device | 绑定设备 |
| status | 状态（NEW / PAID / TO_SHIP / SHIPPED / IN_RENT / RETURNING / RETURNED / COMPLETED / CANCELED） |
| shipping_date | 发货时间 |
| rent_end_date | 租期结束日 |
| order_creat_at | 租赁订单创建时间 |
| daily_fee_snapshot | 日租金快照 |
| shipping_fee_snapshot | 运费快照 |
| credit_hold_amount | 授信冻结金额 |
| order_total_amount | 订单总金额 |
| renter_contact_name | 租赁者联系人姓名 |
| renter_contact_phone | 租赁者联系电话 |
| renter_contact_address | 租赁者收货地址 |
| return_contact_name | 归还联系人姓名 |
| return_contact_phone | 归还联系人电话 |
| return_address | 归还地址 |
| shipping_no | 发货快递单号 |
| return_no | 归还物流单号 |

---

### 10.  Logistics（物流信息）

| 字段名 | 中文说明 |
|--------|-----------|
| logistics_id | 租赁平台的物流ID |
| order_no | 租赁订单编号 |
| arrier | 物流承运商 |
| logistics_no | 物流单号 |
| ship_at | 发货时间 |
| logistics_type| 物流类型（发货，归还） |

---

### 11.  Payments（支付记录）

| 字段名 | 中文说明 |
|--------|-----------|
| transaction_no | 交易流水号 |
| order_no | 租赁订单编号（自动生成） |
| out_pay_no | 外部支付单号 |
| amount | 金额（正数为补收，负数为退款） |
| type | 订单类型（rent / overdue / addr_up / addr_down） |
| status | 支付状态（pending / paid / refunded / failed） |
| pay_creat_at| 支付订单创建时间 |
| paid_at | 支付时间 |
| channel | 支付渠道（wechat / alipay / bank / other） |

---

### 12.  AuditLogs（审计日志）

| 字段名 | 中文说明 |
|--------|-----------|
| entity | 实体类型（order / credit / merchant / sku / user） |
| entity_id | 实体ID |
| action | 操作行为 |
| operator | 操作人 |
| time | 操作时间 |
| reason | 操作原因 |
| before_data | 操作前数据 |
| after_data | 操作后数据 |
| ip_address | 操作IP |
| user_agent | 操作设备信息 |

---

## 13.  Categories（类目管理）

| 字段名 | 中文说明 |
|--------|-----------|
| name | 类目名称 |
| parent | 父类目ID |
| path | 类目路径（自动生成） |
| sort | 排序号 |
| status | 状态（active / in_active） |

---
## 以下为后续规划的内容
---

###  Statements（对账单）

| 字段名 | 中文说明 |
|--------|-----------|
| statement_no | 对账单号 |
| order | 关联订单 |
| issued_at | 出单时间 |
| amount_rent | 租金 |
| amount_shipping | 运费 |
| amount_overdue | 逾期费 |
| amount_surcharge | 其他费用 |
| amount_total | 总金额 |
| details_json | 明细（JSON） |
| status | 状态（issued / confirmed / disputed） |

---

###  Surcharges（附加费用）

| 字段名 | 中文说明 |
|--------|-----------|
| transaction_no | 交易流水号 |
| type | 费用类型（overdue / addr_up / addr_down） |
| amount | 金额（正数=补收，负数=退款） |
| status | 状态（pending / paid / refunded） |
