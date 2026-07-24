-- =============================================
-- Torneos Relámpago - Supabase Schema
-- =============================================

-- Perfiles de usuario (se crea automáticamente al registrarse)
create table public.profiles (
  id uuid references auth.users on delete cascade primary key,
  name text,
  email text not null,
  phone text,
  avatar_url text,
  created_at timestamptz default now() not null,
  updated_at timestamptz default now() not null
);

-- Torneos
create table public.tournaments (
  id uuid default gen_random_uuid() primary key,
  organizer_id uuid references public.profiles(id) on delete cascade not null,
  name text not null,
  date date not null,
  location text not null,
  status text default 'setup' not null check (status in ('setup', 'active', 'completed')),
  match_time integer default 10 not null,
  has_extra_time boolean default false not null,
  penalties_per_team integer default 5 not null,
  public_id text unique not null,
  created_at timestamptz default now() not null,
  updated_at timestamptz default now() not null
);

-- Equipos
create table public.teams (
  id uuid default gen_random_uuid() primary key,
  tournament_id uuid references public.tournaments(id) on delete cascade not null,
  name text not null,
  seed integer default 0 not null,
  is_bye boolean default false not null
);

-- Canchas
create table public.courts (
  id uuid default gen_random_uuid() primary key,
  tournament_id uuid references public.tournaments(id) on delete cascade not null,
  name text not null,
  type text default 'main' not null check (type in ('main', 'penalties'))
);

-- Partidos
create table public.matches (
  id uuid default gen_random_uuid() primary key,
  tournament_id uuid references public.tournaments(id) on delete cascade not null,
  round integer not null,
  match_number integer not null,
  court_id uuid references public.courts(id) on delete set null,
  home_team_id uuid references public.teams(id) on delete set null,
  away_team_id uuid references public.teams(id) on delete set null,
  home_goals integer,
  away_goals integer,
  home_penalties integer,
  away_penalties integer,
  status text default 'pending' not null check (status in ('pending', 'ready', 'playing', 'tied', 'finished', 'bye', 'walkover')),
  winner_id uuid references public.teams(id) on delete set null,
  walkover_team_id uuid,
  started_at timestamptz,
  finished_at timestamptz,
  next_match_id uuid references public.matches(id) on delete set null,
  next_match_slot text check (next_match_slot in ('home', 'away')),
  created_at timestamptz default now() not null,
  updated_at timestamptz default now() not null
);

-- Índices
create index idx_tournaments_organizer on public.tournaments(organizer_id);
create index idx_tournaments_public on public.tournaments(public_id);
create index idx_teams_tournament on public.teams(tournament_id);
create index idx_courts_tournament on public.courts(tournament_id);
create index idx_matches_tournament on public.matches(tournament_id);
create index idx_matches_status on public.matches(status);

-- =============================================
-- Row Level Security (RLS)
-- =============================================

-- Todos empiezan sin acceso, se agrega por tabla
alter table public.profiles enable row level security;
alter table public.tournaments enable row level security;
alter table public.teams enable row level security;
alter table public.courts enable row level security;
alter table public.matches enable row level security;

-- Profiles: cada usuario ve/edita su propio perfil
create policy "Users see own profile" on public.profiles
  for all using (auth.uid() = id)
  with check (auth.uid() = id);

-- Tournaments: el organizador ve/sus torneos
create policy "Organizers see own tournaments" on public.tournaments
  for select using (auth.uid() = organizer_id);
create policy "Organizers insert own tournaments" on public.tournaments
  for insert with check (auth.uid() = organizer_id);
create policy "Organizers update own tournaments" on public.tournaments
  for update using (auth.uid() = organizer_id);

-- Teams: acceso público para lectura (vista pública), escritura solo organizador
create policy "Anyone can read teams" on public.teams
  for select using (
    exists (select 1 from public.tournaments t where t.id = tournament_id)
  );
create policy "Organizers manage teams" on public.teams
  for all using (
    auth.uid() = (select organizer_id from public.tournaments where id = tournament_id)
  );

-- Courts: mismo patrón
create policy "Anyone can read courts" on public.courts
  for select using (
    exists (select 1 from public.tournaments t where t.id = tournament_id)
  );
create policy "Organizers manage courts" on public.courts
  for all using (
    auth.uid() = (select organizer_id from public.tournaments where id = tournament_id)
  );

-- Matches: mismo patrón
create policy "Anyone can read matches" on public.matches
  for select using (
    exists (select 1 from public.tournaments t where t.id = tournament_id)
  );
create policy "Organizers manage matches" on public.matches
  for all using (
    auth.uid() = (select organizer_id from public.tournaments where id = tournament_id)
  );

-- Tournaments: acceso público para la vista pública (por publicId)
create policy "Public can read tournaments by public_id" on public.tournaments
  for select using (true);

-- =============================================
-- Trigger: auto-create profile on signup
-- =============================================
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, email, name)
  values (new.id, new.email, coalesce(new.raw_user_meta_data->>'name', split_part(new.email, '@', 1)));
  return new;
end;
$$ language plpgsql security definer;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- =============================================
-- Trigger: auto-update updated_at
-- =============================================
create or replace function public.handle_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

create trigger set_updated_at before update on public.tournaments
  for each row execute procedure public.handle_updated_at();

create trigger set_updated_at before update on public.profiles
  for each row execute procedure public.handle_updated_at();

create trigger set_updated_at before update on public.matches
  for each row execute procedure public.handle_updated_at();
