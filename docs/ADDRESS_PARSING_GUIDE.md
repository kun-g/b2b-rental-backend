# 下单地址解析功能说明

## 功能概述

下单时，系统会自动解析和验证收货地址，确保地址信息完整且格式正确。

## 核心功能

### 1. 地址解析
使用 `addressParser` 工具从完整地址字符串中智能提取省市区信息。

### 2. 字段补全
自动补全缺失的地址字段：
- 如果 `district` 为空，尝试从完整地址中解析
- 如果 `district` 与 `city` 重复（前端错误），自动修正

### 3. 严格验证
确保必填字段完整：
- ✅ province（省）
- ✅ city（市）
- ✅ district（区/县）
- ✅ address（详细地址）
- ✅ contact_name（收货人）
- ✅ contact_phone（联系电话）

## 使用示例

### ✅ 正确的地址格式

```json
{
  "shipping_address": {
    "contact_name": "张三",
    "contact_phone": "13800138000",
    "province": "广东省",
    "city": "深圳市",
    "district": "南山区",
    "address": "科技园南路15号",
    "region_code": "440305"
  }
}
```

**结果**：✅ 验证通过，直接使用

---

### ✅ 缺少 district 但可以自动补全

```json
{
  "shipping_address": {
    "contact_name": "李四",
    "contact_phone": "13800138001",
    "province": "北京市",
    "city": "",
    "district": "",
    "address": "朝阳区望京SOHO T1",
    "region_code": ""
  }
}
```

**完整地址字符串**：`"北京市朝阳区望京SOHO T1"`

**解析结果**：
- `province`: "北京市"
- `city`: (直辖市无需city，保持为空)
- `district`: "朝阳区" ← 自动补全

**结果**：✅ 补全成功，验证通过

---

### ✅ district 与 city 重复（前端错误）

```json
{
  "shipping_address": {
    "contact_name": "王五",
    "contact_phone": "13800138002",
    "province": "广东省",
    "city": "深圳市",
    "district": "深圳市",  // ← 错误：与 city 重复
    "address": "南山区科技园",
    "region_code": ""
  }
}
```

**完整地址字符串**：`"广东省深圳市深圳市南山区科技园"`

**解析结果**：
- `province`: "广东省"
- `city`: "深圳市"
- `district`: "南山区" ← 自动修正

**结果**：✅ 自动修正，验证通过

---

### ❌ 地址信息不完整

```json
{
  "shipping_address": {
    "contact_name": "赵六",
    "contact_phone": "13800138003",
    "province": "山东省",
    "city": "山东省",  // ← 错误：与 province 重复
    "district": "",
    "address": "某某路",
    "region_code": ""
  }
}
```

**完整地址字符串**：`"山东省山东省某某路"`

**解析结果**：
- `province`: "山东省"
- `city`: (无法解析)
- `district`: (无法解析)

**错误信息**：
```
收货地址缺少区县信息。当前地址：山东省山东省某某路，请提供完整的省市区信息
```

**结果**：❌ 验证失败，返回错误

---

### ❌ 缺少详细地址

```json
{
  "shipping_address": {
    "contact_name": "孙七",
    "contact_phone": "13800138004",
    "province": "广东省",
    "city": "深圳市",
    "district": "南山区",
    "address": "",  // ← 错误：详细地址为空
    "region_code": "440305"
  }
}
```

**错误信息**：
```
请提供详细的收货地址（街道、门牌号等）
```

**结果**：❌ 验证失败，返回错误

---

## 地址解析规则

### 省级单位
- 识别：`省`、`自治区`、`特别行政区`
- 直辖市：`北京市`、`上海市`、`天津市`、`重庆市`

### 市级单位
- 识别：`市`、`盟`、`州`
- 直辖市无需填写市级单位

### 区县级
- 识别：`区`、`县`、`旗`、`市`（县级市）
- 示例：南山区、宝安区、龙岗区

### 详细地址
- 街道、门牌号、楼栋单元等
- 不能为空

## 最佳实践

### 前端建议

1. **使用级联选择器**
   - 省 → 市 → 区 三级联动
   - 避免重复值

2. **验证地址完整性**
   ```javascript
   if (!province || !city || !district || !address) {
     throw new Error('请填写完整的收货地址')
   }
   ```

3. **格式化 region_code**
   ```javascript
   // 正确格式
   region_code: "440305"  // 或 "广东省,深圳市,南山区"

   // 错误格式
   region_code: "山东省,山东省"  // 避免重复
   ```

### 后端处理

后端会自动：
1. ✅ 解析完整地址
2. ✅ 补全缺失字段
3. ✅ 验证数据完整性
4. ✅ 提供清晰的错误提示

## 测试用例

```bash
# 测试地址解析
curl -X POST http://localhost:3000/api/orders \
  -H "Authorization: JWT $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "customer": "7",
    "merchant_sku": 4,
    "rent_start_date": "2025-10-23",
    "rent_end_date": "2025-10-29",
    "shipping_address": {
      "contact_name": "测试用户",
      "contact_phone": "13800138000",
      "province": "广东省",
      "city": "深圳市",
      "district": "",
      "address": "南山区科技园南路15号",
      "region_code": ""
    }
  }'
```

**预期结果**：
- ✅ 自动解析出 `district: "南山区"`
- ✅ 订单创建成功

## 常见错误处理

### 错误 1: 地址信息不完整
```json
{
  "errors": [{
    "message": "收货地址缺少区县信息。当前地址：XXX，请提供完整的省市区信息"
  }]
}
```

**解决方案**：提供完整的省市区信息

---

### 错误 2: 详细地址为空
```json
{
  "errors": [{
    "message": "请提供详细的收货地址（街道、门牌号等）"
  }]
}
```

**解决方案**：填写具体的街道地址

---

### 错误 3: 缺少联系信息
```json
{
  "errors": [{
    "message": "收货地址缺少联系人或联系电话"
  }]
}
```

**解决方案**：填写收货人姓名和电话

## 技术实现

### 地址解析流程

```
1. 接收前端地址数据
   ↓
2. 拼接完整地址字符串
   province + city + district + address
   ↓
3. 使用 addressParser 解析
   ↓
4. 补全缺失字段
   - 优先使用前端提供的值
   - 如果缺失或错误，使用解析结果
   ↓
5. 严格验证
   - 省市区必填
   - 详细地址必填
   - 联系信息必填
   ↓
6. 通过验证后计算运费
```

### 关键代码位置

- **地址解析工具**: `src/utils/addressParser.ts`
- **下单地址验证**: `src/collections/Orders.ts` (line 587-643)
- **运费计算**: `src/utils/calculateShipping.ts`

## 相关文档

- [addressParser API 文档](../src/utils/addressParser.ts)
- [Orders Collection 说明](../src/collections/Orders.ts)
- [运费计算规则](./SHIPPING_CALCULATION.md)
