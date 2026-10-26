// Webserver-variant van de planningsservice: dezelfde gedeelde core, met de AI-laag (alleen server-side) ingeplugd.
import * as core from '@/core/planning';
import { chooseWithAi } from './ai';

export * from '@/core/planning';

export function suggestForSlot(...[ctx, slotId, opts]: Parameters<typeof core.suggestForSlot>) {
  return core.suggestForSlot(ctx, slotId, { chooser: chooseWithAi, ...opts });
}

export function proposeSlot(...[ctx, slotId, event, idem, exclude]: Parameters<typeof core.proposeSlot>) {
  return core.proposeSlot(ctx, slotId, event, idem, exclude, chooseWithAi);
}
