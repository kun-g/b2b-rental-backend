/**
 * 地址解析工具
 * 将中国地址字符串解析为结构化的省市区街道组件
 */

// 直接导入 JSON 数据文件，避免 Next.js webpack 打包问题
import provincesData from 'china-division/dist/provinces.json';
import citiesData from 'china-division/dist/cities.json';
import areasData from 'china-division/dist/areas.json';

export interface ParsedAddress {
  province?: string;
  city?: string;
  district?: string;
  street?: string;
}

// 直辖市列表
const DIRECT_MUNICIPALITIES = ['北京市', '上海市', '天津市', '重庆市'];

// 构建省市区查找索引
const provinces = provincesData as Array<{ code: string; name: string }>;
const cities = citiesData as Array<{ code: string; name: string; provinceCode: string }>;
const areas = areasData as Array<{ code: string; name: string; cityCode: string; provinceCode: string }>;

// 省级索引：简称 -> 全称
const provinceShortNameMap = new Map<string, string>();
const provinceFullNameMap = new Map<string, string>();
provinces.forEach((p) => {
  const fullName = p.name;
  // 省级简称：去掉"省"、"自治区"、"特别行政区"、"市"（直辖市）
  const shortName = fullName
    .replace(/(省|自治区|特别行政区|市)$/, '');
  provinceShortNameMap.set(shortName, fullName);
  provinceFullNameMap.set(fullName, fullName);
});

// 市级索引：简称 -> 市信息
const cityShortNameMap = new Map<string, Array<{ name: string; provinceCode: string }>>();
const cityFullNameMap = new Map<string, Array<{ name: string; provinceCode: string }>>();
cities.forEach((c) => {
  const fullName = c.name;
  const shortName = fullName.replace(/(市|盟|州)$/, '');

  // 同一个简称可能对应多个市（如"朝阳市"在辽宁、"朝阳"在北京）
  if (!cityShortNameMap.has(shortName)) {
    cityShortNameMap.set(shortName, []);
  }
  cityShortNameMap.get(shortName)!.push({ name: fullName, provinceCode: c.provinceCode });

  if (!cityFullNameMap.has(fullName)) {
    cityFullNameMap.set(fullName, []);
  }
  cityFullNameMap.get(fullName)!.push({ name: fullName, provinceCode: c.provinceCode });
});

// 区县级索引：简称 -> 区县信息
const areaShortNameMap = new Map<string, Array<{ name: string; cityCode: string; provinceCode: string }>>();
const areaFullNameMap = new Map<string, Array<{ name: string; cityCode: string; provinceCode: string }>>();
areas.forEach((a) => {
  const fullName = a.name;
  const shortName = fullName.replace(/(区|县|旗|市)$/, '');

  if (!areaShortNameMap.has(shortName)) {
    areaShortNameMap.set(shortName, []);
  }
  areaShortNameMap.get(shortName)!.push({
    name: fullName,
    cityCode: a.cityCode,
    provinceCode: a.provinceCode
  });

  if (!areaFullNameMap.has(fullName)) {
    areaFullNameMap.set(fullName, []);
  }
  areaFullNameMap.get(fullName)!.push({
    name: fullName,
    cityCode: a.cityCode,
    provinceCode: a.provinceCode
  });
});

/**
 * 尝试从字符串开头匹配省级
 */
function matchProvince(text: string): { fullName: string; matchedLength: number; provinceCode: string } | null {
  // 0. 特殊处理香港澳门（china-division 没有这两个数据）
  const specialRegions = ['香港特别行政区', '澳门特别行政区'];
  for (const region of specialRegions) {
    if (text.startsWith(region)) {
      return {
        fullName: region,
        matchedLength: region.length,
        provinceCode: region === '香港特别行政区' ? '81' : '82'
      };
    }
  }

  // 1. 先尝试匹配全称（带后缀）
  const fullMatch = text.match(/^(.+?(?:省|自治区))/);
  if (fullMatch) {
    const fullName = fullMatch[1];
    if (provinceFullNameMap.has(fullName)) {
      const code = provinces.find(p => p.name === fullName)?.code || '';
      return { fullName, matchedLength: fullName.length, provinceCode: code };
    }
  }

  // 2. 检查直辖市
  for (const dm of DIRECT_MUNICIPALITIES) {
    if (text.startsWith(dm)) {
      const code = provinces.find(p => p.name === dm)?.code || '';
      return { fullName: dm, matchedLength: dm.length, provinceCode: code };
    }
  }

  // 3. 尝试匹配简称（最长匹配优先）
  for (let len = 10; len >= 2; len--) {
    const shortName = text.slice(0, len);
    if (provinceShortNameMap.has(shortName)) {
      const fullName = provinceShortNameMap.get(shortName)!;
      const code = provinces.find(p => p.name === fullName)?.code || '';
      return { fullName, matchedLength: len, provinceCode: code };
    }
  }

  return null;
}

/**
 * 尝试从字符串开头匹配市级
 */
function matchCity(text: string, provinceCode?: string): { fullName: string; matchedLength: number } | null {
  // 1. 特殊处理香港
  if (provinceCode === '81' || provinceCode === '82') { // 香港、澳门
    const hkRegions = ['香港岛', '九龙', '新界'];
    for (const region of hkRegions) {
      if (text.startsWith(region)) {
        return { fullName: region, matchedLength: region.length };
      }
    }
  }

  // 2. 尝试匹配全称（从长到短，避免"宿州"匹配到而"宿州市"未匹配）
  for (let len = Math.min(text.length, 20); len >= 2; len--) {
    const candidate = text.slice(0, len);
    const fullCandidates = cityFullNameMap.get(candidate);
    if (fullCandidates) {
      // 检查是否存在同名的区县（如"朝阳区"优先于"朝阳市"）
      const baseNameWithDistrict = candidate.replace(/[市盟州]$/, '') + '区';
      const hasDistrictMatch = areaFullNameMap.has(baseNameWithDistrict) ||
                               areaFullNameMap.has(candidate.replace(/[市盟州]$/, '') + '县');

      if (hasDistrictMatch && !provinceCode) {
        // 如果没有省code，且存在同名区县，跳过市级匹配
        continue;
      }

      // 如果有省code，优先匹配同省的市
      if (provinceCode) {
        const matched = fullCandidates.find(c => c.provinceCode === provinceCode);
        if (matched) {
          return { fullName: matched.name, matchedLength: len };
        } else {
          // 该省没有这个市，可能是同名的区（如北京市朝阳区）
          // 跳过，继续尝试其他长度
          continue;
        }
      }
      return { fullName: fullCandidates[0].name, matchedLength: len };
    }
  }

  // 3. 尝试匹配简称（最长匹配优先）
  for (let len = Math.min(text.length, 10); len >= 2; len--) {
    const shortName = text.slice(0, len);
    const candidates = cityShortNameMap.get(shortName);
    if (candidates) {
      // 检查是否存在同名的区县
      const hasDistrictMatch = areaShortNameMap.has(shortName);

      if (hasDistrictMatch && !provinceCode) {
        // 如果没有省code，且存在同名区县，跳过市级匹配
        continue;
      }

      // 如果有省code，优先匹配同省的市
      if (provinceCode) {
        const matched = candidates.find(c => c.provinceCode === provinceCode);
        if (matched) {
          return { fullName: matched.name, matchedLength: len };
        } else {
          // 该省没有这个市，可能是同名的区
          continue;
        }
      }
      return { fullName: candidates[0].name, matchedLength: len };
    }
  }

  return null;
}

/**
 * 尝试从字符串开头匹配区县级
 */
function matchArea(text: string, cityCode?: string, provinceCode?: string, hasCity?: boolean): { fullName: string; matchedLength: number } | null {
  // 0. 特殊处理香港澳门的区（china-division没有数据）
  if (provinceCode === '81' || provinceCode === '82') {
    // 简单的区县匹配
    const areaMatch = text.match(/^(.+?(?:区|堂区))/);
    if (areaMatch) {
      const fullName = areaMatch[1];
      return { fullName, matchedLength: fullName.length };
    }
  }

  // 1. 尝试匹配全称（从长到短）
  for (let len = Math.min(text.length, 20); len >= 2; len--) {
    const candidate = text.slice(0, len);
    const candidates = areaFullNameMap.get(candidate);
    if (candidates) {
      // 优先级：市code > 省code > 第一个
      if (cityCode) {
        const matched = candidates.find(a => a.cityCode === cityCode);
        if (matched) return { fullName: matched.name, matchedLength: len };
      }
      if (provinceCode) {
        const matched = candidates.find(a => a.provinceCode === provinceCode);
        if (matched) return { fullName: matched.name, matchedLength: len };
      }
      return { fullName: candidates[0].name, matchedLength: len };
    }
  }

  // 2. 尝试匹配简称（最长匹配优先）
  for (let len = Math.min(text.length, 10); len >= 2; len--) {
    const shortName = text.slice(0, len);
    const candidates = areaShortNameMap.get(shortName);
    if (candidates) {
      // 优先级：市code > 省code > 第一个
      if (cityCode) {
        const matched = candidates.find(a => a.cityCode === cityCode);
        if (matched) return { fullName: matched.name, matchedLength: len };
      }
      if (provinceCode) {
        const matched = candidates.find(a => a.provinceCode === provinceCode);
        if (matched) return { fullName: matched.name, matchedLength: len };
      }
      return { fullName: candidates[0].name, matchedLength: len };
    }
  }

  return null;
}

/**
 * 解析中国地址
 * @param address - 完整地址字符串
 * @returns 解析后的地址组件
 *
 * @example
 * parseAddress('广东省深圳市南山区科技园南路')
 * // => { province: '广东省', city: '深圳市', district: '南山区', street: '科技园南路' }
 *
 * parseAddress('安徽宿州灵璧光明小区沿街403')
 * // => { province: '安徽省', city: '宿州市', district: '灵璧县', street: '光明小区沿街403' }
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
  let provinceCode: string | undefined;
  let cityCode: string | undefined;

  // 步骤1: 匹配省级
  const provinceResult = matchProvince(remaining);
  if (provinceResult) {
    province = provinceResult.fullName;
    provinceCode = provinceResult.provinceCode;
    remaining = remaining.slice(provinceResult.matchedLength);
  }

  // 步骤2: 尝试市级匹配
  if (remaining) {
    const cityResult = matchCity(remaining, provinceCode);
    if (cityResult) {
      city = cityResult.fullName;
      const cityInfo = cities.find(c => c.name === cityResult.fullName && (!provinceCode || c.provinceCode === provinceCode));
      cityCode = cityInfo?.code;
      remaining = remaining.slice(cityResult.matchedLength);
    }
  }

  // 步骤3: 匹配区县级
  if (remaining) {
    const areaResult = matchArea(remaining, cityCode, provinceCode, !!city);
    if (areaResult) {
      district = areaResult.fullName;
      remaining = remaining.slice(areaResult.matchedLength);
    }
  }

  // 步骤4: 剩余部分作为街道地址
  const street = remaining === '' ? '' : remaining || undefined;

  return {
    province,
    city,
    district,
    street,
  };
}
