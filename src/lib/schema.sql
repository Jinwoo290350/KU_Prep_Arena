-- Run this in the Supabase dashboard SQL editor
-- Project: https://zvkfvgwmdwmuudxatnng.supabase.co

create table if not exists app_users (
  id uuid default gen_random_uuid() primary key,
  username text unique not null,
  salt text not null,
  password_hash text not null,
  created_at timestamp with time zone default now()
);

create index if not exists app_users_username_idx on app_users(username);

create table if not exists scores (
  id uuid default gen_random_uuid() primary key,
  user_email text not null,
  game_id text not null,
  score integer not null,
  created_at timestamp with time zone default now()
);

create table if not exists exams (
  id uuid default gen_random_uuid() primary key,
  user_email text not null,
  name text not null,
  date text not null,
  created_at timestamp with time zone default now()
);

create index on scores(user_email);
create index on exams(user_email);
