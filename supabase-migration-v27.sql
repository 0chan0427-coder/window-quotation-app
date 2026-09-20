-- V27 schema additions. Run once in Supabase SQL Editor.
alter table public.estimates
  add column if not exists customer_phone text,
  add column if not exists staff_id integer,
  add column if not exists staff_name text,
  add column if not exists extras_data jsonb default '{}'::jsonb,
  add column if not exists payment_data jsonb default null,
  add column if not exists estimate_no text;

alter table public.estimate_items
  add column if not exists window_kind text,
  add column if not exists screen_option text default '자동';
