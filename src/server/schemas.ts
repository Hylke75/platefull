// Zod-schema's voor alle API-invoer (§12: validatie voor formulieren, API en AI-uitvoer).
import { z } from 'zod';
import { ALLERGEN_CODES, STRICT_DIETS } from '@/domain/types';

const name = z.string().trim().min(1).max(40);

export const createHouseholdSchema = z.object({
  name: z.string().trim().max(80).optional(),
  usual_diners: z.number().int().min(1).max(12),
  accept_terms: z.literal(true),
});

export const patchHouseholdSchema = z.object({
  name: z.string().trim().min(1).max(80).optional(),
  usual_diners: z.number().int().min(1).max(12).optional(),
  weekday_minutes: z.number().int().min(5).max(240).nullable().optional(),
  weekend_minutes: z.number().int().min(5).max(240).nullable().optional(),
  dinner_time: z.string().regex(/^\d{2}:\d{2}$/).nullable().optional(),
  skill: z.enum(['easy', 'medium']).optional(),
  equipment: z.array(z.enum(['oven', 'airfryer', 'stove', 'microwave', 'blender'])).max(5).optional(),
  weekly_budget_cents: z.number().int().min(0).max(10_000_000).nullable().optional(),
  meal_style: z.enum(['mixed', 'vegetarian', 'fish', 'meat']).nullable().optional(),
  onboarding_step: z.enum(['household', 'people', 'restrictions', 'tastes', 'context', 'first', 'done']).optional(),
}).strict();

export const createProfileSchema = z.object({
  display_name: name,
  age_band: z.enum(['adult', 'teen16', 'child']),
  avatar: z.string().regex(/^p[1-6]$/).optional(),
});

export const patchProfileSchema = z.object({
  display_name: name.optional(),
  age_band: z.enum(['adult', 'teen16', 'child']).optional(),
  avatar: z.string().regex(/^p[1-6]$/).optional(),
  parent_decides: z.boolean().optional(),
  restrictions_status: z.enum(['unknown', 'none']).optional(),
}).strict();

const softSeverity = z.enum(['STRONG_DISLIKE', 'SOFT_DISLIKE', 'NEUTRAL', 'UNKNOWN', 'LIKE']);
export const preferencesSchema = z.object({
  /** Volledige set zachte voorkeuren (PUT). Harde regels kunnen hier nooit in. */
  rules: z.array(z.object({
    target_type: z.enum(['ingredient', 'tag']),
    target_id: z.string().regex(/^[a-z0-9-]{1,60}$/),
    preparation: z.enum(['raw', 'cooked', 'sauce', 'baked', 'fried', 'any']).default('any'),
    severity: softSeverity,
  })).max(200),
  source: z.enum(['adult', 'child_shared_device', 'teen']).default('adult'),
});

export const hardRuleSchema = z.discriminatedUnion('target_type', [
  z.object({ target_type: z.literal('allergen'), target_id: z.enum(ALLERGEN_CODES), severity: z.enum(['HARD_ALLERGY', 'HARD_MEDICAL']) }),
  z.object({ target_type: z.literal('diet'), target_id: z.enum(STRICT_DIETS), severity: z.literal('HARD_DIET') }),
  z.object({ target_type: z.literal('ingredient'), target_id: z.string().regex(/^[a-z0-9-]{1,60}$/), severity: z.enum(['HARD_ALLERGY', 'HARD_MEDICAL']) }),
]);

export const suggestionSchema = z.object({
  slot_id: z.string().uuid(),
  persist: z.boolean().default(false),
});

export const acceptSchema = z.object({
  recipe_id: z.string().regex(/^[a-z0-9-]+$/).optional(),
  variant_ids: z.array(z.string().max(120)).max(5).optional(),
  override_soft: z.boolean().optional(),
});

export const planBScenarioSchema = z.discriminatedUnion('kind', [
  z.object({ kind: z.literal('less_time'), availableMinutes: z.number().int().min(5).max(240) }),
  z.object({ kind: z.literal('attendee_absent'), profileIds: z.array(z.string().uuid()).min(1).max(12) }),
  z.object({ kind: z.literal('ingredient_missing'), ingredientId: z.string().regex(/^[a-z0-9-]{1,60}$/) }),
  z.object({ kind: z.literal('taste_conflict'), profileId: z.string().uuid(), ingredientId: z.string().regex(/^[a-z0-9-]{1,60}$/) }),
]);

export const planBSchema = z.object({
  scenario: planBScenarioSchema,
  free_text: z.string().max(500).optional().nullable(),
});

export const attendanceSchema = z.object({
  attendees: z.array(z.object({
    profile_id: z.string().uuid().nullable(),
    guest_label: z.string().trim().min(1).max(40).optional(),
    guest_allergies_known: z.boolean().optional(),
    attendance: z.enum(['yes', 'no', 'unknown']),
  })).max(20),
});

export const completeSchema = z.object({
  leftovers: z.object({ portions: z.number().int().min(1).max(24), storage: z.enum(['fridge', 'freezer']) }).nullable().optional(),
  feedback: z.array(z.object({ profile_id: z.string().uuid().nullable(), rating: z.enum(['repeat', 'fine', 'rather_not']) })).max(12).optional(),
});

export const weekPlanPatchSchema = z.object({
  slot_id: z.string().uuid(),
  recipe_id: z.string().regex(/^[a-z0-9-]+$/).nullable(),
  revision: z.number().int().min(1),
});

export const manualItemSchema = z.object({ description: z.string().trim().min(1).max(80), qty: z.number().positive().max(10000).optional(), unit: z.string().max(10).optional() });
export const itemPatchSchema = z.object({ state: z.enum(['open', 'checked', 'removed']), version: z.number().int().min(1) });

export const pantrySchema = z.object({
  ingredient_id: z.string().regex(/^[a-z0-9-]{1,60}$/),
  quantity: z.number().min(0).max(100000).nullable(),
  unit: z.enum(['g', 'kg', 'ml', 'l', 'stuk', 'el', 'tl', 'blik', 'pak', 'bakje', 'teen', 'snuf']).nullable(),
  status: z.enum(['confirmed', 'unknown']),
  location: z.enum(['kast', 'koelkast', 'vriezer']).default('kast'),
  expires_at: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).nullable().optional(),
});
export const pantryPatchSchema = pantrySchema.partial().extend({ version: z.number().int().min(1) });

export const leftoverSchema = z.object({
  label: z.string().trim().min(1).max(80),
  portions: z.number().int().min(1).max(24),
  storage: z.enum(['fridge', 'freezer']),
  source_slot_id: z.string().uuid().nullable().optional(),
});
export const leftoverPatchSchema = z.object({ status: z.enum(['used', 'discarded', 'unsafe']).optional(), portions: z.number().int().min(1).max(24).optional() });

export const feedbackSchema = z.object({
  slot_id: z.string().uuid(),
  profile_id: z.string().uuid().nullable(),
  rating: z.enum(['repeat', 'fine', 'rather_not']),
  comment: z.string().max(300).optional(),
});

export const consentSchema = z.object({ purpose: z.literal('health_data'), granted: z.boolean() });
export const deleteSchema = z.object({ scope: z.enum(['account', 'household']), confirm: z.literal('VERWIJDEREN') });
export const ingredientCheckSchema = z.object({
  ingredient_id: z.string().regex(/^[a-z0-9-]{1,60}$/),
  contains_allergens: z.array(z.enum(ALLERGEN_CODES)),
  diet: z.object({ meat: z.boolean(), pork: z.boolean(), fish: z.boolean(), animal: z.boolean() }).nullable(),
  label_checked: z.literal(true),
});
export const invitationSchema = z.object({ email: z.string().email().max(200) });
