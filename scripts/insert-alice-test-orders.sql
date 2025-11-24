-- 为 alice (user_id=7) 创建 3 个测试订单
-- 1. 逾期订单
-- 2. 退运费订单
-- 3. 补运费订单

-- 订单1: 逾期订单（已逾期5天）
INSERT INTO orders (
  order_number, user_id, merchant_id, merchant_sku_id, status,
  rental_days, daily_rent, deposit,
  start_date, end_date,
  shipping_address, prepaid_shipping_fee, actual_shipping_fee, actual_return_shipping_fee,
  total_amount, payment_status,
  shipped_at, received_at,
  created_at, updated_at
) VALUES (
  'TEST-OVERDUE-' || EXTRACT(EPOCH FROM NOW())::bigint,
  7, -- alice
  1, -- 极客科技租赁
  1, -- 大疆 Mini 3 Pro
  'IN_RENT',
  15, 50, 1000,
  NOW() - INTERVAL '20 days', -- 20天前开始
  NOW() - INTERVAL '5 days',  -- 5天前应该归还（已逾期）
  '{"province":"广东省","city":"深圳市","district":"南山区","address":"科技园南区深圳湾科技生态园10栋A座","postal_code":"518000","region_code_path":"440000/440300/440305","contact_name":"Alice","contact_phone":"13800138001"}',
  15, 15, 0,
  1765, -- 50*15 + 1000 + 15
  'PAID',
  NOW() - INTERVAL '20 days',
  NOW() - INTERVAL '18 days',
  NOW(), NOW()
);

-- 订单2: 退运费订单（预付20元，实际只需12元）
INSERT INTO orders (
  order_number, user_id, merchant_id, merchant_sku_id, status,
  rental_days, daily_rent, deposit,
  start_date, end_date,
  shipping_address, prepaid_shipping_fee, actual_shipping_fee, actual_return_shipping_fee,
  total_amount, payment_status,
  shipped_at, received_at, notes,
  created_at, updated_at
) VALUES (
  'TEST-REFUND-' || EXTRACT(EPOCH FROM NOW())::bigint,
  7, -- alice
  1, -- 极客科技租赁
  1, -- 大疆 Mini 3 Pro
  'IN_RENT',
  15, 50, 1000,
  NOW() - INTERVAL '10 days', -- 10天前开始
  NOW() + INTERVAL '5 days',  -- 5天后归还
  '{"province":"广东省","city":"深圳市","district":"福田区","address":"福田中心区益田路6001号","postal_code":"518000","region_code_path":"440000/440300/440304","contact_name":"Alice","contact_phone":"13800138001"}',
  20, 20, 0, -- 预付20元，实际应该只需12元
  1770, -- 50*15 + 1000 + 20
  'PAID',
  NOW() - INTERVAL '10 days',
  NOW() - INTERVAL '8 days',
  '测试退运费：预付20元，实际应该只需12元',
  NOW(), NOW()
);

-- 订单3: 补运费订单（预付15元，实际需要30元）
INSERT INTO orders (
  order_number, user_id, merchant_id, merchant_sku_id, status,
  rental_days, daily_rent, deposit,
  start_date, end_date,
  shipping_address, prepaid_shipping_fee, actual_shipping_fee, actual_return_shipping_fee,
  total_amount, payment_status,
  shipped_at, received_at, notes,
  created_at, updated_at
) VALUES (
  'TEST-EXTRA-' || EXTRACT(EPOCH FROM NOW())::bigint,
  7, -- alice
  1, -- 极客科技租赁
  1, -- 大疆 Mini 3 Pro
  'IN_RENT',
  15, 50, 1000,
  NOW() - INTERVAL '8 days', -- 8天前开始
  NOW() + INTERVAL '7 days', -- 7天后归还
  '{"province":"新疆维吾尔自治区","city":"乌鲁木齐市","district":"天山区","address":"解放南路1号","postal_code":"830000","region_code_path":"650000/650100/650102","contact_name":"Alice","contact_phone":"13800138001"}',
  15, 15, 0, -- 预付15元，实际需要30元（偏远地区）
  1765, -- 50*15 + 1000 + 15
  'PAID',
  NOW() - INTERVAL '8 days',
  NOW() - INTERVAL '5 days',
  '测试补运费：预付15元，实际需要30元（偏远地区），需补15元',
  NOW(), NOW()
);

-- 查看创建的订单
SELECT 
  order_number,
  status,
  start_date::date,
  end_date::date,
  CASE 
    WHEN end_date < NOW() THEN '已逾期 ' || EXTRACT(DAY FROM NOW() - end_date) || ' 天'
    ELSE '未逾期'
  END as overdue_status,
  prepaid_shipping_fee,
  notes
FROM orders 
WHERE user_id = 7 AND order_number LIKE 'TEST-%'
ORDER BY created_at DESC;
