-- Notes table for Supabase (PostgreSQL)
-- Derived from server/mock/notes.ts and types/notes.ts

create table if not exists public.notes (
  id text primary key,
  title text not null,
  content text not null,
  category text not null,
  source text not null,
  published_at timestamptz not null default now(),
  updated_by text not null
);

-- Helpful indexes for filtering/sorting
create index if not exists notes_published_at_idx on public.notes (published_at);
create index if not exists notes_category_idx on public.notes (category);
create index if not exists notes_source_idx on public.notes (source);
