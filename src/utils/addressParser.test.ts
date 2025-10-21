import { describe, it, expect } from 'vitest';
import { parseAddress } from './addressParser';

describe('addressParser', () => {
  describe('完整地址解析', () => {
    it('应该正确解析标准格式的完整地址', () => {
      const result = parseAddress('广东省深圳市南山区科技园南路');
      expect(result).toEqual({
        province: '广东省',
        city: '深圳市',
        district: '南山区',
        street: '科技园南路',
      });
    });

    it('应该正确解析带详细信息的完整地址', () => {
      const result = parseAddress('北京市朝阳区望京街道阜通东大街6号院3号楼10层');
      expect(result).toEqual({
        province: '北京市',
        city: undefined, // 直辖市没有市级
        district: '朝阳区',
        street: '望京街道阜通东大街6号院3号楼10层',
      });
    });

    it('应该正确解析上海地址', () => {
      const result = parseAddress('上海市浦东新区张江高科技园区祖冲之路');
      expect(result).toEqual({
        province: '上海市',
        city: undefined,
        district: '浦东新区',
        street: '张江高科技园区祖冲之路',
      });
    });
  });

  describe('自治区和特殊地名', () => {
    it('应该正确解析自治区地址', () => {
      const result = parseAddress('新疆维吾尔自治区乌鲁木齐市天山区解放南路');
      expect(result).toEqual({
        province: '新疆维吾尔自治区',
        city: '乌鲁木齐市',
        district: '天山区',
        street: '解放南路',
      });
    });

    it('应该正确解析内蒙古盟的地址', () => {
      const result = parseAddress('内蒙古自治区锡林郭勒盟锡林浩特市贝子庙大街');
      expect(result).toEqual({
        province: '内蒙古自治区',
        city: '锡林郭勒盟',
        district: '锡林浩特市',
        street: '贝子庙大街',
      });
    });

    it('应该正确解析旗级地址', () => {
      const result = parseAddress('内蒙古自治区呼和浩特市土默特左旗察素齐镇');
      expect(result).toEqual({
        province: '内蒙古自治区',
        city: '呼和浩特市',
        district: '土默特左旗',
        street: '察素齐镇',
      });
    });
  });

  describe('缺少部分信息的地址', () => {
    it('应该正确解析缺少省份的地址', () => {
      const result = parseAddress('深圳市南山区科技园南路');
      expect(result).toEqual({
        province: undefined,
        city: '深圳市',
        district: '南山区',
        street: '科技园南路',
      });
    });

    it('应该正确解析直辖市缺少市级的地址', () => {
      const result = parseAddress('朝阳区望京街道阜通东大街6号');
      expect(result).toEqual({
        province: undefined,
        city: undefined,
        district: '朝阳区',
        street: '望京街道阜通东大街6号',
      });
    });

    it('应该正确解析只有街道的地址', () => {
      const result = parseAddress('望京街道阜通东大街6号院3号楼');
      expect(result).toEqual({
        province: undefined,
        city: undefined,
        district: undefined,
        street: '望京街道阜通东大街6号院3号楼',
      });
    });
  });

  describe('重庆特殊情况', () => {
    it('应该正确解析重庆直辖市地址（不含市级）', () => {
      const result = parseAddress('重庆市渝中区解放碑步行街');
      expect(result).toEqual({
        province: '重庆市',
        city: undefined,
        district: '渝中区',
        street: '解放碑步行街',
      });
    });
  });

  describe('边界情况', () => {
    it('应该处理空字符串', () => {
      const result = parseAddress('');
      expect(result).toEqual({
        province: undefined,
        city: undefined,
        district: undefined,
        street: '',
      });
    });

    it('应该处理只有空格的字符串', () => {
      const result = parseAddress('   ');
      expect(result).toEqual({
        province: undefined,
        city: undefined,
        district: undefined,
        street: '',
      });
    });

    it('应该去除首尾空格', () => {
      const result = parseAddress('  广东省深圳市南山区科技园南路  ');
      expect(result).toEqual({
        province: '广东省',
        city: '深圳市',
        district: '南山区',
        street: '科技园南路',
      });
    });

    it('应该处理不包含省市区关键词的地址', () => {
      const result = parseAddress('科技园南路10号');
      expect(result).toEqual({
        province: undefined,
        city: undefined,
        district: undefined,
        street: '科技园南路10号',
      });
    });
  });

  describe('特殊行政区', () => {
    it('应该正确解析香港地址', () => {
      const result = parseAddress('香港特别行政区九龙油尖旺区弥敦道');
      expect(result).toEqual({
        province: '香港特别行政区',
        city: '九龙',
        district: '油尖旺区',
        street: '弥敦道',
      });
    });

    it('应该正确解析澳门地址', () => {
      const result = parseAddress('澳门特别行政区花地玛堂区');
      expect(result).toEqual({
        province: '澳门特别行政区',
        city: undefined,
        district: '花地玛堂区',
        street: '',
      });
    });
  });

  describe('多种格式的市级名称', () => {
    it('应该识别以"州"结尾的市级单位', () => {
      const result = parseAddress('四川省甘孜藏族自治州康定市炉城镇');
      expect(result).toEqual({
        province: '四川省',
        city: '甘孜藏族自治州',
        district: '康定市',
        street: '炉城镇',
      });
    });
  });

  describe('简称格式（省略后缀）', () => {
    it('应该正确解析省略后缀的地址', () => {
      const result = parseAddress('安徽宿州灵璧光明小区沿街403');
      expect(result).toEqual({
        province: '安徽省',
        city: '宿州市',
        district: '灵璧县',
        street: '光明小区沿街403',
      });
    });

    it('应该正确处理带中文括号的地址', () => {
      // 移除括号后解析
      const address = '【安徽宿州灵璧光明小区沿街403】';
      const cleanAddress = address.replace(/[【】]/g, '');
      const result = parseAddress(cleanAddress);
      expect(result).toEqual({
        province: '安徽省',
        city: '宿州市',
        district: '灵璧县',
        street: '光明小区沿街403',
      });
    });

    it('应该正确解析混合格式（省全称+市简称+区简称）', () => {
      const result = parseAddress('广东省深圳南山科技园南路');
      expect(result).toEqual({
        province: '广东省',
        city: '深圳市',
        district: '南山区',
        street: '科技园南路',
      });
    });
  });

  describe('返回类型', () => {
    it('返回的对象应该有正确的类型', () => {
      const result = parseAddress('广东省深圳市南山区科技园南路');
      expect(typeof result).toBe('object');
      expect(result).toHaveProperty('province');
      expect(result).toHaveProperty('city');
      expect(result).toHaveProperty('district');
      expect(result).toHaveProperty('street');
    });
  });
});
