-- Security advisor 0011: vaste search_path ook voor de twee functies zonder security definer.
alter function public.touch_updated_at() set search_path = '';
alter function private.can_transition(text, text) set search_path = '';
