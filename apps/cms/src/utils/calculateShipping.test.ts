import { calculateShippingFee } from './calculateShipping'

describe('calculateShippingFee', () => {
  describe('黑名单地区检查', () => {
    it('应该检测到黑名单地区并阻止发货', () => {
      const template = {
        default_fee: 10,
        blacklist_regions: [
          {
            region_code_path: '650000',
            region_name: '新疆维吾尔自治区',
            reason: '偏远地区,物流不覆盖',
          },
        ],
      }

      const address = {
        province: '新疆维吾尔自治区',
        city: '乌鲁木齐市',
        district: '天山区',
        region_code: '650100',
      }

      const result = calculateShippingFee(template, address)

      expect(result.isBlacklisted).toBe(true)
      expect(result.fee).toBe(0)
      expect(result.blacklistReason).toBe('偏远地区,物流不覆盖')
      expect(result.matchedRule).toContain('新疆维吾尔自治区')
    })

    it('应该在未命中黑名单时正常计费', () => {
      const template = {
        default_fee: 10,
        blacklist_regions: [
          {
            region_code_path: '650000',
            region_name: '新疆维吾尔自治区',
          },
        ],
      }

      const address = {
        province: '广东省',
        city: '深圳市',
        district: '南山区',
        region_code: '440305',
      }

      const result = calculateShippingFee(template, address)

      expect(result.isBlacklisted).toBe(false)
      expect(result.fee).toBe(10) // 使用默认运费
    })

    it('黑名单检查应优先于地区规则', () => {
      const template = {
        default_fee: 10,
        region_rules: [
          {
            region_code_path: '650000',
            region_name: '新疆维吾尔自治区',
            fee: 50,
          },
        ],
        blacklist_regions: [
          {
            region_code_path: '650000',
            region_name: '新疆维吾尔自治区',
            reason: '不发货',
          },
        ],
      }

      const address = {
        province: '新疆维吾尔自治区',
        city: '乌鲁木齐市',
        district: '天山区',
        region_code: '650100',
      }

      const result = calculateShippingFee(template, address)

      expect(result.isBlacklisted).toBe(true)
      expect(result.fee).toBe(0) // 不应该返回地区规则的50
    })
  })

  describe('地区运费规则匹配', () => {
    it('应该匹配省级运费规则', () => {
      const template = {
        default_fee: 10,
        region_rules: [
          {
            region_code_path: '440000',
            region_name: '广东省',
            fee: 15,
          },
        ],
      }

      const address = {
        province: '广东省',
        city: '深圳市',
        district: '南山区',
        region_code: '440305',
      }

      const result = calculateShippingFee(template, address)

      expect(result.isBlacklisted).toBe(false)
      expect(result.fee).toBe(15)
      expect(result.matchedRule).toContain('广东省')
    })

    it('应该匹配市级运费规则', () => {
      const template = {
        default_fee: 10,
        region_rules: [
          {
            region_code_path: '440300',
            region_name: '深圳市',
            fee: 8,
          },
        ],
      }

      const address = {
        province: '广东省',
        city: '深圳市',
        district: '南山区',
        region_code: '440305',
      }

      const result = calculateShippingFee(template, address)

      expect(result.isBlacklisted).toBe(false)
      expect(result.fee).toBe(8)
      expect(result.matchedRule).toContain('深圳市')
    })

    it('应该优先匹配更精确的地区规则 (市级 > 省级)', () => {
      const template = {
        default_fee: 10,
        region_rules: [
          {
            region_code_path: '440000',
            region_name: '广东省',
            fee: 15,
          },
          {
            region_code_path: '440300',
            region_name: '深圳市',
            fee: 8,
          },
        ],
      }

      const address = {
        province: '广东省',
        city: '深圳市',
        district: '南山区',
        region_code: '440305',
      }

      const result = calculateShippingFee(template, address)

      expect(result.isBlacklisted).toBe(false)
      expect(result.fee).toBe(8) // 应该匹配深圳市的8元,而不是广东省的15元
      expect(result.matchedRule).toContain('深圳市')
    })

    it('应该优先匹配更精确的地区规则 (区级 > 市级 > 省级)', () => {
      const template = {
        default_fee: 10,
        region_rules: [
          {
            region_code_path: '440000',
            region_name: '广东省',
            fee: 15,
          },
          {
            region_code_path: '440300',
            region_name: '深圳市',
            fee: 8,
          },
          {
            region_code_path: '440305',
            region_name: '深圳市南山区',
            fee: 5,
          },
        ],
      }

      const address = {
        province: '广东省',
        city: '深圳市',
        district: '南山区',
        region_code: '440305',
      }

      const result = calculateShippingFee(template, address)

      expect(result.isBlacklisted).toBe(false)
      expect(result.fee).toBe(5) // 应该匹配南山区的5元
      expect(result.matchedRule).toContain('南山区')
    })

    it('应该支持地区编码前缀匹配', () => {
      const template = {
        default_fee: 10,
        region_rules: [
          {
            region_code_path: '4403',
            region_name: '深圳市',
            fee: 8,
          },
        ],
      }

      const address = {
        province: '广东省',
        city: '深圳市',
        district: '南山区',
        region_code: '440305',
      }

      const result = calculateShippingFee(template, address)

      expect(result.isBlacklisted).toBe(false)
      expect(result.fee).toBe(8)
    })
  })

  describe('默认运费', () => {
    it('应该在没有匹配到任何地区规则时使用默认运费', () => {
      const template = {
        default_fee: 12,
        region_rules: [
          {
            region_code_path: '110000',
            region_name: '北京市',
            fee: 8,
          },
        ],
      }

      const address = {
        province: '广东省',
        city: '深圳市',
        district: '南山区',
        region_code: '440305',
      }

      const result = calculateShippingFee(template, address)

      expect(result.isBlacklisted).toBe(false)
      expect(result.fee).toBe(12) // 使用默认运费
      expect(result.matchedRule).toBe('默认运费')
    })

    it('应该在没有地区规则时使用默认运费', () => {
      const template = {
        default_fee: 15,
      }

      const address = {
        province: '广东省',
        city: '深圳市',
        district: '南山区',
        region_code: '440305',
      }

      const result = calculateShippingFee(template, address)

      expect(result.isBlacklisted).toBe(false)
      expect(result.fee).toBe(15)
      expect(result.matchedRule).toBe('默认运费')
    })

    it('应该在没有黑名单时使用默认运费', () => {
      const template = {
        default_fee: 10,
      }

      const address = {
        province: '广东省',
        city: '深圳市',
        district: '南山区',
        region_code: '440305',
      }

      const result = calculateShippingFee(template, address)

      expect(result.isBlacklisted).toBe(false)
      expect(result.fee).toBe(10)
    })
  })

  describe('边界情况', () => {
    it('应该处理空的地区规则数组', () => {
      const template = {
        default_fee: 10,
        region_rules: [],
      }

      const address = {
        province: '广东省',
        city: '深圳市',
        district: '南山区',
        region_code: '440305',
      }

      const result = calculateShippingFee(template, address)

      expect(result.isBlacklisted).toBe(false)
      expect(result.fee).toBe(10)
    })

    it('应该处理空的黑名单数组', () => {
      const template = {
        default_fee: 10,
        blacklist_regions: [],
      }

      const address = {
        province: '广东省',
        city: '深圳市',
        district: '南山区',
        region_code: '440305',
      }

      const result = calculateShippingFee(template, address)

      expect(result.isBlacklisted).toBe(false)
      expect(result.fee).toBe(10)
    })

    it('应该处理没有 region_code 的地址', () => {
      const template = {
        default_fee: 10,
        region_rules: [
          {
            region_code_path: '440300',
            region_name: '深圳市',
            fee: 8,
          },
        ],
      }

      const address = {
        province: '广东省',
        city: '深圳市',
        district: '南山区',
      }

      const result = calculateShippingFee(template, address)

      // 没有 region_code 时无法匹配,应该使用默认运费
      expect(result.isBlacklisted).toBe(false)
      expect(result.fee).toBe(10)
      expect(result.matchedRule).toBe('默认运费')
    })

    it('应该处理运费为0的情况', () => {
      const template = {
        default_fee: 0,
        region_rules: [
          {
            region_code_path: '440300',
            region_name: '深圳市',
            fee: 0,
          },
        ],
      }

      const address = {
        province: '广东省',
        city: '深圳市',
        district: '南山区',
        region_code: '440305',
      }

      const result = calculateShippingFee(template, address)

      expect(result.isBlacklisted).toBe(false)
      expect(result.fee).toBe(0)
    })

    it('应该处理黑名单没有 reason 的情况', () => {
      const template = {
        default_fee: 10,
        blacklist_regions: [
          {
            region_code_path: '650000',
            region_name: '新疆维吾尔自治区',
          },
        ],
      }

      const address = {
        province: '新疆维吾尔自治区',
        city: '乌鲁木齐市',
        district: '天山区',
        region_code: '650100',
      }

      const result = calculateShippingFee(template, address)

      expect(result.isBlacklisted).toBe(true)
      expect(result.blacklistReason).toBe('该地区不发货')
    })
  })

  describe('真实场景测试', () => {
    it('场景1: 深圳用户下单，使用特定深圳运费', () => {
      const template = {
        default_fee: 15,
        region_rules: [
          {
            region_code_path: '440300',
            region_name: '深圳市',
            fee: 5,
          },
          {
            region_code_path: '440000',
            region_name: '广东省',
            fee: 10,
          },
        ],
        blacklist_regions: [
          {
            region_code_path: '650000',
            region_name: '新疆维吾尔自治区',
          },
          {
            region_code_path: '540000',
            region_name: '西藏自治区',
          },
        ],
      }

      const address = {
        province: '广东省',
        city: '深圳市',
        district: '南山区',
        region_code: '440305',
      }

      const result = calculateShippingFee(template, address)

      expect(result.isBlacklisted).toBe(false)
      expect(result.fee).toBe(5)
    })

    it('场景2: 广东其他城市用户下单，使用广东省运费', () => {
      const template = {
        default_fee: 15,
        region_rules: [
          {
            region_code_path: '440300',
            region_name: '深圳市',
            fee: 5,
          },
          {
            region_code_path: '440000',
            region_name: '广东省',
            fee: 10,
          },
        ],
      }

      const address = {
        province: '广东省',
        city: '广州市',
        district: '天河区',
        region_code: '440106',
      }

      const result = calculateShippingFee(template, address)

      expect(result.isBlacklisted).toBe(false)
      expect(result.fee).toBe(10)
    })

    it('场景3: 新疆用户下单，命中黑名单', () => {
      const template = {
        default_fee: 15,
        region_rules: [
          {
            region_code_path: '440300',
            region_name: '深圳市',
            fee: 5,
          },
        ],
        blacklist_regions: [
          {
            region_code_path: '650000',
            region_name: '新疆维吾尔自治区',
            reason: '物流不覆盖',
          },
        ],
      }

      const address = {
        province: '新疆维吾尔自治区',
        city: '乌鲁木齐市',
        district: '天山区',
        region_code: '650102',
      }

      const result = calculateShippingFee(template, address)

      expect(result.isBlacklisted).toBe(true)
      expect(result.blacklistReason).toBe('物流不覆盖')
    })

    it('场景4: 其他省份用户下单，使用默认运费', () => {
      const template = {
        default_fee: 20,
        region_rules: [
          {
            region_code_path: '440300',
            region_name: '深圳市',
            fee: 5,
          },
          {
            region_code_path: '440000',
            region_name: '广东省',
            fee: 10,
          },
        ],
      }

      const address = {
        province: '浙江省',
        city: '杭州市',
        district: '西湖区',
        region_code: '330106',
      }

      const result = calculateShippingFee(template, address)

      expect(result.isBlacklisted).toBe(false)
      expect(result.fee).toBe(20)
    })
  })
})
