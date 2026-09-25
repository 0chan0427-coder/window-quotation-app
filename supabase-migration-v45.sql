-- V45: 창호 입력 순서와 창별 요율을 데이터 자체에 고정합니다.
-- 기존 견적은 현재 estimate_items의 id 순서를 원래 저장 순서로 간주하며,
-- V45에서 수정/재저장하면 sort_order 1,2,3... 으로 영구 저장됩니다.
alter table public.estimate_items
  add column if not exists sort_order integer,
  add column if not exists pricing_rate numeric;

-- 새로 저장되는 견적은 앱에서 sort_order를 직접 기록합니다.
-- 기존 데이터의 순서는 앱이 id 순서로 읽은 뒤 재저장할 때 자동으로 보존합니다.
