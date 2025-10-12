/**
 * 运费计算工具函数
 * 根据运费模板和收货地址计算运费
 */

interface ShippingAddress {
  province: string
  city: string
  district: string
  region_code?: string
}

interface RegionRule {
  region_code_path: string
  region_name: string
  fee: number
}

interface BlacklistRegion {
  region_code_path: string
  region_name: string
  reason?: string
}

interface ShippingTemplate {
  default_fee: number
  region_rules?: RegionRule[]
  blacklist_regions?: BlacklistRegion[]
}

export interface ShippingCalculationResult {
  fee: number
  isBlacklisted: boolean
  blacklistReason?: string
  matchedRule?: string // 用于调试,记录匹配到的规则
}

/**
 * 计算运费
 * @param template 运费模板
 * @param address 收货地址
 * @returns 运费计算结果
 */
export function calculateShippingFee(
  template: ShippingTemplate,
  address: ShippingAddress,
): ShippingCalculationResult {
  // 1. 检查黑名单地区（优先级最高）
  if (template.blacklist_regions && template.blacklist_regions.length > 0) {
    const blacklistMatch = template.blacklist_regions.find((region) => {
      return matchesRegion(region.region_code_path, address)
    })

    if (blacklistMatch) {
      return {
        fee: 0,
        isBlacklisted: true,
        blacklistReason: blacklistMatch.reason || '该地区不发货',
        matchedRule: `黑名单: ${blacklistMatch.region_name}`,
      }
    }
  }

  // 2. 匹配地区运费规则
  if (template.region_rules && template.region_rules.length > 0) {
    // 按照去掉末尾0后的地区编码长度排序,优先匹配更精确的地区（如深圳 > 广东）
    // 例如: 440305 (6位) > 440300 -> 4403 (4位) > 440000 -> 44 (2位)
    const sortedRules = [...template.region_rules].sort((a, b) => {
      const aTrimmed = a.region_code_path.replace(/0+$/, '')
      const bTrimmed = b.region_code_path.replace(/0+$/, '')
      return bTrimmed.length - aTrimmed.length
    })

    for (const rule of sortedRules) {
      if (matchesRegion(rule.region_code_path, address)) {
        return {
          fee: rule.fee,
          isBlacklisted: false,
          matchedRule: `地区规则: ${rule.region_name} (${rule.region_code_path})`,
        }
      }
    }
  }

  // 3. 使用默认运费
  return {
    fee: template.default_fee,
    isBlacklisted: false,
    matchedRule: '默认运费',
  }
}

/**
 * 判断地址是否匹配地区编码
 * @param regionCode 地区编码路径 (如: 110000, 440300)
 * @param address 收货地址
 * @returns 是否匹配
 */
function matchesRegion(regionCode: string, address: ShippingAddress): boolean {
  // 如果地址有 region_code,直接比较
  if (address.region_code) {
    // 中国行政区划代码规则:
    // - 省级: XX0000 (前2位表示省)
    // - 市级: XXYY00 (前2位表示省,中间2位表示市)
    // - 区级: XXYYZZ (前2位表示省,中间2位表示市,后2位表示区)

    // 匹配逻辑: 去掉规则编码末尾的0,然后检查地址编码是否以该前缀开头
    // 例如:
    // - 规则 650000 -> 前缀 65, 地址 650100 -> 65 匹配 ✓
    // - 规则 440000 -> 前缀 44, 地址 440305 -> 44 匹配 ✓
    // - 规则 440300 -> 前缀 4403, 地址 440305 -> 4403 匹配 ✓
    // - 规则 4403 -> 前缀 4403, 地址 440305 -> 4403 匹配 ✓

    const trimmedRegionCode = regionCode.replace(/0+$/, '') // 去掉末尾的0
    return address.region_code.startsWith(trimmedRegionCode)
  }

  // TODO: 如果没有 region_code,可能需要根据省市区名称进行匹配
  // 这里暂时返回 false,建议在创建订单时强制要求 region_code
  return false
}
