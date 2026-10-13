-- V69: 행사별 수동 재행사 검토. 기존 실적과 비용은 변경하지 않습니다.
begin;
alter table public.team_events
 add column if not exists region text not null default '',
 add column if not exists review_stage text not null default '미검토',
 add column if not exists review_tags text[] not null default '{}',
 add column if not exists review_note text not null default '',
 add column if not exists review_month date;
alter table public.team_events drop constraint if exists team_events_review_check;
alter table public.team_events add constraint team_events_review_check check (
 length(region) <= 80 and length(review_note) <= 1000
 and review_stage in ('미검토','우선 재협약','조건부 재협약','보류','재진행 제외')
 and review_tags <@ array['교체 수요 남음','교체 많이 완료','후속 상담 남음','자리 좋음','자리 나쁨','홍보 충분','홍보 부족','비용 부담','관리소 협조 좋음','관리소 협조 어려움','주변 단지와 함께 진행 가능','이동 부담','일정 기간 후 재검토']::text[]
 and array_position(review_tags,null) is null
 and (review_month is null or extract(day from review_month)=1)
);
create index if not exists team_events_region_review_idx on public.team_events(region,review_stage);
grant select, insert, update, delete on public.team_events to anon, authenticated, service_role;
commit;
