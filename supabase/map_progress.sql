create table if not exists public.map_progress (
  user_id uuid primary key references auth.users(id) on delete cascade,
  colors jsonb not null default '{}'::jsonb,
  palette_colors jsonb not null default '[]'::jsonb,
  landmarks jsonb not null default '[]'::jsonb,
  updated_at timestamptz not null default now()
);

alter table public.map_progress
add column if not exists landmarks jsonb not null default '[]'::jsonb;

alter table public.map_progress enable row level security;

drop policy if exists "Users can read own progress" on public.map_progress;
create policy "Users can read own progress"
on public.map_progress for select
using (auth.uid() = user_id);

drop policy if exists "Users can insert own progress" on public.map_progress;
create policy "Users can insert own progress"
on public.map_progress for insert
with check (auth.uid() = user_id);

drop policy if exists "Users can update own progress" on public.map_progress;
create policy "Users can update own progress"
on public.map_progress for update
using (auth.uid() = user_id)
with check (auth.uid() = user_id);
