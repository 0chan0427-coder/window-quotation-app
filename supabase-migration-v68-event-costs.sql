-- V68: 행사별 비용 내역. 기존 행사/실적은 그대로 유지됩니다.
begin;
alter table public.team_events add column if not exists expense_items jsonb not null default '[]'::jsonb;
create or replace function public.valid_team_event_expenses(items jsonb)
returns boolean language plpgsql immutable set search_path = public as $$
declare item jsonb; cost numeric;
begin
 if jsonb_typeof(items) <> 'array' or jsonb_array_length(items) > 100 then return false; end if;
 for item in select value from jsonb_array_elements(items) loop
  if jsonb_typeof(item) <> 'object' or jsonb_typeof(item->'name') is distinct from 'string'
   or length(trim(item->>'name')) not between 1 and 100
   or jsonb_typeof(item->'amount') is distinct from 'number'
   or jsonb_typeof(item->'memo') is distinct from 'string'
   or length(item->>'memo') > 300 then return false; end if;
  cost := (item->>'amount')::numeric;
  if cost < 0 or cost > 9007199254740991 or cost <> trunc(cost) then return false; end if;
 end loop;
 return true;
exception when others then return false;
end $$;
alter table public.team_events drop constraint if exists team_events_expense_items_check;
alter table public.team_events add constraint team_events_expense_items_check check (public.valid_team_event_expenses(expense_items));
grant execute on function public.valid_team_event_expenses(jsonb) to anon, authenticated, service_role;
commit;
