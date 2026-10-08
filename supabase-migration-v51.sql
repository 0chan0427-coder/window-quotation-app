-- V51: 직접입력 창의 내부/외부 구분을 저장하고 부가시공비 계산에 사용
alter table if exists public.estimate_items
  add column if not exists window_scope text;

alter table if exists public.estimate_items
  drop constraint if exists estimate_items_window_scope_check;

alter table if exists public.estimate_items
  add constraint estimate_items_window_scope_check
  check (window_scope is null or window_scope in ('내부창','외부창'));

grant select, insert, update, delete on table public.estimate_items to anon, authenticated, service_role;
