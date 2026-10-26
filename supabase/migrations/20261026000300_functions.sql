-- Transactionele domeinfuncties (§8, §10).
-- Alle functies zijn SECURITY DEFINER en controleren zelf lidmaatschap via auth.uid().
-- Fouten gebruiken PostgREST-statuscodes (PTxxx) zodat de API ze kan vertalen naar §10-foutcodes.

alter table public.profiles add column restrictions_status text not null default 'unknown'
  check (restrictions_status in ('unknown','none','recorded'));
comment on column public.profiles.restrictions_status is
  'O-05: unknown = nog niet bekend (nooit "geen allergie" veronderstellen); none = volwassene verklaarde geen harde beperkingen; recorded = harde regels vastgelegd.';

-- ── Hulpfuncties ───────────────────────────────────────────────────────────
create or replace function private.require_member(hid uuid) returns void
language plpgsql stable security definer set search_path = '' as $$
begin
  if auth.uid() is null then raise exception 'unauthenticated' using errcode = 'PT401'; end if;
  if hid is null or not private.is_member(hid) then raise exception 'forbidden' using errcode = 'PT403'; end if;
end $$;

create or replace function private.audit(hid uuid, ev text, entity text, meta jsonb default '{}') returns void
language sql security definer set search_path = '' as $$
  insert into public.audit_events (household_id, actor_user_id, event_type, entity_id, metadata_redacted)
  values (hid, auth.uid(), ev, entity, coalesce(meta, '{}'::jsonb));
$$;

create or replace function private.has_health_consent(hid uuid) returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (select 1 from public.consents c where c.household_id = hid and c.purpose = 'health_data' and c.withdrawn_at is null);
$$;

-- §8.1 overgangen (gelijk aan src/domain/slot-state.ts).
create or replace function private.can_transition(f text, t text) returns boolean
language sql immutable as $$
  select case f
    when 'draft' then t in ('proposed','blocked')
    when 'proposed' then t in ('accepted','dismissed','blocked','proposed')
    when 'accepted' then t in ('cooking','changed','cancelled','blocked','accepted','proposed')
    when 'changed' then t in ('accepted','cooking','cancelled','blocked')
    when 'cooking' then t in ('completed','cancelled')
    when 'completed' then false
    when 'dismissed' then t in ('proposed')
    when 'cancelled' then t in ('proposed')
    when 'blocked' then t in ('proposed')
    else false end;
$$;

-- Ingrediënten na toepassing van varianten (gelijk aan effectiveIngredients in src/domain/safety.ts).
create or replace function private.effective_ingredients(p_recipe_id text, p_variant_ids text[])
returns table (ingredient_id text, replaced_from text)
language plpgsql stable security definer set search_path = '' as $$
declare
  ids text[];
  froms text[];
  keep boolean[];
  v record;
  c jsonb;
  i int;
begin
  select coalesce(array_agg(ri.ingredient_id order by ri.position), '{}') into ids from public.recipe_ingredients ri where ri.recipe_id = p_recipe_id;
  froms := array_fill(null::text, array[greatest(cardinality(ids), 1)]);
  keep := array_fill(true, array[greatest(cardinality(ids), 1)]);
  for v in
    select rv.changes_json from public.recipe_variants rv
    where rv.recipe_id = p_recipe_id and rv.id = any(coalesce(p_variant_ids, '{}'))
    order by array_position(p_variant_ids, rv.id)
  loop
    for c in select * from jsonb_array_elements(v.changes_json) loop
      for i in 1 .. cardinality(ids) loop
        if c->>'op' = 'remove' and ids[i] = c->>'ingredientId' then keep[i] := false;
        elsif c->>'op' = 'replace' and ids[i] = c->>'from' then ids[i] := c->>'to'; froms[i] := c->>'from';
        end if;
      end loop;
    end loop;
  end loop;
  for i in 1 .. cardinality(ids) loop
    if keep[i] then ingredient_id := ids[i]; replaced_from := froms[i]; return next; end if;
  end loop;
end $$;

-- Aantal harde overtredingen voor een recept + varianten + eters. 0 = veilig.
-- Zelfde regels als checkHardRules (src/domain/safety.ts); tests/db/consistency.test.ts bewaakt dat ze gelijk blijven.
create or replace function private.hard_violations(p_household uuid, p_recipe_id text, p_variant_ids text[], p_profile_ids uuid[])
returns integer
language plpgsql stable security definer set search_path = '' as $$
declare
  rec record;
  n int := 0;
  rule record;
  ing record;
  has_rules boolean;
begin
  select * into rec from public.recipes r where r.id = p_recipe_id and (r.owner_household_id is null or r.owner_household_id = p_household);
  if not found then return 1000; end if;
  -- Varianten moeten bij dit recept horen.
  if exists (select 1 from unnest(coalesce(p_variant_ids, '{}')) vid where not exists (select 1 from public.recipe_variants rv where rv.id = vid and rv.recipe_id = p_recipe_id)) then
    return 1000;
  end if;

  select exists (select 1 from public.profile_rules pr where pr.household_id = p_household and pr.profile_id = any(p_profile_ids) and pr.severity in ('HARD_ALLERGY','HARD_MEDICAL','HARD_DIET')) into has_rules;
  if not has_rules then return 0; end if;
  if rec.review_status <> 'reviewed' then return 1; end if;
  if exists (select 1 from public.recipe_variants rv where rv.id = any(coalesce(p_variant_ids, '{}')) and rv.safety_review_status <> 'reviewed') then return 1; end if;

  for rule in
    select * from public.profile_rules pr where pr.household_id = p_household and pr.profile_id = any(p_profile_ids) and pr.severity in ('HARD_ALLERGY','HARD_MEDICAL','HARD_DIET')
  loop
    if rule.target_type = 'tag' then
      if rule.target_id = any(rec.tags) then n := n + 1; end if;
      continue;
    end if;
    for ing in
      select e.ingredient_id, e.replaced_from,
             (i.allergen_status = 'verified' or chk.id is not null) as verified,
             coalesce(chk.diet, i.diet) as diet,
             array(select a.allergen_code from public.ingredient_allergens a where a.ingredient_id = e.ingredient_id) || coalesce(chk.contains_allergens, '{}') as allergens
      from private.effective_ingredients(p_recipe_id, p_variant_ids) e
      join public.ingredients i on i.id = e.ingredient_id
      left join public.household_ingredient_checks chk
        on chk.household_id = p_household and chk.ingredient_id = e.ingredient_id and chk.checked_at > now() - interval '180 days'
    loop
      if rule.target_type = 'allergen' then
        if rule.target_id = any(ing.allergens) or not ing.verified then n := n + 1; end if;
      elsif rule.target_type = 'ingredient' then
        if ing.ingredient_id = rule.target_id or ing.replaced_from = rule.target_id then n := n + 1;
        elsif rule.severity = 'HARD_ALLERGY' and not ing.verified then n := n + 1;
        end if;
      elsif rule.target_type = 'diet' then
        -- Onbekend kenmerk (null) telt als overtreding, net als in dietViolated().
        if ing.diet is null then n := n + 1;
        elsif rule.target_id = 'vegetarian' and (coalesce((ing.diet->>'meat')::boolean, true) or coalesce((ing.diet->>'fish')::boolean, true)) then n := n + 1;
        elsif rule.target_id = 'vegan' and (coalesce((ing.diet->>'meat')::boolean, true) or coalesce((ing.diet->>'fish')::boolean, true) or coalesce((ing.diet->>'animal')::boolean, true)) then n := n + 1;
        elsif rule.target_id = 'pescatarian' and coalesce((ing.diet->>'meat')::boolean, true) then n := n + 1;
        elsif rule.target_id = 'no_pork' and coalesce((ing.diet->>'pork')::boolean, true) then n := n + 1;
        end if;
      end if;
    end loop;
  end loop;
  return n;
end $$;

create or replace function private.slot_eaters(p_slot_id uuid) returns uuid[]
language sql stable security definer set search_path = '' as $$
  select coalesce(array_agg(a.profile_id), '{}') from public.meal_attendees a
  where a.slot_id = p_slot_id and a.profile_id is not null and a.attendance in ('yes','unknown');
$$;

-- U-07: na een nieuwe harde regel alle toekomstige voorstellen/slots opnieuw controleren.
create or replace function private.recheck_future_slots(hid uuid) returns integer
language plpgsql security definer set search_path = '' as $$
declare s record; n int := 0; tz text;
begin
  select timezone into tz from public.households where id = hid;
  update public.proposal_snapshots set invalidated_at = now() where household_id = hid and invalidated_at is null;
  for s in
    select * from public.meal_slots ms
    where ms.household_id = hid and ms.recipe_id is not null and ms.state in ('proposed','accepted','changed','cooking')
      and ms.local_date >= (now() at time zone coalesce(tz, 'Europe/Amsterdam'))::date
    for update
  loop
    if private.hard_violations(hid, s.recipe_id, s.variant_ids, private.slot_eaters(s.id)) > 0 then
      insert into public.slot_revisions (household_id, slot_id, revision, snapshot, event_type, actor_user_id)
      values (hid, s.id, s.revision, private.slot_snapshot(s.id), 'blocked_by_rule', auth.uid())
      on conflict (slot_id, revision) do nothing;
      update public.meal_slots set state = 'blocked', blocked_reason = 'hard_rule', revision = revision + 1 where id = s.id;
      update public.meal_plans set revision = revision + 1 where id = s.plan_id;
      n := n + 1;
    end if;
  end loop;
  return n;
end $$;

-- ── Huishouden aanmaken / uitnodigen ───────────────────────────────────────
create or replace function public.create_household(p_name text, p_usual_diners int, p_terms_version text)
returns uuid
language plpgsql security definer set search_path = '' as $$
declare hid uuid;
begin
  if auth.uid() is null then raise exception 'unauthenticated' using errcode = 'PT401'; end if;
  if exists (select 1 from public.household_accounts where auth_user_id = auth.uid() and status = 'active') then
    raise exception 'already_member' using errcode = 'PT409';
  end if;
  if p_terms_version is null or p_terms_version = '' then raise exception 'invalid_input' using errcode = 'PT400'; end if;
  insert into public.households (name, usual_diners, created_by)
  values (coalesce(nullif(trim(p_name), ''), 'Ons gezin'), coalesce(p_usual_diners, 4), auth.uid())
  returning id into hid;
  insert into public.household_accounts (household_id, auth_user_id, role) values (hid, auth.uid(), 'owner');
  insert into public.consents (household_id, actor_user_id, purpose, consent_version) values (hid, auth.uid(), 'terms_privacy', p_terms_version);
  perform private.audit(hid, 'household_created', hid::text);
  return hid;
end $$;

create or replace function public.accept_invitation(p_token text) returns uuid
language plpgsql security definer set search_path = '' as $$
declare inv record; email text;
begin
  if auth.uid() is null then raise exception 'unauthenticated' using errcode = 'PT401'; end if;
  select u.email into email from auth.users u where u.id = auth.uid();
  select * into inv from public.invitations i
  where i.token_hash = encode(extensions.digest(p_token, 'sha256'), 'hex') and i.status = 'pending' for update;
  if not found or inv.expires_at < now() then raise exception 'not_found' using errcode = 'PT404'; end if;
  if inv.recipient_email_hash <> encode(extensions.digest(lower(trim(email)), 'sha256'), 'hex') then
    raise exception 'forbidden' using errcode = 'PT403';
  end if;
  if exists (select 1 from public.household_accounts where auth_user_id = auth.uid() and status = 'active') then
    raise exception 'already_member' using errcode = 'PT409';
  end if;
  insert into public.household_accounts (household_id, auth_user_id, role) values (inv.household_id, auth.uid(), 'co_parent')
  on conflict (household_id, auth_user_id) do update set status = 'active', role = 'co_parent';
  update public.invitations set status = 'accepted' where id = inv.id;
  perform private.audit(inv.household_id, 'invitation_accepted', inv.id::text);
  return inv.household_id;
end $$;

-- ── Toestemming en harde regels (F-005, §2.1) ──────────────────────────────
create or replace function public.grant_health_consent(p_version text) returns void
language plpgsql security definer set search_path = '' as $$
declare hid uuid := private.current_household();
begin
  perform private.require_member(hid);
  if p_version is null or p_version = '' then raise exception 'invalid_input' using errcode = 'PT400'; end if;
  if not private.has_health_consent(hid) then
    insert into public.consents (household_id, actor_user_id, purpose, consent_version) values (hid, auth.uid(), 'health_data', p_version);
  end if;
  update public.households set safety_claims_blocked = false where id = hid;
  perform private.audit(hid, 'consent_granted', null, jsonb_build_object('purpose', 'health_data', 'version', p_version));
end $$;

-- Intrekken: gezondheidsgegevens verwijderen en 'veilig voor jou'-claims blokkeren.
create or replace function public.withdraw_health_consent() returns void
language plpgsql security definer set search_path = '' as $$
declare hid uuid := private.current_household();
begin
  perform private.require_member(hid);
  update public.consents set withdrawn_at = now() where household_id = hid and purpose = 'health_data' and withdrawn_at is null;
  delete from public.profile_rules where household_id = hid and severity in ('HARD_ALLERGY','HARD_MEDICAL','HARD_DIET');
  update public.profiles set restrictions_status = 'unknown' where household_id = hid;
  update public.households set safety_claims_blocked = true where id = hid;
  update public.proposal_snapshots set invalidated_at = now() where household_id = hid and invalidated_at is null;
  perform private.audit(hid, 'consent_withdrawn', null, jsonb_build_object('purpose', 'health_data'));
end $$;

create or replace function public.add_hard_rule(p_profile_id uuid, p_target_type text, p_target_id text, p_severity text)
returns jsonb
language plpgsql security definer set search_path = '' as $$
declare hid uuid; rid uuid; blocked int;
begin
  select household_id into hid from public.profiles where id = p_profile_id;
  perform private.require_member(hid);
  if p_severity not in ('HARD_ALLERGY','HARD_MEDICAL','HARD_DIET') then raise exception 'invalid_input' using errcode = 'PT400'; end if;
  if not private.has_health_consent(hid) then raise exception 'consent_required' using errcode = 'PT403'; end if;
  if p_target_type = 'allergen' and p_target_id not in ('gluten','crustaceans','eggs','fish','peanuts','soy','milk','nuts','celery','mustard','sesame','sulphites','lupin','molluscs') then
    raise exception 'invalid_input' using errcode = 'PT400';
  elsif p_target_type = 'diet' and (p_severity <> 'HARD_DIET' or p_target_id not in ('vegetarian','vegan','pescatarian','no_pork')) then
    raise exception 'invalid_input' using errcode = 'PT400';
  elsif p_target_type = 'ingredient' and not exists (select 1 from public.ingredients where id = p_target_id) then
    raise exception 'invalid_input' using errcode = 'PT400';
  elsif p_target_type not in ('allergen','diet','ingredient','tag') then
    raise exception 'invalid_input' using errcode = 'PT400';
  end if;
  -- Een harde regel vervangt een eventuele zachte voorkeur voor hetzelfde doel.
  delete from public.profile_rules where profile_id = p_profile_id and target_type = p_target_type and target_id = p_target_id;
  insert into public.profile_rules (household_id, profile_id, target_type, target_id, preparation, severity, source, created_by)
  values (hid, p_profile_id, p_target_type, p_target_id, 'any', p_severity, 'adult', auth.uid())
  returning id into rid;
  update public.profiles set restrictions_status = 'recorded' where id = p_profile_id;
  blocked := private.recheck_future_slots(hid);
  -- Geen gevoelige waarde in de audit: alleen het type.
  perform private.audit(hid, 'hard_rule_added', rid::text, jsonb_build_object('severity', p_severity, 'blocked_slots', blocked));
  return jsonb_build_object('rule_id', rid, 'blocked_slots', blocked);
end $$;

create or replace function public.remove_hard_rule(p_rule_id uuid) returns void
language plpgsql security definer set search_path = '' as $$
declare hid uuid; pid uuid;
begin
  select household_id, profile_id into hid, pid from public.profile_rules where id = p_rule_id and severity in ('HARD_ALLERGY','HARD_MEDICAL','HARD_DIET');
  perform private.require_member(hid);
  delete from public.profile_rules where id = p_rule_id;
  if not exists (select 1 from public.profile_rules where profile_id = pid and severity in ('HARD_ALLERGY','HARD_MEDICAL','HARD_DIET')) then
    update public.profiles set restrictions_status = 'unknown' where id = pid;
  end if;
  update public.proposal_snapshots set invalidated_at = now() where household_id = hid and invalidated_at is null;
  perform private.audit(hid, 'hard_rule_removed', p_rule_id::text);
end $$;

-- Volwassene verklaart expliciet 'geen bekende allergieën/medische beperkingen' (of zet terug naar onbekend).
create or replace function public.set_restrictions_status(p_profile_id uuid, p_status text) returns void
language plpgsql security definer set search_path = '' as $$
declare hid uuid;
begin
  select household_id into hid from public.profiles where id = p_profile_id;
  perform private.require_member(hid);
  if p_status not in ('unknown','none') then raise exception 'invalid_input' using errcode = 'PT400'; end if;
  if p_status = 'none' and not private.has_health_consent(hid) then raise exception 'consent_required' using errcode = 'PT403'; end if;
  if p_status = 'none' and exists (select 1 from public.profile_rules where profile_id = p_profile_id and severity in ('HARD_ALLERGY','HARD_MEDICAL','HARD_DIET')) then
    raise exception 'invalid_input' using errcode = 'PT400';
  end if;
  update public.profiles set restrictions_status = p_status where id = p_profile_id;
  perform private.audit(hid, 'restrictions_status_set', p_profile_id::text, jsonb_build_object('status', p_status));
end $$;

-- ── Planning ───────────────────────────────────────────────────────────────
create or replace function private.slot_snapshot(p_slot_id uuid) returns jsonb
language sql stable security definer set search_path = '' as $$
  select jsonb_build_object(
    'slot', (select to_jsonb(s) - 'created_at' - 'updated_at' from public.meal_slots s where s.id = p_slot_id),
    'attendees', coalesce((select jsonb_agg(to_jsonb(a) - 'id' order by a.profile_id, a.guest_label) from public.meal_attendees a where a.slot_id = p_slot_id), '[]'),
    'shopping', coalesce((
      select jsonb_agg(to_jsonb(i) - 'updated_at' - 'updated_by' order by i.item_key)
      from public.shopping_items i
      join public.shopping_lists l on l.id = i.list_id
      join public.meal_slots s on s.plan_id = l.plan_id and s.id = p_slot_id
      where i.origin = 'auto'), '[]')
  );
$$;

create or replace function public.ensure_week_plan(p_week_start date) returns uuid
language plpgsql security definer set search_path = '' as $$
declare hid uuid := private.current_household(); pid uuid; d int; sid uuid;
begin
  perform private.require_member(hid);
  if extract(isodow from p_week_start) <> 1 then raise exception 'invalid_input' using errcode = 'PT400'; end if;
  select id into pid from public.meal_plans where household_id = hid and week_start = p_week_start and status = 'active';
  if found then return pid; end if;
  insert into public.meal_plans (household_id, week_start) values (hid, p_week_start)
  on conflict do nothing returning id into pid;
  if pid is null then
    select id into pid from public.meal_plans where household_id = hid and week_start = p_week_start and status = 'active';
    return pid;
  end if;
  insert into public.shopping_lists (household_id, plan_id) values (hid, pid);
  for d in 0..6 loop
    insert into public.meal_slots (household_id, plan_id, local_date) values (hid, pid, p_week_start + d) returning id into sid;
    insert into public.meal_attendees (household_id, slot_id, profile_id, attendance)
    select hid, sid, p.id, 'yes' from public.profiles p where p.household_id = hid and p.active;
  end loop;
  perform private.audit(hid, 'week_plan_created', pid::text);
  return pid;
end $$;

-- Eén generieke, atomaire slotmutatie met versiecontrole, idempotentie, veiligheidscontrole, undo-snapshot en audit.
create or replace function public.commit_slot_change(
  p_slot_id uuid,
  p_expected_revision int,
  p_idempotency_key text,
  p_event_type text,
  p_new_state text,
  p_recipe_id text default null,
  p_variant_ids text[] default null,
  p_servings int default null,
  p_attendees jsonb default null,
  p_plan_b_note text default null,
  p_shopping jsonb default null,
  p_proposal jsonb default null
) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare
  s record;
  hid uuid;
  existing jsonb;
  new_recipe text;
  new_variants text[];
  eaters uuid[];
  lid uuid;
  item jsonb;
  result jsonb;
begin
  select household_id into hid from public.meal_slots where id = p_slot_id;
  perform private.require_member(hid);
  if p_event_type not in ('propose','swap','accept','plan_b_apply','attendance','start_cooking','complete','cancel','dismiss','manual_plan') then
    raise exception 'invalid_input' using errcode = 'PT400';
  end if;
  if p_idempotency_key is not null then
    select response into existing from public.idempotency_keys where household_id = hid and key = p_idempotency_key;
    if found then return existing; end if;
  end if;

  select * into s from public.meal_slots where id = p_slot_id for update;
  if s.revision <> p_expected_revision then
    raise exception 'revision_conflict' using errcode = 'PT409', detail = s.revision::text;
  end if;
  if p_new_state <> s.state and not private.can_transition(s.state, p_new_state) then
    raise exception 'invalid_transition' using errcode = 'PT422';
  end if;

  new_recipe := coalesce(p_recipe_id, s.recipe_id);
  new_variants := coalesce(p_variant_ids, s.variant_ids);

  -- Snapshot vóór de wijziging (undo/history).
  insert into public.slot_revisions (household_id, slot_id, revision, snapshot, event_type, actor_user_id)
  values (hid, s.id, s.revision, private.slot_snapshot(s.id), p_event_type, auth.uid())
  on conflict (slot_id, revision) do update set snapshot = excluded.snapshot, event_type = excluded.event_type, actor_user_id = excluded.actor_user_id, undone_at = null, created_at = now();

  if p_attendees is not null then
    delete from public.meal_attendees where slot_id = s.id;
    insert into public.meal_attendees (household_id, slot_id, profile_id, guest_label, guest_allergies_known, attendance)
    select hid, s.id, (a->>'profile_id')::uuid, nullif(a->>'guest_label', ''), coalesce((a->>'guest_allergies_known')::boolean, false), a->>'attendance'
    from jsonb_array_elements(p_attendees) a;
    if exists (select 1 from public.meal_attendees a left join public.profiles p on p.id = a.profile_id
               where a.slot_id = s.id and a.profile_id is not null and p.household_id is distinct from hid) then
      raise exception 'forbidden' using errcode = 'PT403';
    end if;
  end if;

  -- Harde regels worden in de database opnieuw gecontroleerd: ook een directe API-aanroep kan ze niet passeren.
  if new_recipe is not null and p_new_state in ('proposed','accepted','changed','cooking') then
    eaters := private.slot_eaters(s.id);
    if private.hard_violations(hid, new_recipe, new_variants, eaters) > 0 then
      raise exception 'unsafe_or_unavailable' using errcode = 'PT422';
    end if;
  end if;

  update public.meal_slots set
    state = p_new_state,
    recipe_id = new_recipe,
    variant_ids = new_variants,
    servings = coalesce(p_servings, servings),
    plan_b_note = case when p_event_type = 'plan_b_apply' then p_plan_b_note when p_event_type in ('swap','propose','manual_plan') then null else plan_b_note end,
    blocked_reason = case when p_new_state = 'blocked' then blocked_reason else null end,
    accepted_by = case when p_new_state = 'accepted' then auth.uid() else accepted_by end,
    accepted_at = case when p_new_state = 'accepted' then now() else accepted_at end,
    revision = revision + 1
  where id = s.id;

  if p_proposal is not null then
    insert into public.proposal_snapshots (household_id, slot_id, revision, input_hash, safe_candidate_ids, suggested_recipe_id, alternative_recipe_ids, reasons, warnings, engine_status, ai_status)
    values (hid, s.id, s.revision + 1, p_proposal->>'input_hash',
            array(select jsonb_array_elements_text(coalesce(p_proposal->'safe_candidate_ids', '[]'))),
            p_proposal->>'suggested_recipe_id',
            array(select jsonb_array_elements_text(coalesce(p_proposal->'alternative_recipe_ids', '[]'))),
            coalesce(p_proposal->'reasons', '[]'), coalesce(p_proposal->'warnings', '[]'),
            coalesce(p_proposal->>'engine_status', 'ok'), coalesce(p_proposal->>'ai_status', 'not_used'));
  end if;

  -- Boodschappen: de server stuurt de volledig herberekende automatische lijst (src/domain/shopping.ts).
  if p_shopping is not null then
    select id into lid from public.shopping_lists where plan_id = s.plan_id for update;
    for item in select * from jsonb_array_elements(p_shopping) loop
      if item->>'origin' <> 'auto' then continue; end if;
      insert into public.shopping_items (household_id, list_id, ingredient_id, item_key, description, qty, unit, category, origin, state, not_needed, check_status, updated_by)
      values (hid, lid, item->>'ingredient_id', item->>'item_key', item->>'description', (item->>'qty')::numeric, item->>'unit',
              coalesce(item->>'category', 'overig'), 'auto', coalesce(item->>'state', 'open'), coalesce((item->>'not_needed')::boolean, false),
              coalesce(item->>'check_status', 'unknown'), auth.uid())
      on conflict (list_id, item_key) where origin = 'auto' do update set
        description = excluded.description, qty = excluded.qty, unit = excluded.unit, category = excluded.category,
        state = excluded.state, not_needed = excluded.not_needed, check_status = excluded.check_status,
        version = public.shopping_items.version + 1, updated_by = auth.uid();
    end loop;
    -- Automatische regels die niet meer in de berekening voorkomen: 'niet meer nodig', nooit stil verwijderen.
    update public.shopping_items set not_needed = true, version = version + 1
    where list_id = lid and origin = 'auto' and not not_needed
      and item_key not in (select x->>'item_key' from jsonb_array_elements(p_shopping) x where x->>'origin' = 'auto');
    update public.shopping_lists set revision = revision + 1 where id = lid;
  end if;

  update public.meal_plans set revision = revision + 1 where id = s.plan_id;
  perform private.audit(hid, 'slot_' || p_event_type, s.id::text, jsonb_build_object('from', s.state, 'to', p_new_state, 'revision', s.revision + 1));

  result := jsonb_build_object('slot_id', s.id, 'revision', s.revision + 1, 'state', p_new_state, 'recipe_id', new_recipe);
  if p_idempotency_key is not null then
    insert into public.idempotency_keys (household_id, key, endpoint, response) values (hid, p_idempotency_key, p_event_type, result);
  end if;
  return result;
end $$;

-- Undo (S-05): binnen 10 minuten, één keer, alleen zolang er geen latere mutatie is.
create or replace function public.undo_slot_change(p_slot_id uuid, p_expected_revision int, p_idempotency_key text)
returns jsonb
language plpgsql security definer set search_path = '' as $$
declare
  s record; hid uuid; rev record; snap jsonb; existing jsonb; lid uuid; item jsonb; result jsonb;
begin
  select household_id into hid from public.meal_slots where id = p_slot_id;
  perform private.require_member(hid);
  if p_idempotency_key is not null then
    select response into existing from public.idempotency_keys where household_id = hid and key = p_idempotency_key;
    if found then return existing; end if;
  end if;
  select * into s from public.meal_slots where id = p_slot_id for update;
  if s.revision <> p_expected_revision then raise exception 'revision_conflict' using errcode = 'PT409', detail = s.revision::text; end if;

  select * into rev from public.slot_revisions
  where slot_id = s.id and revision = s.revision - 1 and event_type in ('accept','plan_b_apply','swap','attendance','manual_plan')
  for update;
  if not found then raise exception 'undo_unavailable' using errcode = 'PT409'; end if;
  if rev.undone_at is not null then raise exception 'undo_unavailable' using errcode = 'PT409'; end if;
  if rev.created_at < now() - interval '10 minutes' then raise exception 'undo_expired' using errcode = 'PT409'; end if;
  snap := rev.snapshot;

  delete from public.meal_attendees where slot_id = s.id;
  insert into public.meal_attendees (household_id, slot_id, profile_id, guest_label, guest_allergies_known, attendance)
  select hid, s.id, (a->>'profile_id')::uuid, a->>'guest_label', coalesce((a->>'guest_allergies_known')::boolean, false), a->>'attendance'
  from jsonb_array_elements(snap->'attendees') a;

  if (snap->'slot'->>'recipe_id') is not null and (snap->'slot'->>'state') in ('proposed','accepted','changed','cooking')
     and private.hard_violations(hid, snap->'slot'->>'recipe_id', array(select jsonb_array_elements_text(snap->'slot'->'variant_ids')), private.slot_eaters(s.id)) > 0 then
    raise exception 'unsafe_or_unavailable' using errcode = 'PT422';
  end if;

  update public.meal_slots set
    state = snap->'slot'->>'state',
    recipe_id = snap->'slot'->>'recipe_id',
    variant_ids = array(select jsonb_array_elements_text(snap->'slot'->'variant_ids')),
    servings = (snap->'slot'->>'servings')::smallint,
    plan_b_note = snap->'slot'->>'plan_b_note',
    revision = revision + 1
  where id = s.id;

  select id into lid from public.shopping_lists where plan_id = s.plan_id for update;
  for item in select * from jsonb_array_elements(snap->'shopping') loop
    insert into public.shopping_items (household_id, list_id, ingredient_id, item_key, description, qty, unit, category, origin, state, not_needed, check_status, updated_by)
    values (hid, lid, item->>'ingredient_id', item->>'item_key', item->>'description', (item->>'qty')::numeric, item->>'unit', item->>'category', 'auto',
            item->>'state', (item->>'not_needed')::boolean, item->>'check_status', auth.uid())
    on conflict (list_id, item_key) where origin = 'auto' do update set
      qty = excluded.qty, unit = excluded.unit, state = excluded.state, not_needed = excluded.not_needed,
      check_status = excluded.check_status, version = public.shopping_items.version + 1, updated_by = auth.uid();
  end loop;
  update public.shopping_items set not_needed = true, version = version + 1
  where list_id = lid and origin = 'auto' and not not_needed
    and item_key not in (select x->>'item_key' from jsonb_array_elements(snap->'shopping') x);
  update public.shopping_lists set revision = revision + 1 where id = lid;

  update public.slot_revisions set undone_at = now() where id = rev.id;
  update public.meal_plans set revision = revision + 1 where id = s.plan_id;
  perform private.audit(hid, 'slot_undo', s.id::text, jsonb_build_object('restored_revision', rev.revision));
  result := jsonb_build_object('slot_id', s.id, 'revision', s.revision + 1, 'state', snap->'slot'->>'state', 'recipe_id', snap->'slot'->>'recipe_id');
  if p_idempotency_key is not null then
    insert into public.idempotency_keys (household_id, key, endpoint, response) values (hid, p_idempotency_key, 'undo', result);
  end if;
  return result;
end $$;

-- ── Verwijderen (U-12) ─────────────────────────────────────────────────────
create or replace function public.request_deletion(p_scope text, p_confirm text) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare hid uuid := private.current_household(); others int; rid uuid;
begin
  if auth.uid() is null then raise exception 'unauthenticated' using errcode = 'PT401'; end if;
  if p_confirm <> 'VERWIJDEREN' then raise exception 'invalid_input' using errcode = 'PT400'; end if;
  if p_scope not in ('account','household') then raise exception 'invalid_input' using errcode = 'PT400'; end if;
  if p_scope = 'household' and not private.is_owner(hid) then raise exception 'forbidden' using errcode = 'PT403'; end if;
  insert into public.deletion_requests (auth_user_id, household_id, scope) values (auth.uid(), hid, p_scope) returning id into rid;
  -- Rechten direct intrekken.
  update public.household_accounts set status = 'removed' where auth_user_id = auth.uid();
  select count(*) into others from public.household_accounts where household_id = hid and status = 'active';
  if hid is not null and (p_scope = 'household' or others = 0) then
    delete from public.households where id = hid;
    update public.deletion_requests set status = 'processed', processed_at = now(), household_id = null where id = rid;
  elsif hid is not null and others > 0 then
    -- Eigenaarschap overdragen aan een resterende volwassene.
    update public.household_accounts set role = 'owner'
    where id = (select id from public.household_accounts where household_id = hid and status = 'active' order by created_at limit 1)
      and not exists (select 1 from public.household_accounts where household_id = hid and status = 'active' and role = 'owner');
    update public.deletion_requests set status = 'processed', processed_at = now() where id = rid;
  end if;
  return jsonb_build_object('request_id', rid);
end $$;

-- Rechten: functies alleen voor ingelogde gebruikers.
revoke all on all functions in schema public from public, anon;
revoke all on all functions in schema private from public, anon;
grant execute on function public.create_household(text, int, text), public.accept_invitation(text), public.grant_health_consent(text),
  public.withdraw_health_consent(), public.add_hard_rule(uuid, text, text, text), public.remove_hard_rule(uuid),
  public.set_restrictions_status(uuid, text), public.ensure_week_plan(date),
  public.commit_slot_change(uuid, int, text, text, text, text, text[], int, jsonb, text, jsonb, jsonb),
  public.undo_slot_change(uuid, int, text), public.request_deletion(text, text) to authenticated;
-- private.* blijft intern; alleen de RLS-helpers zijn uitvoerbaar (zie rls-migratie).
grant execute on function private.is_member(uuid), private.is_owner(uuid), private.current_household() to authenticated;

-- Realtime voor boodschappen (S-09: status deelt realtime tussen volwassenen).
do $$ begin
  if exists (select 1 from pg_publication where pubname = 'supabase_realtime') then
    execute 'alter publication supabase_realtime add table public.shopping_items';
  end if;
end $$;
