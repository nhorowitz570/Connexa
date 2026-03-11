create table if not exists public.brief_attachments (
  id uuid primary key default uuid_generate_v4(),
  brief_id uuid not null references public.briefs(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  file_name text not null,
  file_type text not null,
  file_size integer not null,
  storage_path text not null,
  text_content text,
  created_at timestamptz not null default now()
);

create index if not exists idx_brief_attachments_brief_id on public.brief_attachments(brief_id);
create index if not exists idx_brief_attachments_user_id on public.brief_attachments(user_id);

alter table public.brief_attachments enable row level security;

do $$
begin
  if not exists (
    select 1 from pg_policies where schemaname = 'public' and tablename = 'brief_attachments' and policyname = 'Users can read own brief attachments'
  ) then
    create policy "Users can read own brief attachments"
      on public.brief_attachments for select
      using (user_id = auth.uid());
  end if;

  if not exists (
    select 1 from pg_policies where schemaname = 'public' and tablename = 'brief_attachments' and policyname = 'Users can insert own brief attachments'
  ) then
    create policy "Users can insert own brief attachments"
      on public.brief_attachments for insert
      with check (
        user_id = auth.uid()
        and brief_id in (select id from public.briefs where user_id = auth.uid())
      );
  end if;

  if not exists (
    select 1 from pg_policies where schemaname = 'public' and tablename = 'brief_attachments' and policyname = 'Users can delete own brief attachments'
  ) then
    create policy "Users can delete own brief attachments"
      on public.brief_attachments for delete
      using (user_id = auth.uid());
  end if;
end
$$;

insert into storage.buckets (id, name, public)
values ('brief-attachments', 'brief-attachments', false)
on conflict (id) do nothing;

do $$
begin
  if not exists (
    select 1 from pg_policies where schemaname = 'storage' and tablename = 'objects' and policyname = 'Users can view own brief attachments'
  ) then
    create policy "Users can view own brief attachments"
      on storage.objects for select
      using (
        bucket_id = 'brief-attachments'
        and auth.uid()::text = (storage.foldername(name))[1]
      );
  end if;

  if not exists (
    select 1 from pg_policies where schemaname = 'storage' and tablename = 'objects' and policyname = 'Users can upload own brief attachments'
  ) then
    create policy "Users can upload own brief attachments"
      on storage.objects for insert
      with check (
        bucket_id = 'brief-attachments'
        and auth.uid()::text = (storage.foldername(name))[1]
      );
  end if;

  if not exists (
    select 1 from pg_policies where schemaname = 'storage' and tablename = 'objects' and policyname = 'Users can delete own brief attachments'
  ) then
    create policy "Users can delete own brief attachments"
      on storage.objects for delete
      using (
        bucket_id = 'brief-attachments'
        and auth.uid()::text = (storage.foldername(name))[1]
      );
  end if;
end
$$;
