'use client';
// S-01 / O-02: e-mail → magic link of eenmalige code. Account geldt pas als bevestigd bij een geldige sessie.
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { AppHeader, PrimaryButton, SafeNote, SecondaryButton } from '@/components/ui/phone-ui';
import { getSupabaseBrowserClient } from '@/lib/supabase/browser';

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

function authMessage(code: string | undefined, message: string | undefined): string {
  const m = `${code ?? ''} ${message ?? ''}`.toLowerCase();
  if (m.includes('rate') || m.includes('too many') || m.includes('429')) return 'Te veel pogingen. Wacht een minuut en probeer het opnieuw.';
  if (m.includes('expired')) return 'Deze code of link is verlopen. Vraag een nieuwe aan.';
  if (m.includes('invalid') || m.includes('token')) return 'Deze code klopt niet of is al gebruikt.';
  if (m.includes('fetch') || m.includes('network') || m.includes('503')) return 'De inlogdienst is even niet bereikbaar. Probeer het zo opnieuw.';
  return 'Inloggen lukte niet. Probeer het opnieuw.';
}

export function LoginClient({ configured, next, initialError }: { configured: boolean; next: string; initialError: string | null }) {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [code, setCode] = useState('');
  const [state, setState] = useState<'idle' | 'loading' | 'sent' | 'verifying'>('idle');
  const [error, setError] = useState<string | null>(initialError ? 'Deze link is verlopen of al gebruikt. Vraag een nieuwe aan.' : null);

  async function send() {
    if (!EMAIL.test(email.trim())) { setError('Vul een geldig e-mailadres in.'); return; }
    const sb = getSupabaseBrowserClient();
    if (!sb) { setError('Inloggen is nog niet geconfigureerd.'); return; }
    setState('loading'); setError(null);
    const { error: e } = await sb.auth.signInWithOtp({ email: email.trim(), options: { emailRedirectTo: `${window.location.origin}/auth/callback?next=${encodeURIComponent(next)}`, shouldCreateUser: true } });
    if (e) { setError(authMessage(e.code, e.message)); setState('idle'); return; }
    setState('sent');
  }

  async function verify() {
    const sb = getSupabaseBrowserClient();
    if (!sb) return;
    setState('verifying'); setError(null);
    const { data, error: e } = await sb.auth.verifyOtp({ email: email.trim(), token: code.trim(), type: 'email' });
    if (e || !data.session) { setError(authMessage(e?.code, e?.message)); setState('sent'); return; }
    router.replace(next);
    router.refresh();
  }

  return (
    <div className="app-view">
      <AppHeader initials="?" />
      <div className="eyeline">IEDEREEN ANDERS. SAMEN AAN TAFEL.</div>
      <h2 className="app-title">Welkom aan<br />tafel.</h2>
      {!configured ? (
        <p className="config-note">Deze installatie is nog niet gekoppeld aan een database. Zet <code>NEXT_PUBLIC_SUPABASE_URL</code> en <code>NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY</code> (zie README). De klikbare ontwerpdemo staat op de <a href="/">startpagina</a>.</p>
      ) : null}
      {state === 'idle' || state === 'loading' ? (
        <form onSubmit={(e) => { e.preventDefault(); void send(); }}>
          <label className="field"><span>E-mailadres</span>
            <input className="text-input" type="email" autoComplete="email" inputMode="email" value={email} onChange={(e) => setEmail(e.target.value)} aria-invalid={!!error} required />
            <small>We sturen je een link en een code van 6 cijfers. Geen wachtwoord nodig.</small>
          </label>
          <PrimaryButton wide disabled={state === 'loading' || !configured} aria-busy={state === 'loading'}>{state === 'loading' ? 'Versturen…' : 'Stuur mijn inlogcode →'}</PrimaryButton>
        </form>
      ) : (
        <form onSubmit={(e) => { e.preventDefault(); void verify(); }}>
          <div className="confirmation" style={{ marginTop: 0, marginBottom: 14 }}><div style={{ fontSize: 23 }}>✉</div><h3>Kijk in je mail</h3><p>Klik op de link in de mail aan {email}, of vul de code hieronder in.</p></div>
          <label className="field"><span>Code</span>
            <input className="text-input" inputMode="numeric" autoComplete="one-time-code" pattern="[0-9]{6}" maxLength={6} value={code} onChange={(e) => setCode(e.target.value.replace(/\D/g, ''))} aria-invalid={!!error} />
          </label>
          <PrimaryButton wide disabled={code.length !== 6 || state === 'verifying'} aria-busy={state === 'verifying'}>Inloggen</PrimaryButton>
          <SecondaryButton wide type="button" style={{ marginTop: 8 }} onClick={() => { setState('idle'); setCode(''); }}>Ander e-mailadres of nieuwe code</SecondaryButton>
        </form>
      )}
      {error ? <p className="form-error" role="alert">{error}</p> : null}
      <SafeNote>Door in te loggen ga je akkoord met de voorwaarden en het privacybeleid. Alleen volwassenen hebben een account; kinderen krijgen een profiel zonder e-mailadres.</SafeNote>
    </div>
  );
}
