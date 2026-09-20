-- V29: explicit selectable window color and compatibility
alter table public.estimate_items
  add column if not exists color text default '기본색';

-- Existing rows remain valid; empty/null colors are treated as 기본색 by the app.
