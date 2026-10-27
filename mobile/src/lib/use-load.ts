import { useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';
import { toUiError } from './errors';

/**
 * Laadt data bij elk focussen van het scherm (verse stand na wijzigingen elders, ook door de andere ouder).
 * Geef een met useCallback gememoiseerde loader mee; die bepaalt wanneer opnieuw geladen wordt.
 */
export function useLoad<T>(load: () => Promise<T>) {
  const [state, setState] = useState<{ data: T | null; error: string | null; loading: boolean }>({ data: null, error: null, loading: true });
  const reload = useCallback(async () => {
    try {
      const data = await load();
      setState({ data, error: null, loading: false });
    } catch (e) {
      setState((s) => ({ ...s, error: toUiError(e).message, loading: false }));
    }
  }, [load]);
  useFocusEffect(useCallback(() => { void reload(); }, [reload]));
  return { ...state, reload };
}

/**
 * Lokale bewerkingen bovenop geladen data, zonder state te synchroniseren in een effect:
 * zodra de bron opnieuw geladen is, gelden de nieuwe brondata weer.
 */
export function useLocalCopy<S, T>(source: S | null, pick: (s: S) => T, empty: T) {
  const [local, setLocal] = useState<{ src: S | null; value: T } | null>(null);
  const base = source ? pick(source) : empty;
  const value = local && local.src === source ? local.value : base;
  const set = useCallback((fn: (cur: T) => T) => {
    setLocal((cur) => ({ src: source, value: fn(cur && cur.src === source ? cur.value : base) }));
  }, [source, base]);
  return [value, set, !!local && local.src === source] as const;
}
