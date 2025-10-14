# API 快速上手指南

## 1. 获取访问凭证

### 方式一：使用测试账号

```bash
# 测试账号（开发环境）
用户名: user1
密码: user123456
角色: 普通用户

# 商户管理员账号
用户名: merchant1
密码: merchant123
角色: 商户管理员

# 平台管理员账号
用户名: admin
密码: admin123456
角色: 平台管理员
```

### 方式二：登录获取 Token

```bash
# 设置 API 地址
export API_URL="http://localhost:3000"

# 登录
curl -X POST ${API_URL}/api/users/login \
  -H "Content-Type: application/json" \
  -d '{
    "username": "user1",
    "password": "user123456"
  }'

# 保存返回的 token
export TOKEN="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
```

## 2. 基础 API 调用示例

### 获取当前用户信息

```bash
curl -X GET ${API_URL}/api/users/me \
  -H "Authorization: JWT ${TOKEN}"
```

### 获取商户列表

```bash
# 获取所有激活的商户
curl -X GET "${API_URL}/api/merchants?where[status][equals]=active" \
  -H "Authorization: JWT ${TOKEN}"
```

### 获取用户授信

```bash
# 获取当前用户的所有授信
curl -X GET ${API_URL}/api/user-merchant-credit \
  -H "Authorization: JWT ${TOKEN}"
```

### 获取可租赁的 SKU

```bash
# 获取有授信的商户的 SKU
curl -X GET "${API_URL}/api/merchant-skus?where[status][equals]=active" \
  -H "Authorization: JWT ${TOKEN}"
```

## 3. 核心业务流程

### 场景一：创建租赁订单

```bash
# 步骤1: 获取 SKU 详情
export SKU_ID="sku_id_here"
curl -X GET ${API_URL}/api/merchant-skus/${SKU_ID} \
  -H "Authorization: JWT ${TOKEN}"

# 步骤2: 创建订单
curl -X POST ${API_URL}/api/orders \
  -H "Authorization: JWT ${TOKEN}" \
  -H "Content-Type: application/json" \
  -d '{
    "sku": "'${SKU_ID}'",
    "quantity": 1,
    "rent_days": 30,
    "shipping_address": {
      "receiver_name": "张三",
      "receiver_phone": "13800138000",
      "province": "北京市",
      "city": "北京市",
      "district": "朝阳区",
      "address": "某某街道123号"
    },
    "remark": "请尽快发货"
  }'
```

### 场景三：查询订单状态

```bash
# 获取我的订单列表
curl -X GET "${API_URL}/api/orders?where[user][equals]=${USER_ID}" \
  -H "Authorization: JWT ${TOKEN}"

# 获取特定订单详情
export ORDER_ID="order_id_here"
curl -X GET ${API_URL}/api/orders/${ORDER_ID} \
  -H "Authorization: JWT ${TOKEN}"
```

## 4. JavaScript/TypeScript 示例

### 安装依赖

```bash
npm install axios
# 或
pnpm add axios
```

### 基础客户端封装

```typescript
// api-client.ts
import axios from 'axios'

class APIClient {
  private token: string | null = null
  private baseURL: string

  constructor(baseURL: string = 'http://localhost:3000') {
    this.baseURL = baseURL
  }

  // 登录
  async login(username: string, password: string) {
    const response = await axios.post(`${this.baseURL}/api/users/login`, {
      username,
      password,
    })
    this.token = response.data.token
    return response.data
  }

  // 通用请求方法
  async request(method: string, path: string, data?: any) {
    const headers: any = {
      'Content-Type': 'application/json',
    }

    if (this.token) {
      headers['Authorization'] = `JWT ${this.token}`
    }

    const response = await axios({
      method,
      url: `${this.baseURL}${path}`,
      headers,
      data,
    })

    return response.data
  }

  // 获取商户列表
  async getMerchants() {
    return this.request('GET', '/api/merchants?where[status][equals]=active')
  }

  // 获取我的授信
  async getMyCredits() {
    return this.request('GET', '/api/user-merchant-credit')
  }

  // 创建订单
  async createOrder(orderData: any) {
    return this.request('POST', '/api/orders', orderData)
  }
}

// 使用示例
async function main() {
  const client = new APIClient()

  // 登录
  await client.login('user1', 'user123456')

  // 获取商户
  const merchants = await client.getMerchants()
  console.log('商户列表:', merchants)

  // 获取授信
  const credits = await client.getMyCredits()
  console.log('我的授信:', credits)

  // 创建订单
  const order = await client.createOrder({
    sku: 'sku_id',
    quantity: 1,
    rent_days: 30,
    shipping_address: {
      receiver_name: '张三',
      receiver_phone: '13800138000',
      province: '北京市',
      city: '北京市',
      district: '朝阳区',
      address: '某某街道123号',
    },
  })
  console.log('订单创建成功:', order)
}

main().catch(console.error)
```

## 5. Python 示例

```python
# api_client.py
import requests
import json

class APIClient:
    def __init__(self, base_url='http://localhost:3000'):
        self.base_url = base_url
        self.token = None

    def login(self, username, password):
        """登录获取 Token"""
        response = requests.post(
            f'{self.base_url}/api/users/login',
            json={'username': username, 'password': password}
        )
        data = response.json()
        self.token = data.get('token')
        return data

    def request(self, method, path, data=None, params=None):
        """通用请求方法"""
        headers = {'Content-Type': 'application/json'}
        if self.token:
            headers['Authorization'] = f'JWT {self.token}'

        response = requests.request(
            method=method,
            url=f'{self.base_url}{path}',
            headers=headers,
            json=data,
            params=params
        )
        return response.json()

    def get_merchants(self):
        """获取商户列表"""
        return self.request('GET', '/api/merchants', params={'where[status][equals]': 'active'})

    def get_my_credits(self):
        """获取我的授信"""
        return self.request('GET', '/api/user-merchant-credit')

    def create_order(self, order_data):
        """创建订单"""
        return self.request('POST', '/api/orders', data=order_data)

# 使用示例
if __name__ == '__main__':
    client = APIClient()

    # 登录
    client.login('user1', 'user123456')

    # 获取商户
    merchants = client.get_merchants()
    print('商户列表:', merchants)

    # 获取授信
    credits = client.get_my_credits()
    print('我的授信:', credits)

    # 创建订单
    order = client.create_order({
        'sku': 'sku_id',
        'quantity': 1,
        'rent_days': 30,
        'shipping_address': {
            'receiver_name': '张三',
            'receiver_phone': '13800138000',
            'province': '北京市',
            'city': '北京市',
            'district': '朝阳区',
            'address': '某某街道123号'
        }
    })
    print('订单创建成功:', order)
```

## 6. 测试数据

运行 `pnpm seed` 后，系统会创建以下测试数据供开发使用：

### 可租赁的 SKU

| SKU 名称 | 日租金 | 所属商户 | 库存设备数 |
|----------|--------|---------|------------|
| MacBook Pro 16寸 2023款 | ¥150 | 优租设备 | 5 |
| Dell UltraSharp 27寸 4K显示器 | ¥30 | 优租设备 | 5 |
| HP LaserJet Pro打印机 | ¥20 | 长租科技 | 3 |
| Herman Miller Aeron人体工学椅 | ¥50 | 长租科技 | 4 |

## 7. 错误处理

### 常见错误码

| HTTP 状态码 | 错误类型 | 说明 |
|------------|---------|------|
| 400 | Bad Request | 请求参数错误 |
| 401 | Unauthorized | 未登录或 Token 过期 |
| 403 | Forbidden | 无权限访问 |
| 404 | Not Found | 资源不存在 |
| 409 | Conflict | 资源冲突（如重复创建） |
| 500 | Internal Server Error | 服务器错误 |

### 错误响应格式

```json
{
  "errors": [
    {
      "message": "Validation failed",
      "field": "phone",
      "value": "invalid-phone"
    }
  ]
}
```

### 处理 Token 过期

```typescript
// 自动刷新 Token
async function refreshToken() {
  const response = await axios.post(`${baseURL}/api/users/refresh-token`, {
    token: currentToken,
  })
  return response.data.refreshedToken
}

// 请求拦截器
axios.interceptors.response.use(
  response => response,
  async error => {
    if (error.response?.status === 401) {
      // Token 过期，尝试刷新
      const newToken = await refreshToken()
      // 使用新 Token 重试请求
      error.config.headers.Authorization = `JWT ${newToken}`
      return axios.request(error.config)
    }
    return Promise.reject(error)
  }
)
```

## 8. 性能优化建议

### 批量查询

```bash
# 使用 depth 参数控制关联数据深度
curl -X GET "${API_URL}/api/orders?depth=0" \
  -H "Authorization: JWT ${TOKEN}"

# depth=0: 只返回 ID
# depth=1: 返回一层关联数据
# depth=2: 返回两层关联数据（默认）
```

### 分页查询

```bash
# 使用 limit 和 page 进行分页
curl -X GET "${API_URL}/api/orders?limit=10&page=1&sort=-createdAt" \
  -H "Authorization: JWT ${TOKEN}"
```

### 字段过滤

```bash
# 使用 GraphQL 精确控制返回字段
curl -X POST ${API_URL}/api/graphql \
  -H "Authorization: JWT ${TOKEN}" \
  -H "Content-Type: application/json" \
  -d '{
    "query": "{ Orders(limit: 10) { docs { id order_no status total_amount } } }"
  }'
```

## 9. 开发工具推荐

### Postman

1. 下载 [Postman](https://www.postman.com/)
2. 导入环境变量：
   - `{{base_url}}`: http://localhost:3000
   - `{{token}}`: 登录后获取的 JWT Token
3. 创建请求集合，方便团队共享

### VS Code REST Client

安装 REST Client 扩展，创建 `.http` 文件：

```http
### 变量定义
@baseUrl = http://localhost:3000
@token = {{login.response.body.token}}

### 登录
# @name login
POST {{baseUrl}}/api/users/login
Content-Type: application/json

{
  "username": "user1",
  "password": "user123456"
}

### 获取用户信息
GET {{baseUrl}}/api/users/me
Authorization: JWT {{token}}

### 创建订单
POST {{baseUrl}}/api/orders
Authorization: JWT {{token}}
Content-Type: application/json

{
  "sku": "sku_id",
  "quantity": 1,
  "rent_days": 30
}
```

## 10. 故障排查

### 检查服务状态

```bash
# 检查 API 健康状态
curl ${API_URL}/api/health

# 查看服务器日志
pnpm dev
```

### 常见问题

1. **Token 无效**
   - 检查 Token 格式是否正确
   - 确认 Token 未过期
   - 使用正确的 Authorization header 格式：`JWT <token>`

2. **权限不足**
   - 确认用户角色
   - 检查资源访问权限
   - 查看 [USER_PERMISSIONS.md](./USER_PERMISSIONS.md)

3. **找不到资源**
   - 确认资源 ID 正确
   - 检查资源是否被删除
   - 验证用户是否有查看权限

## 联系方式

- API 问题反馈：在项目 Issues 中提交
- 技术支持：查看 [API_COLLABORATION_GUIDE.md](./API_COLLABORATION_GUIDE.md)
- 更新日志：查看 Git 提交历史