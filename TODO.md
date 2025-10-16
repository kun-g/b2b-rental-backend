# CMS 开发 TODO

## 已完成 ✅


## 待完成 🚧

### 优先级 P0（必须完成）

#### 1. Collections 字段对齐（基于文档 B2B_Collections_WithDesc.md）

**Orders Collection 字段补充**（影响核心业务流程）
- [x] ~~添加 `return_contact_name`~~ - 已存在于 return_address group 中
- [x] ~~添加 `return_contact_phone`~~ - 已存在于 return_address group 中
- [x] ~~添加 `return_address`~~ - 已完成（group 形式，Orders.ts:342-381）
- [x] ~~添加 `transaction_no`~~ - 已移除冗余字段，改为通过 payments 关系获取多个交易流水号
- [x] ~~添加 `out_pay_no`~~ - 已完成（Orders.ts:104-110）
- [x] ~~添加 `shipping_date`~~ - 已完成（Orders.ts:174-183）
- [x] ~~重命名 `shipping_fee` → `shipping_fee_snapshot`~~（保持现有命名）
- [x] **拆分 logistics 字段** - 改为 shipping_logistics 和 return_logistics（Orders.ts:383-399）

**Payments Collection 字段补充**
- [x] 添加 `out_pay_no` - 外部支付单号（已完成，Payments.ts:71-77）
- [x] 添加 `type` - 支付类型（rent / overdue / addr_up / addr_down）（已完成，Payments.ts:79-93）
- [x] 添加 `amount` - 统一金额字段，支持正负（已完成，Payments.ts:95-102）
- [x] 添加 `amount_detail` group - 金额明细（rent + shipping）（已完成，Payments.ts:104-125）
- [x] ~~添加 `pay_creat_at`~~ - 已完成，支付订单创建时间（Payments.ts:140-150）
- [x] 重构为统一支付模型（整合 Surcharges 功能）（已完成）

**Logistics Collection 字段补充**
- [x] ~~添加 `logistics_type`~~ - 已完成（shipping / return，Logistics.ts:72-83）
- [x] ~~评估是否拆分发货/归还为两条记录~~ - 已决策：拆分为两条记录，通过 logistics_type 区分

**设计文档同步**
- [x] ~~更新 `docs/B2B_Collections_WithDesc.md`~~ - 已完成字段对齐和拼写修正
  - [x] Statements 已实现（src/collections/Statements.ts）
  - [x] Surcharges 功能已整合到 Payments.type 中
  - [x] Accounts/Users 已分离实现（src/collections/Accounts.ts + users.ts）
  - [x] Payments 已重构为统一支付模型（type + amount + amount_detail）
  - [x] ~~Orders 归还地址字段~~ - 已存在（return_address group）
  - [x] ~~Logistics logistics_type 字段~~ - 已实现（shipping / return）
  - [x] ~~修正 Logistics 拼写错误~~ - arrier → carrier
  - [x] ~~ReturnInfo 状态值统一~~ - inactive → disabled

#### 2. 业务逻辑补充
- [ ] **授信管理**（优先级高，影响下单流程）
  - [ ] 订单创建时冻结授信额度（已记录 credit_hold_amount，需实际扣减 UserMerchantCredit.used_credit）
  - [ ] 订单完成/取消时释放授信额度（有 Hook 占位，需实现逻辑）
  - [ ] 授信额度不足时阻止下单（需在订单创建前验证）
- [ ] **订单状态机**
  - [ ] 完善状态流转验证（如 SHIPPED 不能回退到 TO_SHIP）
  - [x] ~~实现 PAID → TO_SHIP 自动流转~~（已完成）
  - [ ] 实现逾期计算和逾期支付单生成
- [ ] **运费计算**
  - [x] ~~下单时根据地址和模板计算运费~~（已完成）
  - [ ] 改址时计算运费差额
  - [x] ~~不发地区拦截逻辑~~（已完成）
- [ ] **对账单生成**
  - [ ] 订单完成时自动生成对账单
  - [ ] 对账单包含所有费用明细

#### 3. 权限细化
- [ ] 实现商户成员细粒度权限（仓配、运营、财务等角色）
- [ ] 实现平台客服只读权限
- [ ] 实现敏感操作二次确认（授信调整、强制流转等）

### 优先级 P1（重要）

#### 4. 数据验证
- [ ] 订单金额计算验证（租金+运费+逾期+改址）
- [ ] 租期日期验证（结束日期 > 开始日期）
- [ ] 库存数量验证（下单时检查库存）
- [ ] 改址次数限制验证（≤2次）
- [ ] 手机号格式验证

#### 5. 审计日志
- [ ] 实现自动记录敏感操作
  - 授信调整
  - 强制流转
  - 不发地区豁免
  - 商户审核
  - SKU审核
- [ ] 记录操作人IP和User Agent

#### 6. UI优化
- [ ] 自定义订单详情页面（显示状态流转时间线）
- [ ] 自定义授信管理页面（显示额度使用情况）
- [ ] 自定义对账单页面（支持导出PDF/Excel）

### 优先级 P1.5（架构评估）

#### 7. 数据模型一致性评估
- [x] **Orders ↔ Logistics 关联设计** ✅ 已完成
  - 现在：双向关联优化（Orders.shipping_logistics + Orders.return_logistics + Logistics.order）
  - Orders 分别关联发货和归还两条物流记录（shipping_logistics / return_logistics）
  - Logistics 通过 order 字段反向关联订单
  - 通过 logistics_type 字段区分物流类型（shipping / return）
- [x] **Payments ↔ Surcharges 合并** ✅ 已完成
  - Surcharges 功能已整合到 Payments.type 中
  - 统一支付模型：通过 type 区分（rent/overdue/addr_up/addr_down）
  - Surcharges Collection 保留（可选移除）
- [x] **Logistics 发货/归还拆分评估** ✅ 已完成
  - 已决策：拆分为两条记录，通过 logistics_type 区分（shipping / return）
  - Orders 中分别关联：shipping_logistics 和 return_logistics
  - 每条 Logistics 记录包含：logistics_id, order_no, carrier, logistics_no, ship_at, logistics_type
- [x] **Accounts/Users 分离** ✅ 已完成
  - 已分离为两个 Collection（Accounts 负责登录，Users 负责业务身份）
  - Accounts: 登录凭证（phone/email/user_name + password）
  - Users: 业务身份（user_type + role + merchant）
  - 支持一个 Account 关联多个 User（不同业务身份）

### 优先级 P2（可选）

#### 8. 支付集成
- [ ] 集成微信支付
- [ ] 集成支付宝
- [ ] 实现支付回调处理
- [ ] 实现退款逻辑

#### 9. 物流集成
- [ ] 对接物流API（顺丰、德邦等）
- [ ] 实现物流轨迹自动回传
- [ ] 实现签收自动确认
- [ ] 物流异常提醒

#### 10. 通知系统
- [ ] 邮件通知（订单状态变更、审核结果等）
- [ ] 短信通知（订单确认、发货提醒等）
- [ ] 站内消息

#### 11. 报表统计
- [ ] 商户订单统计（成交笔数、金额、租赁率）
- [ ] 用户消费统计
- [ ] 设备利用率统计
- [ ] 逾期分析

#### 12. 批量操作
- [ ] 批量导入SKU
- [ ] 批量导入设备
- [ ] 批量导出订单
- [ ] 批量导出对账单

#### 13. 高级功能
- [ ] SKU 租期日历（显示可租时段）
- [ ] 设备二维码生成与扫码管理
- [ ] 发票管理
- [ ] 商户结算自动化

---

## 技术债务 🔧

### 代码优化
- [ ] 因为Account和User分开，现在鉴权要执行两次

### 测试
- [ ] 单元测试（Collection Hooks）
- [ ] 集成测试（权限控制）
- [ ] E2E 测试（关键业务流程）

### 文档
- [ ] API 文档（GraphQL Schema）
- [ ] 部署文档
- [ ] 运维手册
- [ ] Collections 设计文档同步（详见 P0-1 设计文档同步任务）

---

## 开发规范

### Git Commit 规范
```
feat: 新功能
fix: 修复bug
docs: 文档更新
refactor: 重构
test: 测试
chore: 构建/工具链
```

### 分支策略
- `main` - 生产环境
- `develop` - 开发环境
- `feature/*` - 功能分支
- `hotfix/*` - 紧急修复

### Code Review
- 所有 PR 需要至少 1 人 Review
- 关键功能需要 2 人 Review

---

## 部署清单

### 环境变量
```env
# 数据库
DATABASE_URI=postgresql://...

# Payload
PAYLOAD_SECRET=your-secret-key
PAYLOAD_PUBLIC_SERVER_URL=https://your-domain.com

# 支付（可选）
WECHAT_PAY_APP_ID=
WECHAT_PAY_MERCHANT_ID=
ALIPAY_APP_ID=

# 物流（可选）
SF_EXPRESS_APP_ID=
SF_EXPRESS_APP_SECRET=

# 通知（可选）
SMTP_HOST=
SMTP_PORT=
SMTP_USER=
SMTP_PASS=

SMS_ACCESS_KEY_ID=
SMS_ACCESS_KEY_SECRET=
```

### 数据库迁移
```bash
# 运行迁移
pnpm run db:migrate

# Seed 初始数据
pnpm run db:seed
```

### 构建部署
```bash
# 构建
pnpm build

# 启动
pnpm start
```

---
