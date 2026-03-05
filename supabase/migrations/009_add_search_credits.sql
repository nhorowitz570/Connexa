alter table public.profiles
  add column if not exists search_credits_remaining integer default -1,
  add column if not exists search_credits_purchased integer default 0;

create table if not exists public.search_purchases (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid not null references auth.users(id) on delete cascade,
  credits integer not null,
  amount_cents integer not null,
  currency text not null default 'USD',
  status text not null default 'pending',
  payment_intent_id text,
  created_at timestamptz not null default now(),
  completed_at timestamptz
);

create index if not exists idx_search_purchases_user_id on public.search_purchases(user_id);
create index if not exists idx_search_purchases_status on public.search_purchases(status);

alter table public.search_purchases enable row level security;

drop policy if exists "Users can view own purchases" on public.search_purchases;
create policy "Users can view own purchases"
  on public.search_purchases for select
  using (auth.uid() = user_id);

drop policy if exists "Users can insert own purchases" on public.search_purchases;
create policy "Users can insert own purchases"
  on public.search_purchases for insert
  with check (auth.uid() = user_id);
