// MealSlot- en Plan B-statemachines (§8.1, §8.2).

export const SLOT_STATES = ['draft', 'proposed', 'accepted', 'cooking', 'completed', 'dismissed', 'changed', 'cancelled', 'blocked'] as const;
export type SlotState = (typeof SLOT_STATES)[number];

const transitions: Record<SlotState, readonly SlotState[]> = {
  draft: ['proposed', 'blocked'],
  proposed: ['accepted', 'dismissed', 'blocked', 'proposed'],
  // 'changed' = nieuwe geaccepteerde revisie (bijv. na Plan B); technisch blijft de slot 'accepted' met hogere revisie.
  accepted: ['cooking', 'changed', 'cancelled', 'blocked', 'accepted', 'proposed'],
  changed: ['accepted', 'cooking', 'cancelled', 'blocked'],
  cooking: ['completed', 'cancelled'],
  completed: [],
  dismissed: ['proposed'],
  cancelled: ['proposed'],
  blocked: ['proposed'],
};

export function canTransition(from: SlotState, to: SlotState): boolean {
  return transitions[from].includes(to);
}

export class InvalidTransitionError extends Error {
  constructor(readonly from: SlotState, readonly to: SlotState) {
    super(`Ongeldige overgang van ${from} naar ${to}`);
  }
}

export function assertTransition(from: SlotState, to: SlotState): void {
  if (!canTransition(from, to)) throw new InvalidTransitionError(from, to);
}

export const PLANB_STATES = ['idle', 'scenario_selected', 'calculating', 'preview', 'applying', 'applied', 'error', 'timeout', 'conflict'] as const;
export type PlanBState = (typeof PLANB_STATES)[number];

const planBTransitions: Record<PlanBState, readonly PlanBState[]> = {
  idle: ['scenario_selected'],
  scenario_selected: ['scenario_selected', 'calculating'],
  calculating: ['preview', 'error', 'timeout'],
  preview: ['scenario_selected', 'applying'],
  applying: ['applied', 'conflict', 'error'],
  applied: ['idle'],
  error: ['scenario_selected', 'calculating'],
  timeout: ['scenario_selected', 'calculating'],
  conflict: ['calculating', 'scenario_selected'],
};

export function canPlanBTransition(from: PlanBState, to: PlanBState): boolean {
  return planBTransitions[from].includes(to);
}

/** Undo (S-05): binnen 10 minuten, één keer, en alleen als er geen latere mutatie is. */
export const UNDO_WINDOW_MS = 10 * 60 * 1000;

export function undoAllowed(args: { appliedAt: Date; now: Date; appliedRevision: number; currentRevision: number; alreadyUndone: boolean }): { ok: true } | { ok: false; reason: 'expired' | 'later_change' | 'already_undone' } {
  if (args.alreadyUndone) return { ok: false, reason: 'already_undone' };
  if (args.currentRevision !== args.appliedRevision) return { ok: false, reason: 'later_change' };
  if (args.now.getTime() - args.appliedAt.getTime() > UNDO_WINDOW_MS) return { ok: false, reason: 'expired' };
  return { ok: true };
}
