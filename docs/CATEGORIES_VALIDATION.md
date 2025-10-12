# Categories 循环引用防护

## 问题描述

Categories 是树形结构，通过 `parent` 字段关联父类目。如果不加限制，可能会出现循环引用：

### 场景 1: 选择自己作为父类目
```
电子设备 (id: 1)
  └─ parent: 1 (自己)  ❌ 不允许
```

### 场景 2: 选择子孙节点作为父类目
```
原始结构：
电子设备 (id: 1)
  └─ 无人机 (id: 2)
      └─ 专业无人机 (id: 3)

如果修改：
电子设备.parent = 3 (专业无人机)  ❌ 不允许

会造成循环：
专业无人机 → 无人机 → 电子设备 → 专业无人机 → ...
```

---

## 解决方案

### 1. 前端过滤（filterOptions）

在选择父类目时，自动过滤掉自己：

```typescript
{
  name: 'parent',
  type: 'relationship',
  relationTo: 'categories',
  filterOptions: ({ id }) => {
    if (id) {
      return {
        id: {
          not_equals: id,
        },
      }
    }
    return true
  },
}
```

**效果**：
- 创建类目时，可以选择任何现有类目作为父类目
- 编辑类目时，父类目下拉列表中**不会显示自己**

---

### 2. 后端验证（hooks）

在保存前验证，防止循环引用：

```typescript
hooks: {
  beforeChange: [
    async ({ data, req, operation, originalDoc }) => {
      if (operation === 'update' && data.parent) {
        const currentId = originalDoc.id

        // 检查1: 不能选择自己
        if (data.parent === currentId) {
          throw new Error('不能选择自己作为父类目')
        }

        // 检查2: 不能选择自己的子孙节点
        const checkCircular = async (parentId: string) => {
          if (parentId === currentId) {
            return true // 发现循环
          }
          const parent = await req.payload.findByID({
            collection: 'categories',
            id: parentId,
          })
          if (parent.parent) {
            return await checkCircular(parent.parent)
          }
          return false
        }

        const hasCircular = await checkCircular(data.parent)
        if (hasCircular) {
          throw new Error('不能选择自己的子孙节点作为父类目')
        }
      }
      return data
    },
  ],
}
```

**效果**：
- 即使前端绕过限制，后端也会阻止保存
- 返回友好的错误提示

---

## 测试场景

### 测试 1: 创建类目

```bash
1. 创建顶级类目「电子设备」
   parent: (空)
   ✅ 成功

2. 创建子类目「无人机」
   parent: 电子设备
   ✅ 成功

3. 创建子类目「专业无人机」
   parent: 无人机
   ✅ 成功
```

**结果**：
```
电子设备
  └─ 无人机
      └─ 专业无人机
```

---

### 测试 2: 编辑类目 - 选择自己

```bash
1. 编辑「电子设备」
2. 尝试设置 parent = 电子设备 (自己)
   ❌ 下拉列表中不会显示「电子设备」
   ❌ 如果通过 API 强行提交，返回错误：
      "不能选择自己作为父类目"
```

---

### 测试 3: 编辑类目 - 选择子孙节点

```bash
当前结构：
电子设备 (id: 1)
  └─ 无人机 (id: 2)
      └─ 专业无人机 (id: 3)

1. 编辑「电子设备」
2. 尝试设置 parent = 无人机
   ❌ 返回错误：
      "不能选择自己的子孙节点作为父类目，这会造成循环引用"

3. 尝试设置 parent = 专业无人机
   ❌ 返回错误：
      "不能选择自己的子孙节点作为父类目，这会造成循环引用"
```

---

### 测试 4: 正常移动类目

```bash
当前结构：
电子设备
  └─ 无人机
摄影器材
  └─ 相机

操作：
1. 编辑「无人机」
2. 设置 parent = 摄影器材
   ✅ 成功

结果：
电子设备
摄影器材
  └─ 相机
  └─ 无人机
      └─ 专业无人机
```

---

## API 示例

### 创建类目

```bash
# 创建顶级类目
curl -X POST http://localhost:3000/api/categories \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "电子设备",
    "sort": 0,
    "status": "active"
  }'

# 返回
{
  "doc": {
    "id": "1",
    "name": "电子设备",
    "path": "/电子设备",
    "parent": null
  }
}
```

```bash
# 创建子类目
curl -X POST http://localhost:3000/api/categories \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "无人机",
    "parent": "1",
    "sort": 0,
    "status": "active"
  }'

# 返回
{
  "doc": {
    "id": "2",
    "name": "无人机",
    "path": "/电子设备/无人机",
    "parent": "1"
  }
}
```

---

### 尝试循环引用

```bash
# 尝试选择自己作为父类目
curl -X PATCH http://localhost:3000/api/categories/1 \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{
    "parent": "1"
  }'

# 返回 400 错误
{
  "errors": [
    {
      "message": "不能选择自己作为父类目"
    }
  ]
}
```

```bash
# 尝试选择子孙节点作为父类目
curl -X PATCH http://localhost:3000/api/categories/1 \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{
    "parent": "2"
  }'

# 返回 400 错误
{
  "errors": [
    {
      "message": "不能选择自己的子孙节点作为父类目，这会造成循环引用"
    }
  ]
}
```

---

## 实现细节

### filterOptions 工作原理

```typescript
filterOptions: ({ id }) => {
  if (id) {
    // 编辑模式：id 是当前文档的 ID
    // 返回查询条件，过滤掉自己
    return {
      id: {
        not_equals: id,
      },
    }
  }
  // 创建模式：id 为空，返回 true 表示不过滤
  return true
}
```

### 循环检测算法

```typescript
const checkCircular = async (parentId: string): Promise<boolean> => {
  // 基准情况：如果父类目 ID 等于当前 ID，发现循环
  if (parentId === currentId) {
    return true
  }

  // 递归情况：查询父类目，继续向上检查
  const parent = await req.payload.findByID({
    collection: 'categories',
    id: parentId,
  })

  // 如果父类目还有父类目，继续检查
  if (parent.parent) {
    return await checkCircular(parent.parent)
  }

  // 到达根节点，没有循环
  return false
}
```

**时间复杂度**：O(depth)，其中 depth 是类目树的深度

---

## 额外改进建议

### 1. 限制树的深度

防止类目层级过深：

```typescript
hooks: {
  beforeChange: [
    async ({ data, req }) => {
      if (data.parent) {
        // 计算深度
        let depth = 1
        let currentParent = data.parent

        while (currentParent && depth < 10) {
          const parent = await req.payload.findByID({
            collection: 'categories',
            id: currentParent,
          })
          currentParent = parent.parent
          depth++
        }

        if (depth >= 5) {
          throw new Error('类目层级不能超过5层')
        }
      }
      return data
    },
  ],
}
```

### 2. 批量移动子类目

当移动一个类目时，自动更新所有子类目的 path：

```typescript
hooks: {
  afterChange: [
    async ({ doc, req, operation, previousDoc }) => {
      // 如果 parent 改变了，更新所有子类目的 path
      if (operation === 'update' && previousDoc.parent !== doc.parent) {
        const children = await req.payload.find({
          collection: 'categories',
          where: {
            parent: {
              equals: doc.id,
            },
          },
        })

        // 递归更新子类目
        for (const child of children.docs) {
          await req.payload.update({
            collection: 'categories',
            id: child.id,
            data: {
              path: `${doc.path}/${child.name}`,
            },
          })
        }
      }
    },
  ],
}
```

### 3. 前端树形展示

在 Admin UI 中以树形结构展示类目：

```typescript
admin: {
  listSearchableFields: ['name', 'path'],
  defaultSort: 'sort',
  // 自定义列表视图
  components: {
    views: {
      List: CustomCategoryList, // 树形展示组件
    },
  },
}
```

---

## 总结

### 已实现的防护

- ✅ 前端过滤：选择父类目时自动排除自己
- ✅ 后端验证：保存时检测自引用
- ✅ 循环检测：保存时检测子孙节点引用
- ✅ 友好提示：返回清晰的错误消息

### 安全保障

- 即使前端被绕过，后端仍然会阻止
- 支持任意深度的循环检测
- 不影响正常的类目移动操作

### 性能考虑

- `filterOptions` 只在前端执行，无额外查询
- 循环检测只在 update 且有 parent 时执行
- 最坏情况：O(depth) 查询，通常 depth ≤ 5

参考 [COLLECTIONS.md](./COLLECTIONS.md) 了解更多 Collection 设计。
