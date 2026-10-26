-- Plateful — logisch datamodel (functioneel ontwerp §9).
-- Elke gezinsgebonden tabel heeft household_id; toegang loopt via RLS (zie *_rls.sql).

create extension if not exists pgcrypto;

-- ── Huishoudens en accounts ────────────────────────────────────────────────
create table public.households (
  id uuid primary key default gen_random_uuid(),
  name text not null default 'Ons gezin' check (char_length(name) between 1 and 80),
  locale text not null default 'nl-NL',
  timezone text not null default 'Europe/Amsterdam',
  usual_diners smallint not null default 4 check (usual_diners between 1 and 12),
  weekday_minutes smallint check (weekday_minutes between 5 and 240),
  weekend_minutes smallint check (weekend_minutes between 5 and 240),
  dinner_time time,
  skill text not null default 'easy' check (skill in ('easy','medium')),
  equipment text[] not null default '{stove,oven}',
  weekly_budget_cents integer check (weekly_budget_cents is null or weekly_budget_cents between 0 and 10000000),
  meal_style text check (meal_style in ('mixed','vegetarian','fish','meat')),
  -- Na intrekken van toestemming voor gezondheidsgegevens: nooit 'past bij jullie gezin' tonen.
  safety_claims_blocked boolean not null default false,
  onboarding_step text not null default 'household',
  created_by uuid not null references auth.users(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.household_accounts (
  id uuid primary key default gen_random_uuid(),
  household_id uuid not null references public.households(id) on delete cascade,
  auth_user_id uuid not null references auth.users(id) on delete cascade,
  role text not null check (role in ('owner','co_parent')),
  status text not null default 'active' check (status in ('active','removed')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (household_id, auth_user_id)
);
create index on public.household_accounts (auth_user_id) where status = 'active';
-- V1: één actief huishouden per account.
create unique index household_accounts_one_active on public.household_accounts (auth_user_id) where status = 'active';

create table public.profiles (
  id uuid primary key default gen_random_uuid(),
  household_id uuid not null references public.households(id) on delete cascade,
  display_name text not null check (char_length(display_name) between 1 and 40),
  age_band text not null check (age_band in ('adult','teen16','child')),
  avatar text not null default 'p1' check (avatar ~ '^p[1-6]$'),
  active boolean not null default true,
  -- S-08: 'Ouder beslist over de maaltijd' (alleen relevant voor kinderen).
  parent_decides boolean not null default true,
  account_user_id uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (household_id, id)
);
create index on public.profiles (household_id);

create table public.consents (
  id uuid primary key default gen_random_uuid(),
  household_id uuid not null references public.households(id) on delete cascade,
  profile_id uuid,
  actor_user_id uuid not null references auth.users(id),
  purpose text not null check (purpose in ('terms_privacy','health_data','notifications')),
  consent_version text not null,
  granted_at timestamptz not null default now(),
  withdrawn_at timestamptz,
  foreign key (household_id, profile_id) references public.profiles(household_id, id) on delete cascade
);
create index on public.consents (household_id, purpose) where withdrawn_at is null;

create table public.invitations (
  id uuid primary key default gen_random_uuid(),
  household_id uuid not null references public.households(id) on delete cascade,
  recipient_email_hash text not null,
  token_hash text not null unique,
  invited_role text not null default 'co_parent' check (invited_role = 'co_parent'),
  invited_by uuid not null references auth.users(id),
  expires_at timestamptz not null,
  status text not null default 'pending' check (status in ('pending','accepted','revoked','expired')),
  created_at timestamptz not null default now()
);

-- ── Catalogus (algemeen, niet gezinsgebonden tenzij owner_household_id) ─────
create table public.ingredients (
  id text primary key check (id ~ '^[a-z0-9-]+$'),
  canonical_name text not null,
  unit_kind text not null check (unit_kind in ('mass','volume','count')),
  synonyms text[] not null default '{}',
  category text not null check (category in ('groente_fruit','voorraad','koeling','brood_granen','overig')),
  allergen_status text not null check (allergen_status in ('verified','incomplete')),
  diet jsonb,
  price_estimate jsonb,
  status text not null default 'active' check (status in ('active','retired')),
  source text not null
);

create table public.ingredient_allergens (
  ingredient_id text not null references public.ingredients(id) on delete cascade,
  allergen_code text not null check (allergen_code in ('gluten','crustaceans','eggs','fish','peanuts','soy','milk','nuts','celery','mustard','sesame','sulphites','lupin','molluscs')),
  source text not null,
  primary key (ingredient_id, allergen_code)
);

create table public.recipes (
  id text primary key check (id ~ '^[a-z0-9-]+$'),
  owner_household_id uuid references public.households(id) on delete cascade,
  name text not null,
  image text not null default '',
  instructions jsonb not null,
  active_minutes smallint not null check (active_minutes > 0),
  total_minutes smallint not null check (total_minutes >= active_minutes),
  servings smallint not null check (servings between 1 and 12),
  equipment text[] not null default '{stove}',
  difficulty text not null check (difficulty in ('easy','medium')),
  cuisine text not null,
  main_protein text not null,
  tags text[] not null default '{}',
  source text not null,
  review_status text not null check (review_status in ('reviewed','draft')),
  revision integer not null default 1,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  -- Eigen recepten kunnen nooit zelf 'reviewed' worden (§12.2.2: catalogus bepaalt geschiktheid).
  check (owner_household_id is null or review_status = 'draft')
);

create table public.recipe_ingredients (
  id uuid primary key default gen_random_uuid(),
  recipe_id text not null references public.recipes(id) on delete cascade,
  position smallint not null,
  ingredient_id text not null references public.ingredients(id),
  quantity numeric(10,2) not null check (quantity > 0),
  unit text not null check (unit in ('g','kg','ml','l','stuk','el','tl','blik','pak','bakje','teen','snuf')),
  optional boolean not null default false,
  component text not null check (component in ('base','sauce','topping','side')),
  preparation text not null default 'cooked' check (preparation in ('raw','cooked','sauce','baked','fried','any')),
  served_separately boolean not null default false,
  unique (recipe_id, position)
);

create table public.recipe_variants (
  id text primary key,
  recipe_id text not null references public.recipes(id) on delete cascade,
  variant_name text not null,
  changes_json jsonb not null,
  safety_review_status text not null check (safety_review_status in ('reviewed','unreviewed'))
);

-- Etiketcontrole per gezin (R-01: 'door de gebruiker gecontroleerd').
create table public.household_ingredient_checks (
  id uuid primary key default gen_random_uuid(),
  household_id uuid not null references public.households(id) on delete cascade,
  ingredient_id text not null references public.ingredients(id),
  contains_allergens text[] not null default '{}',
  diet jsonb,
  checked_by uuid not null references auth.users(id),
  checked_at timestamptz not null default now(),
  unique (household_id, ingredient_id)
);

-- ── Voorkeuren en harde regels ─────────────────────────────────────────────
create table public.profile_rules (
  id uuid primary key default gen_random_uuid(),
  household_id uuid not null,
  profile_id uuid not null,
  target_type text not null check (target_type in ('ingredient','allergen','tag','diet')),
  target_id text not null check (char_length(target_id) between 1 and 60),
  preparation text not null default 'any' check (preparation in ('raw','cooked','sauce','baked','fried','any')),
  severity text not null check (severity in ('HARD_ALLERGY','HARD_MEDICAL','HARD_DIET','STRONG_DISLIKE','SOFT_DISLIKE','NEUTRAL','UNKNOWN','LIKE')),
  source text not null check (source in ('adult','child_shared_device','teen','system')),
  created_by uuid references auth.users(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  foreign key (household_id, profile_id) references public.profiles(household_id, id) on delete cascade,
  unique (profile_id, target_type, target_id, preparation)
);
create index on public.profile_rules (household_id);

-- ── Planning ───────────────────────────────────────────────────────────────
create table public.meal_plans (
  id uuid primary key default gen_random_uuid(),
  household_id uuid not null references public.households(id) on delete cascade,
  week_start date not null check (extract(isodow from week_start) = 1),
  status text not null default 'active' check (status in ('draft','active','archived')),
  revision integer not null default 1,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (household_id, id)
);
create unique index meal_plans_one_active_week on public.meal_plans (household_id, week_start) where status = 'active';

create table public.meal_slots (
  id uuid primary key default gen_random_uuid(),
  household_id uuid not null,
  plan_id uuid not null,
  local_date date not null,
  recipe_id text references public.recipes(id),
  variant_ids text[] not null default '{}',
  servings smallint check (servings between 1 and 12),
  state text not null default 'draft' check (state in ('draft','proposed','accepted','cooking','completed','dismissed','changed','cancelled','blocked')),
  blocked_reason text,
  plan_b_note text,
  accepted_by uuid references auth.users(id),
  accepted_at timestamptz,
  revision integer not null default 1,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  foreign key (household_id, plan_id) references public.meal_plans(household_id, id) on delete cascade,
  unique (household_id, id),
  -- Eén hoofdgerecht per dag (§9).
  unique (plan_id, local_date)
);

create table public.meal_attendees (
  id uuid primary key default gen_random_uuid(),
  household_id uuid not null,
  slot_id uuid not null,
  profile_id uuid,
  guest_label text check (guest_label is null or char_length(guest_label) between 1 and 40),
  guest_allergies_known boolean not null default false,
  attendance text not null check (attendance in ('yes','no','unknown')),
  foreign key (household_id, slot_id) references public.meal_slots(household_id, id) on delete cascade,
  foreign key (household_id, profile_id) references public.profiles(household_id, id) on delete cascade,
  check ((profile_id is null) <> (guest_label is null))
);
create unique index meal_attendees_profile on public.meal_attendees (slot_id, profile_id) where profile_id is not null;

create table public.proposal_snapshots (
  id uuid primary key default gen_random_uuid(),
  household_id uuid not null,
  slot_id uuid not null,
  revision integer not null,
  input_hash text not null,
  safe_candidate_ids text[] not null,
  suggested_recipe_id text,
  alternative_recipe_ids text[] not null default '{}',
  reasons jsonb not null default '[]',
  warnings jsonb not null default '[]',
  engine_status text not null,
  ai_status text not null default 'not_used' check (ai_status in ('not_used','ok','unavailable','rejected')),
  invalidated_at timestamptz,
  created_at timestamptz not null default now(),
  foreign key (household_id, slot_id) references public.meal_slots(household_id, id) on delete cascade
);

-- Vorige revisies voor undo (S-05) en history (F-008).
create table public.slot_revisions (
  id uuid primary key default gen_random_uuid(),
  household_id uuid not null,
  slot_id uuid not null,
  revision integer not null,
  snapshot jsonb not null,
  event_type text not null,
  actor_user_id uuid references auth.users(id),
  undone_at timestamptz,
  created_at timestamptz not null default now(),
  foreign key (household_id, slot_id) references public.meal_slots(household_id, id) on delete cascade,
  unique (slot_id, revision)
);

-- ── Voorraad, boodschappen, restjes, feedback ──────────────────────────────
create table public.pantry_items (
  id uuid primary key default gen_random_uuid(),
  household_id uuid not null references public.households(id) on delete cascade,
  ingredient_id text not null references public.ingredients(id),
  quantity numeric(10,2) check (quantity is null or quantity >= 0),
  unit text check (unit in ('g','kg','ml','l','stuk','el','tl','blik','pak','bakje','teen','snuf')),
  status text not null default 'unknown' check (status in ('confirmed','unknown')),
  location text not null default 'kast' check (location in ('kast','koelkast','vriezer')),
  expires_at date,
  verified_at timestamptz,
  version integer not null default 1,
  updated_at timestamptz not null default now(),
  unique (household_id, ingredient_id)
);

create table public.shopping_lists (
  id uuid primary key default gen_random_uuid(),
  household_id uuid not null,
  plan_id uuid not null,
  revision integer not null default 1,
  updated_at timestamptz not null default now(),
  foreign key (household_id, plan_id) references public.meal_plans(household_id, id) on delete cascade,
  unique (household_id, id),
  unique (plan_id)
);

create table public.shopping_items (
  id uuid primary key default gen_random_uuid(),
  household_id uuid not null,
  list_id uuid not null,
  ingredient_id text references public.ingredients(id),
  item_key text,
  description text not null check (char_length(description) between 1 and 80),
  qty numeric(10,2),
  unit text,
  category text not null default 'overig' check (category in ('groente_fruit','voorraad','koeling','brood_granen','overig')),
  origin text not null check (origin in ('auto','manual')),
  state text not null default 'open' check (state in ('open','checked','removed')),
  not_needed boolean not null default false,
  check_status text not null default 'unknown' check (check_status in ('confirmed','check','unknown')),
  version integer not null default 1,
  updated_by uuid references auth.users(id),
  updated_at timestamptz not null default now(),
  foreign key (household_id, list_id) references public.shopping_lists(household_id, id) on delete cascade,
  check (origin = 'manual' or item_key is not null)
);
-- Dubbele requests mogen geen dubbele automatische regels opleveren (§8.3).
create unique index shopping_items_auto_key on public.shopping_items (list_id, item_key) where origin = 'auto';

create table public.leftovers (
  id uuid primary key default gen_random_uuid(),
  household_id uuid not null,
  source_slot_id uuid,
  label text not null check (char_length(label) between 1 and 80),
  portions smallint not null check (portions between 1 and 24),
  stored_at timestamptz not null default now(),
  storage text not null check (storage in ('fridge','freezer')),
  use_by timestamptz not null,
  status text not null default 'available' check (status in ('available','used','discarded','unsafe')),
  updated_at timestamptz not null default now(),
  foreign key (household_id) references public.households(id) on delete cascade,
  foreign key (household_id, source_slot_id) references public.meal_slots(household_id, id) on delete set null (source_slot_id),
  check (use_by > stored_at)
);

create table public.meal_feedback (
  id uuid primary key default gen_random_uuid(),
  household_id uuid not null,
  slot_id uuid not null,
  profile_id uuid,
  rating text not null check (rating in ('repeat','fine','rather_not')),
  comment text check (comment is null or char_length(comment) <= 300),
  created_by uuid references auth.users(id),
  created_at timestamptz not null default now(),
  foreign key (household_id, slot_id) references public.meal_slots(household_id, id) on delete cascade,
  foreign key (household_id, profile_id) references public.profiles(household_id, id) on delete cascade
);
create unique index meal_feedback_once on public.meal_feedback (slot_id, coalesce(profile_id, '00000000-0000-0000-0000-000000000000'::uuid));

-- ── Audit, idempotentie, verwijderverzoeken ────────────────────────────────
create table public.audit_events (
  id uuid primary key default gen_random_uuid(),
  household_id uuid references public.households(id) on delete cascade,
  actor_user_id uuid,
  event_type text not null,
  entity_id text,
  -- Nooit gevoelige waarden (allergie, dieet) loggen; alleen typen/ids.
  metadata_redacted jsonb not null default '{}',
  created_at timestamptz not null default now()
);
create index on public.audit_events (household_id, created_at desc);

create table public.idempotency_keys (
  household_id uuid not null references public.households(id) on delete cascade,
  key text not null check (char_length(key) between 8 and 100),
  endpoint text not null,
  response jsonb not null,
  created_at timestamptz not null default now(),
  primary key (household_id, key)
);

create table public.deletion_requests (
  id uuid primary key default gen_random_uuid(),
  auth_user_id uuid not null,
  household_id uuid,
  scope text not null check (scope in ('account','household')),
  status text not null default 'received' check (status in ('received','processed')),
  requested_at timestamptz not null default now(),
  processed_at timestamptz
);

-- updated_at bijhouden
create or replace function public.touch_updated_at() returns trigger language plpgsql as $$
begin new.updated_at := now(); return new; end $$;

do $$
declare t text;
begin
  foreach t in array array['households','household_accounts','profiles','recipes','profile_rules','meal_plans','meal_slots','pantry_items','shopping_lists','shopping_items','leftovers']
  loop
    execute format('create trigger %I_touch before update on public.%I for each row execute function public.touch_updated_at()', t, t);
  end loop;
end $$;
