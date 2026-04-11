-- Users table (extends Supabase auth.users)
create table public.profiles (
  id uuid references auth.users(id) primary key,
  email text,
  full_name text,
  plan text default 'free',
  scans_used int default 0,
  scans_limit int default 3,
  created_at timestamptz default now()
);

-- Scans table
create table public.scans (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references public.profiles(id),
  domain text not null,
  score int,
  gemini_score int,
  claude_score int,
  chatgpt_score int,
  perplexity_score int,
  icp_data jsonb,
  results jsonb,
  created_at timestamptz default now()
);

-- Leads table (email captures from free scanner)
create table public.leads (
  id uuid default gen_random_uuid() primary key,
  email text not null,
  domain text,
  score int,
  created_at timestamptz default now()
);

-- Enable Row Level Security
alter table public.profiles enable row level security;
alter table public.scans enable row level security;
alter table public.leads enable row level security;

-- RLS Policies
create policy "Users can view own profile"
  on public.profiles for select
  using (auth.uid() = id);

create policy "Users can update own profile"
  on public.profiles for update
  using (auth.uid() = id);

create policy "Users can view own scans"
  on public.scans for select
  using (auth.uid() = user_id);

create policy "Users can insert own scans"
  on public.scans for insert
  with check (auth.uid() = user_id);

create policy "Service role can manage leads"
  on public.leads for all
  using (true);

-- Auto-create profile on signup
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, email, full_name)
  values (new.id, new.email, new.raw_user_meta_data->>'full_name');
  return new;
end;
$$ language plpgsql security definer;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();
