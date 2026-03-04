create table if not exists public.analytics_daily (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  date date not null,
  total_briefs int not null default 0,
  completed_briefs int not null default 0,
  failed_briefs int not null default 0,
  avg_score float,
  avg_confidence float,
  miss_reasons jsonb not null default '{}'::jsonb,
  missed_opportunities int not null default 0,
  created_at timestamptz not null default now(),
  unique (user_id, date)
);

create table if not exists public.analytics_recommendations (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  date date not null,
  recommendations jsonb not null,
  model_used text,
  created_at timestamptz not null default now(),
  unique (user_id, date)
);

create index if not exists idx_analytics_daily_user_date on public.analytics_daily(user_id, date desc);
create index if not exists idx_analytics_recommendations_user_date on public.analytics_recommendations(user_id, date desc);

alter table public.analytics_daily enable row level security;
alter table public.analytics_recommendations enable row level security;

do $$
begin
  if not exists (
    select 1 from pg_policies where schemaname = 'public' and tablename = 'analytics_daily' and policyname = 'Users can read own analytics daily'
  ) then
    create policy "Users can read own analytics daily"
      on public.analytics_daily for select
      using (auth.uid() = user_id);
  end if;

  if not exists (
    select 1 from pg_policies where schemaname = 'public' and tablename = 'analytics_recommendations' and policyname = 'Users can read own analytics recommendations'
  ) then
    create policy "Users can read own analytics recommendations"
      on public.analytics_recommendations for select
      using (auth.uid() = user_id);
  end if;
end
$$;
