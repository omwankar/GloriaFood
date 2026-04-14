create table if not exists public.restaurant_setup_settings (
  restaurant_id uuid primary key references public.restaurants(id) on delete cascade,
  public_slug text unique,
  alert_phone text,
  ordering_enabled boolean not null default true,
  min_order numeric(10,2) not null default 199,
  theme_color text default '#7e22ce',
  updated_at timestamptz not null default now()
);

alter table public.restaurant_setup_settings enable row level security;

drop policy if exists "settings_owner_read producers" on public.restaurant_setup_settings;
drop policy if exists "settings_owner_read" on public.restaurant_setup_settings;
create policy "settings_owner_read"
on public.restaurant_setup_settings
for select
to authenticated
using (
  exists (
    select 1
    from public.restaurants r
    where r.id = restaurant_id
      and r.owner_id = auth.uid()
  )
);

drop policy if exists "settings_owner_insert" on public.restaurant_setup_settings;
create policy "settings_owner_insert"
on public.restaurant_setup_settings
for insert
to authenticated
with check (
  exists (
    select 1
    from public.restaurants r
    where r.id = restaurant_id
      and r.owner_id = auth.uid()
  )
);

drop policy if exists "settings_owner_update" on public.restaurant_setup_settings;
create policy "settings_owner_update"
on public.restaurant_setup_settings
for update
to authenticated
using (
  exists (
    select 1
    from public.restaurants r
    where r.id = restaurant_id
      and r.owner_id = auth.uid()
  )
)
with check (
  exists (
    select 1
    from public.restaurants r
    where r.id = restaurant_id
      and r.owner_id = auth.uid()
  )
);

-- Public can read slug + storefront settings used for customer links
drop policy if exists "settings_public_read" on public.restaurant_setup_settings;
create policy "settings_public_read"
on public.restaurant_setup_settings
for select
to anon, authenticated
using (true);

