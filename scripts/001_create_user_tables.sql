-- Create profiles table
create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  birth_date date,
  location text,
  interest_tags text[],
  display_name text,
  created_at timestamp with time zone default now(),
  updated_at timestamp with time zone default now()
);

-- Enable RLS
alter table public.profiles enable row level security;

-- RLS Policies for profiles
create policy "profiles_select_own"
  on public.profiles for select
  using (auth.uid() = id);

create policy "profiles_insert_own"
  on public.profiles for insert
  with check (auth.uid() = id);

create policy "profiles_update_own"
  on public.profiles for update
  using (auth.uid() = id);

create policy "profiles_delete_own"
  on public.profiles for delete
  using (auth.uid() = id);

-- Create favorites table
create table if not exists public.favorites (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade,
  organization_id text not null,
  organization_navn text,
  organization_aktivitet text,
  organization_poststed text,
  organization_kommune text,
  created_at timestamp with time zone default now()
);

alter table public.favorites enable row level security;

create policy "favorites_select_own"
  on public.favorites for select
  using (auth.uid() = user_id);

create policy "favorites_insert_own"
  on public.favorites for insert
  with check (auth.uid() = user_id);

create policy "favorites_delete_own"
  on public.favorites for delete
  using (auth.uid() = user_id);

create index idx_favorites_user_id on public.favorites(user_id);
create index idx_favorites_organization_id on public.favorites(organization_id);

-- Create bookmarks table
create table if not exists public.bookmarks (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade,
  organization_id text not null,
  organization_navn text,
  organization_aktivitet text,
  organization_poststed text,
  organization_kommune text,
  created_at timestamp with time zone default now()
);

alter table public.bookmarks enable row level security;

create policy "bookmarks_select_own"
  on public.bookmarks for select
  using (auth.uid() = user_id);

create policy "bookmarks_insert_own"
  on public.bookmarks for insert
  with check (auth.uid() = user_id);

create policy "bookmarks_delete_own"
  on public.bookmarks for delete
  using (auth.uid() = user_id);

create index idx_bookmarks_user_id on public.bookmarks(user_id);
create index idx_bookmarks_organization_id on public.bookmarks(organization_id);

-- Create chat_history table
create table if not exists public.chat_history (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade,
  role text not null check (role in ('user', 'assistant')),
  content text not null,
  attachments jsonb,
  organizations jsonb,
  created_at timestamp with time zone default now()
);

alter table public.chat_history enable row level security;

create policy "chat_history_select_own"
  on public.chat_history for select
  using (auth.uid() = user_id);

create policy "chat_history_insert_own"
  on public.chat_history for insert
  with check (auth.uid() = user_id);

create policy "chat_history_delete_own"
  on public.chat_history for delete
  using (auth.uid() = user_id);

create index idx_chat_history_user_id on public.chat_history(user_id);
create index idx_chat_history_created_at on public.chat_history(created_at desc);

-- Create quiz_results table
create table if not exists public.quiz_results (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade,
  volunteer_type text not null,
  completed_at timestamp with time zone default now()
);

alter table public.quiz_results enable row level security;

create policy "quiz_results_select_own"
  on public.quiz_results for select
  using (auth.uid() = user_id);

create policy "quiz_results_insert_own"
  on public.quiz_results for insert
  with check (auth.uid() = user_id);

create index idx_quiz_results_user_id on public.quiz_results(user_id);
