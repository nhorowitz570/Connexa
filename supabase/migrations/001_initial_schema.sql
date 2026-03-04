-- Enable UUID generation
create extension if not exists "uuid-ossp";

-- ============================================================
-- PROFILES
-- ============================================================
create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text not null,
  full_name text,
  created_at timestamptz not null default now()
);

alter table public.profiles enable row level security;

create policy "Users can read own profile"
  on public.profiles for select
  using (auth.uid() = id);

create policy "Users can update own profile"
  on public.profiles for update
  using (auth.uid() = id);

-- Auto-create profile on signup
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, email, full_name)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data->>'full_name', new.raw_user_meta_data->>'name', null)
  );
  return new;
end;
$$ language plpgsql security definer;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ============================================================
-- BRIEFS
-- ============================================================
create type brief_mode as enum ('simple', 'detailed');
create type brief_status as enum ('draft', 'clarifying', 'running', 'complete', 'failed');

create table public.briefs (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  mode brief_mode not null,
  raw_prompt text,
  normalized_brief jsonb,
  weights jsonb,
  status brief_status not null default 'draft',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index idx_briefs_user_id on public.briefs(user_id);
create index idx_briefs_status on public.briefs(status);

alter table public.briefs enable row level security;

create policy "Users can read own briefs"
  on public.briefs for select
  using (auth.uid() = user_id);

create policy "Users can insert own briefs"
  on public.briefs for insert
  with check (auth.uid() = user_id);

create policy "Users can update own briefs"
  on public.briefs for update
  using (auth.uid() = user_id);

-- ============================================================
-- BRIEF_QUESTIONS
-- ============================================================
create table public.brief_questions (
  id uuid primary key default uuid_generate_v4(),
  brief_id uuid not null references public.briefs(id) on delete cascade,
  questions jsonb not null,
  answers jsonb,
  confidence_before float,
  created_at timestamptz not null default now()
);

create index idx_brief_questions_brief_id on public.brief_questions(brief_id);

alter table public.brief_questions enable row level security;

create policy "Users can read own brief questions"
  on public.brief_questions for select
  using (
    brief_id in (
      select id from public.briefs where user_id = (select auth.uid())
    )
  );

create policy "Users can insert own brief questions"
  on public.brief_questions for insert
  with check (
    brief_id in (
      select id from public.briefs where user_id = (select auth.uid())
    )
  );

create policy "Users can update own brief questions"
  on public.brief_questions for update
  using (
    brief_id in (
      select id from public.briefs where user_id = (select auth.uid())
    )
  );

-- ============================================================
-- RUNS
-- ============================================================
create type run_status as enum ('running', 'complete', 'failed');

create table public.runs (
  id uuid primary key default uuid_generate_v4(),
  brief_id uuid not null references public.briefs(id) on delete cascade,
  status run_status not null default 'running',
  confidence_overall float,
  notes jsonb,
  tavily_queries jsonb,
  shortlist jsonb,
  created_at timestamptz not null default now()
);

create index idx_runs_brief_id on public.runs(brief_id);
create index idx_runs_status on public.runs(status);

alter table public.runs enable row level security;

create policy "Users can read own runs"
  on public.runs for select
  using (
    brief_id in (
      select id from public.briefs where user_id = (select auth.uid())
    )
  );

-- ============================================================
-- RESULTS
-- ============================================================
create table public.results (
  id uuid primary key default uuid_generate_v4(),
  run_id uuid not null references public.runs(id) on delete cascade,
  brief_id uuid not null references public.briefs(id) on delete cascade,
  origin text not null default 'external',
  company_name text not null,
  website_url text not null,
  contact_url text,
  contact_email text,
  geography text,
  services jsonb,
  industries jsonb,
  pricing_signals jsonb,
  portfolio_signals jsonb,
  evidence_links jsonb,
  score_overall int not null check (score_overall >= 0 and score_overall <= 100),
  score_breakdown jsonb,
  reasoning_summary text not null,
  reasoning_detailed jsonb,
  confidence float not null check (confidence >= 0 and confidence <= 1),
  created_at timestamptz not null default now()
);

create index idx_results_run_id on public.results(run_id);
create index idx_results_brief_id on public.results(brief_id);

alter table public.results enable row level security;

create policy "Users can read own results"
  on public.results for select
  using (
    brief_id in (
      select id from public.briefs where user_id = (select auth.uid())
    )
  );

-- ============================================================
-- UPDATED_AT TRIGGER
-- ============================================================
create or replace function public.set_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

create trigger briefs_updated_at
  before update on public.briefs
  for each row execute function public.set_updated_at();
