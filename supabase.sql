-- Run this once in Supabase > SQL Editor.
-- The public browser never writes directly to this table.
-- Your Node.js server inserts with the service-role key stored only in Render environment variables.

create extension if not exists pgcrypto;

create table if not exists public.portfolio_inquiries (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  email text not null,
  company text,
  service text not null,
  message text not null,
  source text not null default 'portfolio',
  status text not null default 'new' check (status in ('new', 'replied', 'closed', 'spam')),
  submitted_at timestamptz not null default now()
);

create index if not exists portfolio_inquiries_submitted_at_idx
  on public.portfolio_inquiries (submitted_at desc);

create index if not exists portfolio_inquiries_status_idx
  on public.portfolio_inquiries (status);

alter table public.portfolio_inquiries enable row level security;

-- Intentionally no public policies.
-- The service-role key used by your private backend bypasses RLS.
