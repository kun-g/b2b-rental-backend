# 授信邀请码功能说明

## 业务背景

在B2B租赁场景中，商户需要给用户授予信用额度才能下单租赁设备。传统方式需要商户手动输入用户账号创建授信，存在以下问题：
- **隐私问题**：商户可以看到所有用户列表
- **安全问题**：手动输入账号容易出错
- **效率问题**：需要线下沟通账号信息

**邀请码机制**解决了这些问题，让授信流程更加安全、高效、自动化。

## 业务流程（自动授信）

### 1. 商户创建邀请码
- 商户管理员在后台创建授信邀请码
- 设置参数：
  - **授信额度**（如 10000 元）
  - **有效期**（如 30 天，从创建时开始计算）
  - **使用次数限制**（可选，如 100 次；留空表示无限次）
  - **备注**（如"VIP客户专用"、"展会活动"）
- 系统自动生成唯一邀请码（格式：`CREDIT-XXXXXXXX`）
- 系统自动计算过期时间

### 2. 商户分享邀请码
- 商户通过线下或线上渠道分享邀请码给目标用户
- 分享方式：
  - 微信/钉钉等即时通讯工具
  - 邮件
  - 展会现场海报/二维码
  - 销售人员口头告知

### 3. 用户使用邀请码（自动生效）
- 用户在前端（小程序/Web）输入邀请码
- 系统验证邀请码有效性：
  - ✅ 邀请码是否存在
  - ✅ 是否已过期（当前时间 < expires_at）
  - ✅ 是否达到使用次数上限（used_count < max_uses）
  - ✅ 状态是否为激活（status = 'active'）
  - ✅ 用户是否已有该商户的授信（防止重复授信）
- **验证通过后自动创建授信记录**：
  - 创建 `UserMerchantCredit` 记录（状态=active）
  - 创建 `CreditInvitationUsages` 使用记录（审计追踪）
  - 邀请码的 `used_count` +1
- 用户立即可以开始下单租赁设备

## 数据模型

### CreditInvitations（授信邀请码）

| 字段 | 类型 | 说明 |
|------|------|------|
| merchant | 关系 | 所属商户 |
| invitation_code | 文本 | 唯一邀请码（自动生成，如 CREDIT-ABC12345） |
| credit_limit | 数字 | 预设授信额度（元） |
| validity_days | 数字 | 有效天数（默认30天） |
| max_uses | 数字 | 最大使用次数（null=无限） |
| used_count | 数字 | 已使用次数（自动更新） |
| status | 选择 | active/paused/expired |
| expires_at | 日期 | 过期时间（自动计算） |
| notes | 文本 | 内部备注 |

**邀请码状态说明**：
- `active`：激活，可以使用
- `paused`：暂停，临时停用（商户可手动暂停/恢复）
- `expired`：已过期，系统自动标记为过期

### CreditInvitationUsages（邀请码使用记录）

| 字段 | 类型 | 说明 |
|------|------|------|
| user | 关系 | 使用用户 |
| merchant | 关系 | 商户 |
| invitation | 关系 | 邀请码记录 |
| invitation_code | 文本 | 邀请码字符串（冗余存储） |
| credit_amount | 数字 | 授信额度 |
| credit_record | 关系 | 创建的授信记录 |
| used_at | 日期 | 使用时间 |
| ip_address | 文本 | 用户IP地址（风控） |
| user_agent | 文本 | 浏览器信息（风控） |

**权限说明**：
- 只读集合，不允许手动创建/修改
- 用于审计和追踪
- 只有平台管理员可以删除（清理错误记录）

### UserMerchantCredit（授信记录）新增字段

| 字段 | 类型 | 说明 |
|------|------|------|
| source | 选择 | manual（手动）/ invitation（邀请码） |
| invitation_usage | 关系 | 关联的邀请码使用记录 |

## 权限控制

### CreditInvitations（授信邀请码）
- **创建**：merchant_admin
- **查看**：merchant_admin/member（仅自己商户）、platform_admin/operator（所有）
- **修改**：merchant_admin（仅自己商户）、platform_admin/operator（所有）
- **删除**：merchant_admin（仅自己商户）、platform_admin

### CreditInvitationUsages（使用记录）
- **创建**：系统自动创建（不允许手动创建）
- **查看**：customer（仅自己）、merchant_admin/member（仅自己商户）、platform_admin/operator（所有）
- **修改**：不允许（保持审计完整性）
- **删除**：platform_admin（仅用于清理错误记录）

## 使用场景示例

### 场景1：展会活动
1. 商户参加行业展会，准备了授信优惠活动
2. 商户创建邀请码：
   - 额度：20000 元
   - 有效期：7 天
   - 使用次数：50 次
   - 备注："2025春季展会专用"
3. 在展会现场展示二维码海报，扫码后输入邀请码
4. 展会期间 35 位用户使用邀请码，**自动获得授信**
5. 商户在后台查看使用记录，了解活动效果

### 场景2：VIP客户专属
1. 商户为重要客户提供更高授信额度
2. 商户创建邀请码：
   - 额度：100000 元
   - 有效期：365 天
   - 使用次数：1 次（仅限该客户使用）
   - 备注："张总专属邀请码"
3. 销售人员线下告知客户邀请码
4. 客户输入邀请码后**立即获得授信**，无需等待

### 场景3：企业批量授信
1. 商户与某企业达成合作，需要给企业的 100 名员工授信
2. 商户创建邀请码：
   - 额度：5000 元
   - 有效期：30 天
   - 使用次数：100 次
   - 备注："XX科技公司员工福利"
3. 企业管理员将邀请码发送给员工
4. 员工自助输入邀请码，**立即获得授信**，开始租赁设备

### 场景4：限时优惠活动
1. 商户推出限时优惠，3天内授信额度翻倍
2. 商户创建邀请码：
   - 额度：40000 元（平时只有20000）
   - 有效期：3 天
   - 使用次数：无限
   - 备注："周末限时优惠"
3. 通过公众号/小程序推送给老客户
4. 老客户（已有20000额度）使用后自动升级到40000额度

## 前端集成要点

### 用户端 API

#### 1. 验证邀请码
```typescript
POST /api/credit-invitations/validate
Body: {
  invitation_code: string
}
Response: {
  valid: boolean
  message: string
  invitation?: {
    credit_limit: number
    merchant: {
      id: string
      name: string
    }
  }
}
```

**验证规则**：
- 邀请码是否存在
- 是否已过期
- 是否达到使用次数上限
- 状态是否为 active
- 用户是否已有该商户的授信

#### 2. 使用邀请码（自动创建授信）
```typescript
POST /api/credit-invitations/use
Body: {
  invitation_code: string
}
Response: {
  success: boolean
  message: string
  credit?: {
    id: string
    credit_limit: number
    merchant: {
      id: string
      name: string
    }
  }
  usage?: {
    id: string
    used_at: string
  }
}
```

**自动执行的操作**：
1. 创建 UserMerchantCredit 记录
2. 创建 CreditInvitationUsages 记录
3. 更新邀请码的 used_count
4. 检查是否达到 max_uses，自动标记为 expired

#### 3. 查询自己的授信记录
```typescript
GET /api/user-merchant-credit?user=<userId>
Response: {
  docs: [{
    id: string
    merchant: { id, name }
    credit_limit: number
    used_credit: number
    available_credit: number
    source: 'manual' | 'invitation'
    status: 'active' | 'disabled' | 'frozen'
  }]
}
```

#### 4. 查询邀请码使用历史
```typescript
GET /api/credit-invitation-usages?user=<userId>
Response: {
  docs: [{
    id: string
    invitation_code: string
    merchant: { id, name }
    credit_amount: number
    used_at: string
  }]
}
```

### 商户端 API

#### 1. 创建邀请码
```typescript
POST /api/credit-invitations
Body: {
  credit_limit: number
  validity_days: number
  max_uses?: number
  notes?: string
}
Response: {
  invitation: {
    id: string
    invitation_code: string
    credit_limit: number
    expires_at: string
    max_uses: number | null
    used_count: 0
    status: 'active'
  }
}
```

#### 2. 查询邀请码列表
```typescript
GET /api/credit-invitations?merchant=<merchantId>&status=active
Response: {
  docs: [{
    id: string
    invitation_code: string
    credit_limit: number
    validity_days: number
    max_uses: number | null
    used_count: number
    status: 'active' | 'paused' | 'expired'
    expires_at: string
    createdAt: string
  }]
  totalDocs: number
}
```

#### 3. 暂停/恢复邀请码
```typescript
PATCH /api/credit-invitations/<id>
Body: {
  status: 'paused' | 'active'
}
Response: {
  invitation: { ... }
}
```

#### 4. 查询邀请码使用记录
```typescript
GET /api/credit-invitation-usages?merchant=<merchantId>&invitation=<invitationId>
Response: {
  docs: [{
    id: string
    user: { id, username, phone }
    invitation_code: string
    credit_amount: number
    used_at: string
    ip_address: string
  }]
  totalDocs: number
}
```

#### 5. 邀请码统计
```typescript
GET /api/credit-invitations/<id>/stats
Response: {
  invitation_code: string
  total_uses: number
  max_uses: number | null
  usage_rate: number // used_count / max_uses
  expires_at: string
  days_remaining: number
  recent_usages: [{
    user: { username, phone }
    used_at: string
  }]
}
```

## 安全性与风控

### 邀请码安全
- ✅ 随机生成，难以猜测（8位大写字母数字组合）
- ✅ 唯一性约束，防止冲突
- ✅ 有效期限制，过期自动失效
- ✅ 使用次数限制，防止滥用
- ✅ 商户可随时暂停邀请码

### 用户验证
- ✅ 防止重复授信（同一用户对同一商户只能使用一次）
- ✅ 记录使用者IP和User Agent（风控分析）
- ✅ 使用记录不可修改（审计完整性）

### 异常监控指标
- 同一IP短时间内多次使用不同邀请码
- 同一邀请码在多个地理位置被使用
- 使用次数异常快速增长
- 新注册用户立即使用邀请码（可能是批量注册）

## 监控指标

商户可以通过以下指标评估邀请码效果：

- **使用率**：`used_count / max_uses`
- **转化率**：使用邀请码的用户中有多少完成了订单
- **平均响应时间**：从创建邀请码到第一次使用的时间
- **活跃度**：使用邀请码后用户的订单频率

## 下一步优化

### 功能增强
1. **邀请码模板**：保存常用配置为模板，快速创建
2. **批量创建**：一次创建多个不同的邀请码
3. **条件限制**：
   - 地域限制（仅北京地区可用）
   - 设备类目限制（仅适用于无人机品类）
   - 用户条件（仅新用户可用）
4. **自动过期检测**：定时任务自动将过期邀请码标记为 expired
5. **额度叠加规则**：允许/禁止用户多次使用邀请码累加额度

### UI优化
6. **前端组件**：提供开箱即用的邀请码输入和申请组件
7. **二维码生成**：自动生成邀请码二维码，方便分享
8. **使用统计图表**：邀请码使用趋势可视化
9. **实时通知**：邀请码被使用时推送通知给商户

### 高级功能
10. **分级额度**：根据用户等级自动分配不同额度
11. **动态额度**：根据用户信用评分动态调整授信额度
12. **邀请码链路追踪**：分析邀请码在不同渠道的传播效果
13. **A/B测试**：对比不同额度/有效期的邀请码效果

---

**创建时间**: 2025-10-09
**版本**: v2.0（自动授信版）
**维护人**: Claude
