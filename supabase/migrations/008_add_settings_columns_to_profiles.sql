alter table profiles
  add column if not exists theme_preference text default 'dark',
  add column if not exists ai_search_depth text default 'standard',
  add column if not exists ai_auto_clarify boolean default true,
  add column if not exists connected_accounts jsonb default '{}'::jsonb,
  add column if not exists plan text default 'max';
