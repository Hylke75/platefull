-- Row Level Security (§11.2, R-10): ieder gezin is een strikt gescheiden tenant.
-- Policies kijken naar actief lidmaatschap in household_accounts via auth.uid() —
-- nooit naar user_metadata of een household_id uit een request.

create schema if not exists private;
revoke all on schema private from public;
grant usage on schema private to authenticated;

create or replace function private.is_member(hid uuid) returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (
    select 1 from public.household_accounts a
    where a.household_id = hid and a.auth_user_id = auth.uid() and a.status = 'active'
  );
$$;

create or replace function private.is_owner(hid uuid) returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (
    select 1 from public.household_accounts a
    where a.household_id = hid and a.auth_user_id = auth.uid() and a.status = 'active' and a.role = 'owner'
  );
$$;

create or replace function private.current_household() returns uuid
language sql stable security definer set search_path = '' as $$
  select a.household_id from public.household_accounts a
  where a.auth_user_id = auth.uid() and a.status = 'active' limit 1;
$$;

revoke all on function private.is_member(uuid), private.is_owner(uuid), private.current_household() from public;
grant execute on function private.is_member(uuid), private.is_owner(uuid), private.current_household() to authenticated;

-- RLS overal aan; anon heeft nergens toegang.
do $$
declare t text;
begin
  foreach t in array array[
    'households','household_accounts','profiles','consents','invitations','ingredients','ingredient_allergens',
    'recipes','recipe_ingredients','recipe_variants','household_ingredient_checks','profile_rules','meal_plans',
    'meal_slots','meal_attendees','proposal_snapshots','slot_revisions','pantry_items','shopping_lists',
    'shopping_items','leftovers','meal_feedback','audit_events','idempotency_keys','deletion_requests']
  loop
    execute format('alter table public.%I enable row level security', t);
    execute format('revoke all on public.%I from anon', t);
  end loop;
end $$;

-- Huishouden: lezen voor leden, wijzigen alleen eigenaar en mede-ouder (instellingen), aanmaken via functie.
create policy households_select on public.households for select to authenticated using (private.is_member(id));
create policy households_update on public.households for update to authenticated using (private.is_member(id)) with check (private.is_member(id));

create policy accounts_select on public.household_accounts for select to authenticated using (private.is_member(household_id));

-- Gezinsgebonden tabellen: volledige CRUD voor actieve leden van hetzelfde huishouden.
do $$
declare t text;
begin
  foreach t in array array['profiles','meal_plans','meal_slots','meal_attendees','proposal_snapshots','pantry_items',
                           'shopping_lists','shopping_items','leftovers','meal_feedback','household_ingredient_checks']
  loop
    execute format('create policy %I_select on public.%I for select to authenticated using (private.is_member(household_id))', t, t);
    execute format('create policy %I_insert on public.%I for insert to authenticated with check (private.is_member(household_id))', t, t);
    execute format('create policy %I_update on public.%I for update to authenticated using (private.is_member(household_id)) with check (private.is_member(household_id))', t, t);
    execute format('create policy %I_delete on public.%I for delete to authenticated using (private.is_member(household_id))', t, t);
  end loop;
end $$;

-- Automatische boodschappenregels worden alleen door de server-functies geschreven.
create policy shopping_items_manual_insert on public.shopping_items as restrictive for insert to authenticated with check (origin = 'manual');
create policy shopping_items_manual_delete on public.shopping_items as restrictive for delete to authenticated using (origin = 'manual');

-- Revisies en audit: alleen lezen/toevoegen, nooit wijzigen of wissen via de API.
create policy slot_revisions_select on public.slot_revisions for select to authenticated using (private.is_member(household_id));
create policy slot_revisions_insert on public.slot_revisions for insert to authenticated with check (private.is_member(household_id));
create policy audit_select on public.audit_events for select to authenticated using (private.is_member(household_id));
create policy audit_insert on public.audit_events for insert to authenticated with check (private.is_member(household_id) and actor_user_id = auth.uid());
create policy idem_select on public.idempotency_keys for select to authenticated using (private.is_member(household_id));
create policy idem_insert on public.idempotency_keys for insert to authenticated with check (private.is_member(household_id));

-- Toestemmingen: lezen voor leden; vastleggen alleen als jezelf.
create policy consents_select on public.consents for select to authenticated using (private.is_member(household_id));
create policy consents_insert on public.consents for insert to authenticated with check (private.is_member(household_id) and actor_user_id = auth.uid());

-- Uitnodigingen: alleen eigenaar.
create policy invitations_owner on public.invitations for all to authenticated using (private.is_owner(household_id)) with check (private.is_owner(household_id) and invited_by = auth.uid());

-- Zachte voorkeuren mogen direct; harde regels uitsluitend via add_hard_rule/remove_hard_rule (§9: 'hard rule niet door child-facing API te wijzigen').
create policy rules_select on public.profile_rules for select to authenticated using (private.is_member(household_id));
create policy rules_insert_soft on public.profile_rules for insert to authenticated
  with check (private.is_member(household_id) and severity not in ('HARD_ALLERGY','HARD_MEDICAL','HARD_DIET'));
create policy rules_update_soft on public.profile_rules for update to authenticated
  using (private.is_member(household_id) and severity not in ('HARD_ALLERGY','HARD_MEDICAL','HARD_DIET'))
  with check (private.is_member(household_id) and severity not in ('HARD_ALLERGY','HARD_MEDICAL','HARD_DIET'));
create policy rules_delete_soft on public.profile_rules for delete to authenticated
  using (private.is_member(household_id) and severity not in ('HARD_ALLERGY','HARD_MEDICAL','HARD_DIET'));

-- Catalogus: algemene recepten voor iedereen leesbaar; eigen recepten alleen voor het eigen gezin.
create policy ingredients_read on public.ingredients for select to authenticated using (true);
create policy ingredient_allergens_read on public.ingredient_allergens for select to authenticated using (true);
create policy recipes_read on public.recipes for select to authenticated
  using (owner_household_id is null or private.is_member(owner_household_id));
create policy recipes_own_insert on public.recipes for insert to authenticated
  with check (owner_household_id is not null and private.is_member(owner_household_id) and review_status = 'draft');
create policy recipes_own_update on public.recipes for update to authenticated
  using (owner_household_id is not null and private.is_member(owner_household_id))
  with check (owner_household_id is not null and private.is_member(owner_household_id) and review_status = 'draft');
create policy recipes_own_delete on public.recipes for delete to authenticated
  using (owner_household_id is not null and private.is_member(owner_household_id));

create policy recipe_ingredients_read on public.recipe_ingredients for select to authenticated
  using (exists (select 1 from public.recipes r where r.id = recipe_id and (r.owner_household_id is null or private.is_member(r.owner_household_id))));
create policy recipe_ingredients_own_write on public.recipe_ingredients for all to authenticated
  using (exists (select 1 from public.recipes r where r.id = recipe_id and r.owner_household_id is not null and private.is_member(r.owner_household_id)))
  with check (exists (select 1 from public.recipes r where r.id = recipe_id and r.owner_household_id is not null and private.is_member(r.owner_household_id)));
create policy recipe_variants_read on public.recipe_variants for select to authenticated
  using (exists (select 1 from public.recipes r where r.id = recipe_id and (r.owner_household_id is null or private.is_member(r.owner_household_id))));
-- Varianten van eigen recepten zijn nooit 'reviewed'.
create policy recipe_variants_own_write on public.recipe_variants for all to authenticated
  using (exists (select 1 from public.recipes r where r.id = recipe_id and r.owner_household_id is not null and private.is_member(r.owner_household_id)))
  with check (safety_review_status = 'unreviewed' and exists (select 1 from public.recipes r where r.id = recipe_id and r.owner_household_id is not null and private.is_member(r.owner_household_id)));

-- Verwijderverzoeken: alleen eigen verzoeken zien.
create policy deletion_select on public.deletion_requests for select to authenticated using (auth_user_id = auth.uid());

grant select, insert, update, delete on all tables in schema public to authenticated;
-- Velden die nooit via de API mogen veranderen.
revoke update on public.households from authenticated;
grant update (name, usual_diners, weekday_minutes, weekend_minutes, dinner_time, skill, equipment, weekly_budget_cents, meal_style, onboarding_step) on public.households to authenticated;
revoke insert, update, delete on public.household_accounts from authenticated;
revoke update, delete on public.consents from authenticated;
revoke insert, update, delete on public.ingredients, public.ingredient_allergens from authenticated;
revoke update, delete on public.audit_events, public.slot_revisions, public.idempotency_keys from authenticated;
revoke insert, update, delete on public.deletion_requests from authenticated;
-- Plan- en slotmutaties lopen uitsluitend via de transactionele functies (versiecontrole, audit, undo).
revoke insert, update, delete on public.meal_slots, public.meal_plans, public.meal_attendees, public.shopping_lists from authenticated;
revoke update, delete on public.proposal_snapshots from authenticated;
-- Boodschappenitems: afvinken en handmatige items mag direct (realtime), automatische regels alleen via functies.
revoke update on public.shopping_items from authenticated;
grant update (state, version, updated_by) on public.shopping_items to authenticated;
