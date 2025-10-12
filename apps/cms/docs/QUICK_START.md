# 快速启动指南

## 方式一：使用 Seed 数据（推荐开发/测试）

如果你需要快速搭建开发或测试环境，可以使用 seed 命令一键创建完整的演示数据。

### 什么是 Seed？

Seed 是预设的测试数据，包括：
- **12 个用户**（3个平台管理员 + 3个商户管理员 + 6个普通用户）
- **3 个商户**（2个已审核 + 1个待审核）
- **7 个类目**（电子设备、户外装备等）
- **7 个 SKU**（无人机、相机、帐篷等）
- **25 个设备**
- **6 条授信记录**
- **10 个订单**（覆盖所有订单状态）
- **3 个邀请码**
- 更多...

### Seed 命令说明

```bash
# 创建 seed 数据（如果数据库已有数据会警告并退出）
pnpm seed

# 先清空数据库，再创建 seed 数据
pnpm seed --clean

# 只清空数据库，不创建数据
pnpm seed:clean
```

### 快速开始

1. **启动开发服务器**
   ```bash
   cd apps/cms
   pnpm dev
   ```

2. **创建 seed 数据**

   在**另一个终端**运行：
   ```bash
   cd apps/cms
   pnpm seed
   ```

3. **登录管理后台**
   ```
   http://localhost:3000/admin
   ```

   使用以下任一账号登录：
   ```
   平台管理员: admin@platform.com / Admin123!
   平台运营:   operator@platform.com / Operator123!
   商户A管理员: admin@geek-rental.com / MerchantA123!
   商户B管理员: admin@outdoor-adventure.com / MerchantB123!
   ```

### 重置数据

如果你想重新开始：

```bash
# 清空并重新创建
pnpm seed --clean
```

### 只清空数据

如果你想删除所有数据（比如从零开始手动创建）：

```bash
# 只清空，不创建
pnpm seed:clean
```

---

## 方式二：手动创建第一个管理员账号

当你首次访问 Payload Admin 时，会看到创建第一个用户的表单。

### 步骤

1. **启动开发服务器**
   ```bash
   cd apps/cms
   pnpm dev
   ```

2. **访问管理后台**
   ```
   http://localhost:3000/admin
   ```

3. **填写表单**

   **必填字段**:
   - **Username** (用户名): 例如 `admin`
   - **Password** (密码): 例如 `Admin123456`
   - **Role** (角色): ⚠️ **重要！选择 `platform_admin`**

   **选填字段**:
   - Email (邮箱): 例如 `admin@example.com`
   - Phone (手机号): 例如 `13800138000`

4. **点击 Create**

### ⚠️ 重要提示

**第一个用户必须选择 `platform_admin` 角色！**

如果你不小心选择了其他角色（如 `customer`），你将无法：
- 创建其他管理员
- 修改用户角色
- 管理系统配置

### 如果选错了角色怎么办？

**方式 1: 直接修改数据库**
```sql
-- 连接数据库
psql postgresql://kun:password@localhost:5432/cms

-- 将用户角色改为 platform_admin
UPDATE users SET role = 'platform_admin' WHERE username = 'admin';
```

**方式 2: 删除用户重新创建**
```sql
-- 删除错误的用户
DELETE FROM users WHERE username = 'admin';

-- 刷新浏览器，重新创建
```

**方式 3: 清空数据库重来**
```bash
# 停止服务器
# 删除数据库
dropdb cms

# 重新创建数据库
createdb cms

# 重启服务器，重新创建用户
pnpm dev
```

---

## 角色说明

创建第一个用户时，你可以选择以下角色：

| 角色 | 值 | 权限 | 建议 |
|------|-----|------|------|
| **平台管理员** | `platform_admin` | 最高权限，可以管理所有内容 | ✅ **第一个用户必选** |
| **平台运营** | `platform_operator` | 运营管理权限，可以审核商户/SKU | ❌ 不建议第一个用户选择 |
| **平台客服** | `platform_support` | 客服支持权限，只读 | ❌ 不建议第一个用户选择 |
| **商户管理员** | `merchant_admin` | 商户最高权限，只能管理自己商户 | ❌ 不建议第一个用户选择 |
| **商户成员** | `merchant_member` | 商户普通成员 | ❌ 不建议第一个用户选择 |
| **用户（租方）** | `customer` | 普通用户，只能查看和租赁 | ❌ 不建议第一个用户选择 |

### 为什么第一个用户必须是 platform_admin？

因为：
1. ✅ 只有 `platform_admin` 和 `platform_operator` 可以修改其他用户的角色
2. ✅ 如果第一个用户选择了其他角色，你将无法创建管理员
3. ✅ 你需要管理员权限来创建商户、类目等基础数据

---

## 创建后的操作

### 1. 登录后台

使用刚才创建的账号登录：
```
http://localhost:3000/admin/login
```

### 2. 创建基础数据

按以下顺序创建：

**Step 1: 创建类目**
1. 进入「平台管理」->「Categories」
2. 创建顶级类目，例如：
   - 电子设备
   - 无人机
   - 摄影器材

**Step 2: 邀请商户**
1. 进入「商户管理」->「Merchants」
2. 点击「Create New」
3. 填写商户信息
4. 记录生成的邀请码

**Step 3: 创建商户管理员账号**
1. 进入「账号管理」->「Users」
2. 点击「Create New」
3. 填写：
   - Username: 商户账号名
   - Password: 密码
   - Role: `merchant_admin`
   - Merchant: 选择刚才创建的商户
4. 将账号信息发给商户

**Step 4: 商户上架 SKU**
1. 商户登录后台
2. 进入「商户管理」->「MerchantSKUs」
3. 创建商品
4. 等待平台审核

**Step 5: 授信用户**
1. 商户进入「授信管理」->「UserMerchantCredit」
2. 选择用户和授信额度
3. 用户即可查看该商户的 SKU

---

## 常用操作

### 创建运营账号

```
Username: operator
Password: Operator123456
Role: platform_operator
```

运营账号可以：
- ✅ 审核商户
- ✅ 审核 SKU
- ✅ 修改用户/商户角色
- ❌ 删除数据（需要管理员权限）

### 创建客服账号

```
Username: support
Password: Support123456
Role: platform_support
```

客服账号只能：
- ✅ 查看所有数据
- ❌ 修改数据
- ❌ 审核
- ❌ 删除

### 修改用户角色

只有 `platform_admin` 和 `platform_operator` 可以修改：

1. 进入「账号管理」->「Users」
2. 找到目标用户
3. 编辑 Role 字段
4. 保存

---

## 安全建议

### 1. 强密码策略

建议密码规则：
- 最小 8 位
- 包含大小写字母
- 包含数字
- 包含特殊字符

示例：`Admin@123456`

### 2. 定期修改密码

建议每 3 个月修改一次管理员密码。

### 3. 限制管理员数量

- `platform_admin` 角色应该控制在 2-3 人
- 日常操作使用 `platform_operator` 角色
- 避免给太多人管理员权限

### 4. 记录操作日志

所有敏感操作都会记录到 `AuditLogs` Collection，包括：
- 修改用户角色
- 授信调整
- 商户审核
- SKU 审核

查看日志：「系统管理」->「AuditLogs」

---

## 故障排查

### Q: 创建第一个用户时提示数据库错误

**检查数据库连接**:
```bash
# 查看 .env 文件
cat apps/cms/.env

# 应该显示类似：
DATABASE_URI=postgresql://kun:password@localhost:5432/cms
PAYLOAD_SECRET=your-secret-key
```

**测试数据库连接**:
```bash
psql postgresql://kun:password@localhost:5432/cms -c "SELECT 1"
```

参考 [DATABASE_SETUP.md](./DATABASE_SETUP.md) 解决数据库问题。

### Q: 创建用户后无法登录

**检查用户名和密码**:
- 用户名区分大小写
- 密码区分大小写
- 确保没有多余的空格

**检查账号状态**:
```sql
SELECT username, role, status FROM users WHERE username = 'admin';
```

Status 应该是 `active`，不是 `disabled` 或 `frozen`。

### Q: 登录后看不到任何菜单

**检查角色权限**:
```sql
SELECT username, role FROM users WHERE username = 'admin';
```

如果 role 不是 `platform_admin` 或 `platform_operator`，参考上面「如果选错了角色怎么办？」修复。

---

## 下一步

- [ ] 阅读 [AUTH_GUIDE.md](./AUTH_GUIDE.md) 了解认证系统
- [ ] 阅读 [COLLECTIONS.md](./COLLECTIONS.md) 了解数据模型
- [ ] 阅读 [TODO.md](./TODO.md) 查看开发任务

祝你使用愉快！🎉
