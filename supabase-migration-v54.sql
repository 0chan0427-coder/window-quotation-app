-- V54: 사용자 입력 요율과 실행가 기본 요율을 분리
alter table public.estimate_items add column if not exists pricing_rate_source text;

alter table public.estimate_items drop constraint if exists estimate_items_pricing_rate_source_check;
alter table public.estimate_items add constraint estimate_items_pricing_rate_source_check
  check (pricing_rate_source is null or pricing_rate_source in ('manual','none','legacy-default'));

-- 기존 데이터는 앱이 실행가 default_rate와 비교하여 자동 요율 여부를 판별합니다.
-- 일괄 삭제하지 않아 기존에 사용자가 실제 입력한 요율을 함부로 잃지 않도록 합니다.
update public.estimate_items
set pricing_rate_source = case
  when pricing_rate is null or pricing_rate <= 0 then 'none'
  when pricing_rate_source is null then 'legacy-default'
  else pricing_rate_source
end
where pricing_rate_source is null;
