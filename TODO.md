# CMS 开发 TODO

## 已完成 ✅

- [x] 创建 14 个核心 Collections（基于 PRD v0.2）
- [x] 配置权限控制（基于角色的访问控制 RBAC）
- [x] 实现基础 Hooks（订单号生成、状态流转、授信历史记录等）
- [x] 生成 TypeScript 类型定义
- [x] 编写 Collections 设计文档
- [x] 配置 PostgreSQL 数据库连接
- [x] 本地开发环境 SQLite3 支持（测试环境）
- [x] 数据库自动迁移（Payload push: true）
- [x] 创建完整 Seed 数据（12个用户、3个商户、10个订单等）
- [x] 下单时根据地址和模板计算运费
- [x] 不发地区拦截逻辑
- [x] 实现 PAID → TO_SHIP 自动流转
- [x] Accounts/Users 分离（支持一账号多业务身份）
- [x] Payments 统一支付模型（整合 Surcharges 功能）
- [x] 实现 Statements（对账单）和 Surcharges（附加费用）Collections

## 待完成 🚧

### 优先级 P0（必须完成）

#### 1. Collections 字段对齐（基于文档 B2B_Collections_WithDesc.md）

**Orders Collection 字段补充**（影响核心业务流程）
- [ ] 添加 `return_contact_name` - 归还联系人姓名
- [ ] 添加 `return_contact_phone` - 归还联系人电话
- [ ] 添加 `return_address` - 归还地址（或使用 group）
- [ ] 添加 `transaction_no` - 交易流水号（关联 Payments）
- [ ] 添加 `out_pay_no` - 外部支付单号
- [ ] 添加 `shipping_date` - 实际发货时间
- [x] ~~重命名 `shipping_fee` → `shipping_fee_snapshot`~~（保持现有命名）

**Payments Collection 字段补充**
- [x] 添加 `out_pay_no` - 外部支付单号（已完成，Payments.ts:58-64）
- [x] 添加 `type` - 支付类型（rent / overdue / addr_up / addr_down）（已完成，Payments.ts:66-79）
- [x] 添加 `amount` - 统一金额字段，支持正负（已完成，Payments.ts:81-88）
- [x] 添加 `amount_detail` group - 金额明细（rent + shipping）（已完成，Payments.ts:90-111）
- [ ] 添加 `pay_creat_at` - 支付订单创建时间（可选，评估是否使用 createdAt）
- [x] 重构为统一支付模型（整合 Surcharges 功能）（已完成）

**Logistics Collection 字段补充**
- [ ] 添加 `logistics_type` - 物流类型（shipping / returning）
- [ ] 评估是否拆分发货/归还为两条记录（设计决策待定）

**设计文档同步**
- [ ] 更新 `docs/B2B_Collections_WithDesc.md`
  - [x] Statements 已实现（src/collections/Statements.ts）
  - [x] Surcharges 功能已整合到 Payments.type 中
  - [x] Accounts/Users 已分离实现（src/collections/Accounts.ts + users.ts）
  - [x] Payments 已重构为统一支付模型（type + amount + amount_detail）
  - [ ] 补充 Orders 归还地址字段说明（待实现后更新）
  - [ ] 补充 Logistics logistics_type 字段说明（待实现后更新）

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
- [ ] **Orders ↔ Logistics 关联设计**
  - 当前：双向关联（Orders.logistics + Logistics.order），可能导致不一致
  - 建议：评估是否只保留单向关联（Logistics → Order）
- [x] **Payments ↔ Surcharges 合并** ✅ 已完成
  - Surcharges 功能已整合到 Payments.type 中
  - 统一支付模型：通过 type 区分（rent/overdue/addr_up/addr_down）
  - Surcharges Collection 保留（可选移除）
- [ ] **Logistics 发货/归还拆分评估**
  - 当前：一条记录包含发货和归还信息（ship_no + return_ship_no）
  - 备选：拆分为两条记录，通过 logistics_type 区分
  - 待定：根据实际业务场景决策
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
- [ ] 抽取公共字段到 Mixin（如 timestamps、operator 等）
- [ ] 抽取公共权限逻辑到 Helper 函数
- [ ] 优化 Hooks 性能（避免重复查询）

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

## 联系方式

如有问题，请联系：
- 技术负责人：[TODO]
- 产品负责人：[TODO]
