-- Cited — knowledge-base retrieval (Agent Spec §4, §6).
-- Holds chunks of kb/ only. Nothing from eval/ or docs/ is ever written here.
-- Embeddings: Voyage voyage-3.5, 1024 dims. Changing model or dims needs a new migration.

create extension if not exists vector with schema extensions;

create table public.kb_documents (
  source_id      text primary key check (source_id ~ '^KB-\d{2}$'),
  title          text not null,
  file_name      text not null unique,
  content_sha256 text not null,
  ingested_at    timestamptz not null default now()
);

create table public.kb_chunks (
  id              bigint generated always as identity primary key,
  source_id       text not null references public.kb_documents (source_id) on delete cascade,
  chunk_index     int not null,
  section         text,
  category        text not null,
  text            text not null,
  token_estimate  int not null,
  embedding_model text not null,
  embedding       extensions.vector(1024) not null,
  unique (source_id, chunk_index)
);

create index kb_chunks_embedding_idx on public.kb_chunks
  using hnsw (embedding extensions.vector_cosine_ops);
create index kb_chunks_category_idx on public.kb_chunks (category);

-- Server-side access only (service role). No policies = no anon/authenticated access.
alter table public.kb_documents enable row level security;
alter table public.kb_chunks enable row level security;

-- Top-k cosine search. score = cosine similarity (1 = identical).
create or replace function public.match_kb_chunks(
  query_embedding extensions.vector(1024),
  match_count     int  default 5,
  filter_category text default null
)
returns table (source_id text, title text, section text, text text, score double precision)
language sql
stable
set search_path = public, extensions
as $$
  select c.source_id, d.title, c.section, c.text,
         1 - (c.embedding <=> query_embedding) as score
  from kb_chunks c
  join kb_documents d on d.source_id = c.source_id
  where filter_category is null or c.category = filter_category
  order by c.embedding <=> query_embedding
  limit match_count;
$$;

revoke execute on function public.match_kb_chunks(extensions.vector, int, text) from public, anon, authenticated;
