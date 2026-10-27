// AI-laag (§7.2 stap 7, §7.4, §7.5): uitsluitend selectie tussen al gevalideerde kandidaten en korte uitleg.
// De AI ziet geen namen of gezondheidsgegevens en kan niets in de database muteren.
import OpenAI from 'openai';
import { z } from 'zod';
import type { EngineInput, EngineResult } from '@/domain/engine';
import { openAiConfig } from '@/lib/env';
import type { AiChoice, HouseholdBundle } from '@/core/planning';

/** §7.4 outputcontract. */
export const aiOutputSchema = z.object({
  status: z.enum(['ok', 'insufficient_data', 'no_safe_candidate', 'unavailable']),
  suggested_recipe_id: z.string().nullable(),
  alternative_recipe_ids: z.array(z.string()).max(2),
  optional_variant_ids: z.array(z.string()),
  reasons: z.array(z.string().min(1).max(60)).max(3),
  warnings: z.array(z.string().max(120)),
  plan_diff: z.null(),
  confidence_label: z.enum(['hoog', 'gemiddeld', 'laag']),
});
export type AiOutput = z.infer<typeof aiOutputSchema>;

const jsonSchema = {
  type: 'object',
  additionalProperties: false,
  required: ['status', 'suggested_recipe_id', 'alternative_recipe_ids', 'optional_variant_ids', 'reasons', 'warnings', 'plan_diff', 'confidence_label'],
  properties: {
    status: { type: 'string', enum: ['ok', 'insufficient_data', 'no_safe_candidate', 'unavailable'] },
    suggested_recipe_id: { type: ['string', 'null'] },
    alternative_recipe_ids: { type: 'array', items: { type: 'string' }, maxItems: 2 },
    optional_variant_ids: { type: 'array', items: { type: 'string' } },
    reasons: { type: 'array', items: { type: 'string' }, maxItems: 3 },
    warnings: { type: 'array', items: { type: 'string' } },
    plan_diff: { type: 'null' },
    confidence_label: { type: 'string', enum: ['hoog', 'gemiddeld', 'laag'] },
  },
} as const;

// Redenen mogen nooit een veiligheids- of gezondheidsclaim bevatten (§1.4, §11.3).
const FORBIDDEN = /(veilig|allergi|allergeen|medisch|gezond|calorie|gegarandeerd|geschikt voor iedereen|afvallen)/i;

/** Valideert de AI-uitvoer tegen de veilige kandidatenset. Alles wat niet klopt wordt geweigerd (§7.5). */
export function validateAiOutput(raw: unknown, result: EngineResult): AiChoice {
  const parsed = aiOutputSchema.safeParse(raw);
  if (!parsed.success) return { status: 'rejected' };
  const out = parsed.data;
  const safeIds = new Set(result.ranked.map((c) => c.recipeId));
  if (out.status !== 'ok' || !out.suggested_recipe_id || !safeIds.has(out.suggested_recipe_id)) return { status: 'rejected' };
  if (out.alternative_recipe_ids.some((id) => !safeIds.has(id) || id === out.suggested_recipe_id)) return { status: 'rejected' };
  const chosen = result.ranked.find((c) => c.recipeId === out.suggested_recipe_id)!;
  // Varianten mag de AI niet zelf toevoegen: alleen de door de engine gekozen set is gevalideerd.
  if (out.optional_variant_ids.some((v) => !chosen.variantIds.includes(v))) return { status: 'rejected' };
  const reasons = out.reasons.filter((r) => !FORBIDDEN.test(r)).map((r) => r.trim()).filter(Boolean).slice(0, 3);
  return { status: 'ok', suggestedRecipeId: out.suggested_recipe_id, alternativeRecipeIds: out.alternative_recipe_ids, reasons: reasons.length ? reasons : chosen.reasons };
}

/** Geredigeerde context: alleen recept-ids, scores en feitelijke redenen; geen namen, geen harde regels. */
export function buildAiContext(result: EngineResult, bundle: HouseholdBundle, input: EngineInput) {
  const names = bundle.profiles.map((p) => p.display_name).filter(Boolean).sort((a, b) => b.length - a.length);
  const redact = (t: string) => names.reduce((s, n) => s.split(n).join('een gezinslid'), t);
  return {
    date: input.localDate,
    eaters: result.eaters,
    available_minutes: input.context.availableMinutes,
    candidates: result.ranked.slice(0, 6).map((c) => ({
      recipe_id: c.recipeId,
      name: bundle.recipes.find((r) => r.id === c.recipeId)?.name,
      total_minutes: c.totalMinutes,
      score: Math.round(c.score * 100) / 100,
      facts: c.reasons.map(redact),
      variant_ids: c.variantIds,
    })),
  };
}

const SYSTEM = [
  'Je bent de keuzehulp van Plateful, een Nederlandse app voor het gezinsdiner.',
  'Je krijgt een lijst kandidaat-recepten die al door de server op veiligheid en haalbaarheid zijn gecontroleerd.',
  'Kies uitsluitend recipe_ids uit die lijst. Verzin nooit een recept, ingrediënt, tijd of variant.',
  'Geef maximaal drie korte redenen (max 60 tekens) die letterlijk volgen uit de meegegeven facts.',
  'Doe geen uitspraken over allergieën, veiligheid, gezondheid, calorieën of medische zaken.',
  'Antwoord in het Nederlands via het gevraagde JSON-schema.',
].join(' ');

export async function chooseWithAi(result: EngineResult, bundle: HouseholdBundle, input: EngineInput): Promise<AiChoice> {
  const cfg = openAiConfig();
  if (!cfg) return { status: 'not_used' };
  const client = new OpenAI({ apiKey: cfg.apiKey, timeout: cfg.timeoutMs, maxRetries: 0 });
  try {
    const response = await client.responses.create({
      model: cfg.model,
      input: [
        { role: 'system', content: SYSTEM },
        { role: 'user', content: JSON.stringify(buildAiContext(result, bundle, input)) },
      ],
      text: { format: { type: 'json_schema', name: 'plateful_choice', schema: jsonSchema as unknown as Record<string, unknown>, strict: true } },
    });
    let raw: unknown;
    try { raw = JSON.parse(response.output_text); } catch { return { status: 'rejected' }; }
    const choice = validateAiOutput(raw, result);
    if (choice.status === 'rejected') console.warn('[ai] uitvoer geweigerd door validator');
    return choice;
  } catch (err) {
    // Geen prompt of gezinsdata loggen; alleen het fouttype.
    console.warn('[ai] provider niet beschikbaar', err instanceof Error ? err.name : 'onbekend');
    return { status: 'unavailable' };
  }
}
