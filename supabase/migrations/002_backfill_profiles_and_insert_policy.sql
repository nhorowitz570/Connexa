-- Allow users to insert their own profile row if it is missing.
do $$
begin
  if not exists (
    select 1
    from pg_policies
    where schemaname = 'public'
      and tablename = 'profiles'
      and policyname = 'Users can insert own profile'
  ) then
    create policy "Users can insert own profile"
      on public.profiles for insert
      with check (auth.uid() = id);
  end if;
end
$$;

-- Backfill any missing profile rows for existing auth users.
insert into public.profiles (id, email, full_name)
select
  users.id,
  users.email,
  coalesce(users.raw_user_meta_data->>'full_name', users.raw_user_meta_data->>'name', null)
from auth.users as users
left join public.profiles as profiles
  on profiles.id = users.id
where profiles.id is null
  and users.email is not null;
