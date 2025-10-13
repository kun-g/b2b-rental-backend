# 🧭 B2B 数据结构（Payload CMS 版，含中文说明）

---

## 1️⃣ Users（用户账号）

| 字段名 | 中文说明 |
|--------|-----------|
| id | 用户ID |
| phone | 手机号 |
| email | 邮箱 |
| role | 角色（customer / merchant_member / merchant_admin / platform_operator / platform_admin / platform_support） |
| merchant | 所属商户（商户角色必填） |
| kyc_status | 认证状态（unverified / pending / verified / rejected） |
| addresses | 地址簿 |
| invoice_info | 发票信息 |
| status | 账号状态（active / disabled） |

---

## 2️⃣ Categories（类目管理）

| 字段名 | 中文说明 |
|--------|-----------|
| name | 类目名称 |
| parent | 父类目ID |
| path | 类目路径（自动生成） |
| sort | 排序号 |
| status | 状态（active / inactive） |

---

## 3️⃣ Merchants（商户信息）

| 字段名 | 中文说明 |
|--------|-----------|
| name | 商户名称 |
| contact | 联系信息对象（姓名、电话、邮箱） |
| settlement_account | 结算账户 |
| status | 状态（pending / approved / rejected / disabled） |
| invitation_code | 邀请码 |
| business_license | 营业执照 |
| address | 商户办公地址 |

---

## 4️⃣ MerchantSKUs（商户SKU）

| 字段名 | 中文说明 |
|--------|-----------|
| merchant | 所属商户 |
| category | 所属类目 |
| name | SKU 名称 |
| daily_fee | 日租金 |
| device_value | 设备价值 |
| inventory_qty | 库存数量 |
| is_listed | 是否上架 |
| listing_status | 上架状态（draft / pending / approved / rejected） |

---

## 5️⃣ Devices（设备管理）

| 字段名 | 中文说明 |
|--------|-----------|
| merchant_sku | 所属 SKU |
| sn | 设备序列号（唯一） |
| status | 设备状态（in_stock / in_rent / in_transit / in_maintenance / scrapped） |
| current_order | 当前绑定订单 |
| rental_count | 累计租赁次数 |

---

## 6️⃣ UserMerchantCredit（用户商户授信）

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

## 7️⃣ ShippingTemplates（运费模板）

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

## 8️⃣ Orders（订单管理）

| 字段名 | 中文说明 |
|--------|-----------|
| order_no | 租赁订单编号（自动生成） |
| pay_no | 系统内支付单号 |
| out_pay_no | 外部支付单号 |
| user | 下单用户 |
| merchant | 商户 |
| merchant_sku | SKU |
| device | 绑定设备 |
| status | 状态（NEW / PAID / TO_SHIP / SHIPPED / IN_RENT / RETURNING / RETURNED / COMPLETED / CANCELED） |
| rent_start_date | 租期起始日 |
| rent_end_date | 租期结束日 |
| actual_start_date | 实际计费起点 |
| daily_fee_snapshot | 日租金快照 |
| shipping_fee_snapshot | 运费快照 |
| credit_hold_amount | 授信冻结金额 |
| order_total_amount | 订单总金额 |
| renter_contact_name | 租赁者联系人姓名 |
| renter_contact_phone | 租赁者联系电话 |
| renter_contact_address | 租赁者收货地址 |
| return_contact_name | 回收联系人姓名 |
| return_contact_phone | 回收联系人电话 |
| return_address | 回收地址 |
| shipping_no | 发货快递单号 |
| return_no | 归还物流单号 |
| address_change_count | 改址次数 |

---

## 9️⃣ Logistics（物流信息）

| 字段名 | 中文说明 |
|--------|-----------|
| order | 关联订单 |
| carrier | 承运商 |
| ship_no | 发货物流单号 |
| ship_at | 发货时间 |
| sign_at | 签收时间 |
| return_ship_no | 回寄物流单号 |
| return_sign_at | 回寄签收时间 |
| tracking_events | 物流轨迹 JSON |

---

## 🔟 Payments（支付记录）

| 字段名 | 中文说明 |
|--------|-----------|
| order | 关联订单 |
| transaction_no | 交易流水号 |
| amount_rent | 租金 |
| amount_shipping | 运费 |
| amount_total | 总金额 |
| status | 支付状态（pending / paid / refunded / failed） |
| paid_at | 支付时间 |
| channel | 支付渠道（wechat / alipay / bank / other） |

---

## 1️⃣1️⃣ Surcharges（附加费用）

| 字段名 | 中文说明 |
|--------|-----------|
| order | 关联订单 |
| type | 费用类型（overdue / addr_up / addr_down） |
| amount | 金额（正数=补收，负数=退款） |
| status | 状态（pending / paid / refunded） |

---

## 1️⃣2️⃣ Statements（对账单）

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

## 1️⃣3️⃣ AuditLogs（审计日志）

| 字段名 | 中文说明 |
|--------|-----------|
| entity | 实体类型（order / credit / merchant / sku / user） |
| entity_id | 实体ID |
| action | 操作行为 |
| operator | 操作人 |
| reason | 操作原因 |
| before_data | 操作前数据 |
| after_data | 操作后数据 |
| ip_address | 操作IP |
| user_agent | 操作设备信息 |
