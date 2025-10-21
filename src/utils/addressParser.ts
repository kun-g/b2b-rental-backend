/**
 * 地址解析工具
 * 将中国地址字符串解析为结构化的省市区街道组件
 */

export interface ParsedAddress {
  province?: string;
  city?: string;
  district?: string;
  street?: string;
}

// 直辖市列表
const DIRECT_MUNICIPALITIES = ['北京市', '上海市', '天津市', '重庆市'];

/**
 * 解析中国地址
 * @param address - 完整地址字符串
 * @returns 解析后的地址组件
 *
 * @example
 * parseAddress('广东省深圳市南山区科技园南路')
 * // => { province: '广东省', city: '深圳市', district: '南山区', street: '科技园南路' }
 *
 * parseAddress('北京市朝阳区望京街道')
 * // => { province: '北京市', district: '朝阳区', street: '望京街道' }
 */
export function parseAddress(address: string): ParsedAddress {
  // 去除首尾空格
  const clean = address.trim();

  // 空地址处理
  if (!clean) {
    return {
      province: undefined,
      city: undefined,
      district: undefined,
      street: '',
    };
  }

  let remaining = clean;
  let province: string | undefined;
  let city: string | undefined;
  let district: string | undefined;
  let street: string | undefined;

  // 步骤1: 尝试匹配省级（省、自治区、特别行政区）
  const provinceMatch = remaining.match(/^(.+?(?:省|自治区|特别行政区))/);
  if (provinceMatch) {
    province = provinceMatch[1];
    remaining = remaining.slice(province.length);
  }

  // 步骤2: 如果没有匹配到省级，检查是否是直辖市开头
  if (!province) {
    for (const dm of DIRECT_MUNICIPALITIES) {
      if (remaining.startsWith(dm)) {
        province = dm;
        remaining = remaining.slice(dm.length);
        break;
      }
    }
  }

  // 步骤3: 尝试匹配市级（市、盟、州）
  // 注意：直辖市已经被识别为省级，这里不会再匹配
  if (remaining) {
    const cityMatch = remaining.match(/^(.+?(?:市|盟|州))/);
    if (cityMatch) {
      city = cityMatch[1];
      remaining = remaining.slice(city.length);
    }
  }

  // 步骤3.5: 特殊处理香港、澳门的市级单位
  if (province && province.includes('香港') && !city) {
    // 香港的市级单位：香港岛、九龙、新界
    const hkRegions = ['香港岛', '九龙', '新界'];
    for (const region of hkRegions) {
      if (remaining.startsWith(region)) {
        city = region;
        remaining = remaining.slice(region.length);
        break;
      }
    }
  }

  // 步骤4: 尝试匹配区县级（区、县、旗、市）
  // 注意：如果已经识别了市级单位（city），这里的"市"指县级市（如"康定市"、"锡林浩特市"）
  if (remaining) {
    // 如果已经有了city，那么"市"可能是县级市；否则只匹配区、县、旗
    const districtSuffix = city ? '(?:区|县|旗|市)' : '(?:区|县|旗)';
    const districtMatch = remaining.match(new RegExp(`^(.+?${districtSuffix})`));
    if (districtMatch) {
      district = districtMatch[1];
      remaining = remaining.slice(district.length);
    }
  }

  // 步骤5: 剩余部分作为街道地址
  // 如果remaining是空字符串，street为空字符串；如果有内容，street为该内容；否则为undefined
  street = remaining === '' ? '' : remaining || undefined;

  return {
    province,
    city,
    district,
    street,
  };
}
