-- V52: 기존 견적을 새 내부/외부창 구조와 호환
-- 1) V51 컬럼이 없으면 생성
alter table public.estimate_items add column if not exists window_scope text;

-- 2) 기존에 이미 종류가 저장된 창은 자동 분류
update public.estimate_items
set window_scope = case
  when window_scope is not null then window_scope
  when window_kind in ('발코니창','복도창') then '외부창'
  when window_kind in ('분합창','내창','주방창') then '내부창'
  else null
end
where window_scope is null;

-- 3) 직접입력은 현장을 모르면 자동 판단할 수 없으므로 null 유지.
-- 기존 견적을 수정할 때 화면에서 내부창/외부창을 선택하면 저장됩니다.
alter table public.estimate_items drop constraint if exists estimate_items_window_scope_check;
alter table public.estimate_items add constraint estimate_items_window_scope_check
  check (window_scope is null or window_scope in ('내부창','외부창'));
