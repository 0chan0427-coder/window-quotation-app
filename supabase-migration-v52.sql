-- V52: 기존 견적의 창 구분을 자동 보정하고, 직접입력은 수정 화면에서 선택 가능하게 유지
alter table if exists public.estimate_items
  add column if not exists window_scope text;

alter table if exists public.estimate_items
  drop constraint if exists estimate_items_window_scope_check;

alter table if exists public.estimate_items
  add constraint estimate_items_window_scope_check
  check (window_scope is null or window_scope in ('내부창','외부창'));

-- 기존 표준 창호는 종류만으로 내부/외부를 자동 보정
update public.estimate_items
set window_scope = '외부창'
where (window_kind in ('발코니창','복도창'))
  and (window_scope is null or window_scope = '');

update public.estimate_items
set window_scope = '내부창'
where (window_kind in ('분합창','내창','주방창'))
  and (window_scope is null or window_scope = '');

-- 직접입력은 과거 데이터의 이름만으로 내부/외부를 확정할 수 없으므로 null 유지.
-- 사용자가 기존 견적을 '수정'할 때 창 구분을 선택하면 저장 시 window_scope에 기록됨.

grant select, insert, update, delete on table public.estimate_items to anon, authenticated, service_role;
