-- Haftalık ders içerikleri. Her satır bir hafta (icerik/<slug>/ klasörünün karşılığı).
create table if not exists public.haftalar (
  slug        text primary key,            -- 'hafta-01', 'ornek-hafta' ...
  sira        int  not null default 0,     -- listede sıralama
  baslik      text not null,               -- 'Hafta 1'
  konu        text not null default '',    -- 'Present Perfect vs. Past Simple'
  ozet        jsonb not null,
  calisma     jsonb not null,
  test        jsonb not null,
  guncellendi timestamptz not null default now()
);

-- Güvenlik: herkes OKUYABİLİR, kimse uygulamadan YAZAMAZ.
-- Yükleme yalnızca yönetici yetkisiyle (Supabase MCP / SQL Editor) yapılır.
alter table public.haftalar enable row level security;

drop policy if exists "herkes okuyabilir" on public.haftalar;
create policy "herkes okuyabilir" on public.haftalar
  for select to anon, authenticated using (true);

revoke insert, update, delete on public.haftalar from anon, authenticated;
grant select on public.haftalar to anon, authenticated;
