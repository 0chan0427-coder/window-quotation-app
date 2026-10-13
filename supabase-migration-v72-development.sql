-- V72 단지 개발. 이 파일 실행 후 supabase-seed-v72-development.sql을 실행해주세요.
begin;
create table if not exists public.development_sites (
 id uuid primary key default gen_random_uuid(),
 seed_key text unique,
 name text not null check(length(trim(name)) between 1 and 150),
 aliases text[] not null default '{}',
 city text not null default '' check(length(city)<=80),
 district text not null default '' check(length(district)<=80),
 dong text not null default '' check(length(dong)<=80),
 address text not null default '' check(length(address)<=300),
 build_year integer check(build_year between 1900 and 2200),
 households integer check(households between 1 and 1000000),
 phone text not null default '' check(length(phone)<=300),
 email text not null default '' check(length(email)<=300),
 conditions text not null default '' check(length(conditions)<=10000),
 site_note text not null default '' check(length(site_note)<=10000),
 stage text not null default '미접촉' check(stage in ('기록 검토 필요','미접촉','자료 전달 필요','검토 중','입대의 결과 대기','안건 미상정','진행 가능·날짜 협의','일정 확정','부결·거절','보류·재방문')),
 check_month date check(check_month is null or extract(day from check_month)=1),
 check_date date,
 task_state text not null default '예정 없음' check(task_state in ('미처리','확인 완료','예정 없음')),
 next_action text not null default '' check(length(next_action)<=2000),
 classification_pending boolean not null default false,
 created_at timestamptz not null default now(),
 constraint development_site_schedule_check check(
  (check_date is null or check_month is not null and date_trunc('month',check_date::timestamp)::date=check_month)
  and (task_state <> '미처리' or check_month is not null)
  and (task_state <> '예정 없음' or check_month is null and check_date is null)
 )
);
create table if not exists public.development_logs (
 id uuid primary key default gen_random_uuid(),
 site_id uuid not null references public.development_sites(id) on delete cascade,
 source_key text unique,
 logged_on date,
 staff_code text check(staff_code in ('한','찬','영')),
 method text not null check(method in ('방문','통화','메일','기타','자료 이관')),
 content text not null check(length(trim(content)) between 1 and 20000),
 stage text not null check(stage in ('기록 검토 필요','미접촉','자료 전달 필요','검토 중','입대의 결과 대기','안건 미상정','진행 가능·날짜 협의','일정 확정','부결·거절','보류·재방문')),
 check_month date check(check_month is null or extract(day from check_month)=1),
 check_date date,
 task_state text not null check(task_state in ('미처리','확인 완료','예정 없음')),
 next_action text not null default '' check(length(next_action)<=2000),
 source_ref text,
 source_period text,
 classification_pending boolean not null default false,
 created_at timestamptz not null default now(),
 constraint development_log_schedule_check check(
  (check_date is null or check_month is not null and date_trunc('month',check_date::timestamp)::date=check_month)
  and (task_state <> '미처리' or check_month is not null)
  and (task_state <> '예정 없음' or check_month is null and check_date is null)
 )
);
create index if not exists development_sites_month_idx on public.development_sites(check_month,task_state);
create index if not exists development_sites_region_idx on public.development_sites(city,district,dong);
create index if not exists development_logs_site_date_idx on public.development_logs(site_id,logged_on desc);
alter table public.development_sites enable row level security;
alter table public.development_logs enable row level security;
drop policy if exists development_sites_shared_access on public.development_sites;
create policy development_sites_shared_access on public.development_sites for all to anon,authenticated using(true) with check(true);
drop policy if exists development_logs_shared_access on public.development_logs;
create policy development_logs_shared_access on public.development_logs for all to anon,authenticated using(true) with check(true);
grant select,insert,update,delete on public.development_sites, public.development_logs to anon,authenticated,service_role;

-- 일지 추가와 현재 상황 갱신을 하나의 트랜잭션으로 저장합니다.
create or replace function public.development_add_log(p_site_id uuid,p_log jsonb)
returns uuid language plpgsql security invoker set search_path = public as $$
declare new_id uuid; stage_value text; month_value date; date_value date; state_value text;
begin
 perform id from public.development_sites where id=p_site_id for update;
 if not found then raise exception '단지 정보를 확인해주세요.'; end if;
 if p_log->>'source_key' is null or p_log->>'source_key' not like 'manual:%' then raise exception '저장 키가 없습니다.'; end if;
 if p_log->>'logged_on' is null or p_log->>'staff_code' is null or p_log->>'method' is null or p_log->>'staff_code' not in ('한','찬','영') or p_log->>'method' not in ('방문','통화','메일','기타') then raise exception '일지 입력값을 확인해주세요.'; end if;
 stage_value:=p_log->>'stage';month_value:=(p_log->>'check_month')::date;date_value:=(p_log->>'check_date')::date;state_value:=p_log->>'task_state';
 insert into public.development_logs(site_id,source_key,logged_on,staff_code,method,content,stage,check_month,check_date,task_state,next_action)
 values(p_site_id,p_log->>'source_key',(p_log->>'logged_on')::date,p_log->>'staff_code',p_log->>'method',p_log->>'content',stage_value,month_value,date_value,state_value,coalesce(p_log->>'next_action',''))
 on conflict(source_key) do nothing returning id into new_id;
 if new_id is null then
  select id into new_id from public.development_logs where source_key=p_log->>'source_key' and site_id=p_site_id;
  if new_id is null then raise exception '저장 키가 중복됩니다.'; end if;
  return new_id;
 end if;
 update public.development_sites set stage=stage_value,check_month=month_value,check_date=date_value,task_state=state_value,next_action=coalesce(p_log->>'next_action',''),classification_pending=false where id=p_site_id;
 return new_id;
end $$;
revoke execute on function public.development_add_log(uuid,jsonb) from public;
grant execute on function public.development_add_log(uuid,jsonb) to anon,authenticated,service_role;
commit;
