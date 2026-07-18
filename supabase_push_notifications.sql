-- Run this migration once in the Supabase SQL Editor.
-- The chat notification trigger and Settings screen both read this column.
alter table public.profiles
  add column if not exists push_notifications boolean not null default true;

