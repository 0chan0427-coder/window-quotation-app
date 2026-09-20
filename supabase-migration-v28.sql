-- V28: save selectable window colors on estimate items.
-- Run once in Supabase SQL Editor.
alter table public.estimate_items
  add column if not exists color text default '기본색';
