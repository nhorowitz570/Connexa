create table if not exists public.chat_threads (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  title text not null default 'New Chat',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.chat_messages (
  id uuid primary key default uuid_generate_v4(),
  thread_id uuid not null references public.chat_threads(id) on delete cascade,
  role text not null check (role in ('user', 'assistant')),
  content text not null,
  attachments jsonb not null default '[]'::jsonb,
  brief_refs jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists idx_chat_threads_user_id on public.chat_threads(user_id);
create index if not exists idx_chat_threads_updated_at on public.chat_threads(updated_at desc);
create index if not exists idx_chat_messages_thread_id on public.chat_messages(thread_id);
create index if not exists idx_chat_messages_created_at on public.chat_messages(created_at);

alter table public.chat_threads enable row level security;
alter table public.chat_messages enable row level security;

do $$
begin
  if not exists (
    select 1 from pg_policies where schemaname = 'public' and tablename = 'chat_threads' and policyname = 'Users can read own chat threads'
  ) then
    create policy "Users can read own chat threads"
      on public.chat_threads for select
      using (auth.uid() = user_id);
  end if;

  if not exists (
    select 1 from pg_policies where schemaname = 'public' and tablename = 'chat_threads' and policyname = 'Users can insert own chat threads'
  ) then
    create policy "Users can insert own chat threads"
      on public.chat_threads for insert
      with check (auth.uid() = user_id);
  end if;

  if not exists (
    select 1 from pg_policies where schemaname = 'public' and tablename = 'chat_threads' and policyname = 'Users can update own chat threads'
  ) then
    create policy "Users can update own chat threads"
      on public.chat_threads for update
      using (auth.uid() = user_id);
  end if;

  if not exists (
    select 1 from pg_policies where schemaname = 'public' and tablename = 'chat_threads' and policyname = 'Users can delete own chat threads'
  ) then
    create policy "Users can delete own chat threads"
      on public.chat_threads for delete
      using (auth.uid() = user_id);
  end if;

  if not exists (
    select 1 from pg_policies where schemaname = 'public' and tablename = 'chat_messages' and policyname = 'Users can read own chat messages'
  ) then
    create policy "Users can read own chat messages"
      on public.chat_messages for select
      using (
        thread_id in (
          select id from public.chat_threads where user_id = (select auth.uid())
        )
      );
  end if;

  if not exists (
    select 1 from pg_policies where schemaname = 'public' and tablename = 'chat_messages' and policyname = 'Users can insert own chat messages'
  ) then
    create policy "Users can insert own chat messages"
      on public.chat_messages for insert
      with check (
        thread_id in (
          select id from public.chat_threads where user_id = (select auth.uid())
        )
      );
  end if;

  if not exists (
    select 1 from pg_policies where schemaname = 'public' and tablename = 'chat_messages' and policyname = 'Users can update own chat messages'
  ) then
    create policy "Users can update own chat messages"
      on public.chat_messages for update
      using (
        thread_id in (
          select id from public.chat_threads where user_id = (select auth.uid())
        )
      );
  end if;

  if not exists (
    select 1 from pg_policies where schemaname = 'public' and tablename = 'chat_messages' and policyname = 'Users can delete own chat messages'
  ) then
    create policy "Users can delete own chat messages"
      on public.chat_messages for delete
      using (
        thread_id in (
          select id from public.chat_threads where user_id = (select auth.uid())
        )
      );
  end if;
end
$$;

do $$
begin
  if not exists (
    select 1 from pg_trigger where tgname = 'chat_threads_updated_at'
  ) then
    create trigger chat_threads_updated_at
      before update on public.chat_threads
      for each row execute function public.set_updated_at();
  end if;
end
$$;

insert into storage.buckets (id, name, public)
values ('chat-attachments', 'chat-attachments', false)
on conflict (id) do nothing;

do $$
begin
  if not exists (
    select 1 from pg_policies where schemaname = 'storage' and tablename = 'objects' and policyname = 'Users can view own chat attachments'
  ) then
    create policy "Users can view own chat attachments"
      on storage.objects for select
      using (
        bucket_id = 'chat-attachments'
        and auth.uid()::text = (storage.foldername(name))[1]
      );
  end if;

  if not exists (
    select 1 from pg_policies where schemaname = 'storage' and tablename = 'objects' and policyname = 'Users can upload own chat attachments'
  ) then
    create policy "Users can upload own chat attachments"
      on storage.objects for insert
      with check (
        bucket_id = 'chat-attachments'
        and auth.uid()::text = (storage.foldername(name))[1]
      );
  end if;

  if not exists (
    select 1 from pg_policies where schemaname = 'storage' and tablename = 'objects' and policyname = 'Users can delete own chat attachments'
  ) then
    create policy "Users can delete own chat attachments"
      on storage.objects for delete
      using (
        bucket_id = 'chat-attachments'
        and auth.uid()::text = (storage.foldername(name))[1]
      );
  end if;
end
$$;
