-- Sentinel core tables
create extension if not exists "pgcrypto";

create table if not exists public.reports (
  id uuid primary key default gen_random_uuid(),
  target_company text not null,
  analysis_type text default 'general',
  share_hash text not null unique,
  final_report text not null,
  swot jsonb,
  discovered_urls jsonb default '[]'::jsonb,
  social_post text,
  logs jsonb default '[]'::jsonb,
  ip_hash text,
  user_id uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now()
);

create index if not exists reports_share_hash_idx on public.reports (share_hash);
create index if not exists reports_created_at_idx on public.reports (created_at desc);
create index if not exists reports_target_idx on public.reports (target_company);
create index if not exists reports_user_idx on public.reports (user_id);

alter table public.reports enable row level security;

drop policy if exists reports_public_read on public.reports;
create policy reports_public_read on public.reports for select using (true);

drop policy if exists reports_user_insert on public.reports;
create policy reports_user_insert on public.reports for insert
  with check (auth.uid() = user_id or user_id is null);

drop policy if exists reports_user_delete on public.reports;
create policy reports_user_delete on public.reports for delete using (auth.uid() = user_id);
