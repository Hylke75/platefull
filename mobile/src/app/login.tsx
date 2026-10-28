// S-01 / O-02: e-mail → eenmalige code van 6 cijfers. Account geldt pas als bevestigd bij een geldige sessie.
import { useState } from 'react';
import { KeyboardAvoidingView, Linking, Platform } from 'react-native';
import { LEGAL_URLS } from '@shared/core/constants';
import { ScreenScroll } from '@/components/ScreenScroll';
import { AppHeader, AppTitle, Button, Confirmation, Eyeline, Field, FormError, SafeNote } from '@/components/ui';
import { isConfigured, supabase } from '@/lib/supabase';

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

function authMessage(code?: string, message?: string): string {
  const m = `${code ?? ''} ${message ?? ''}`.toLowerCase();
  if (m.includes('rate') || m.includes('too many') || m.includes('429')) return 'Te veel pogingen. Wacht een minuut en probeer het opnieuw.';
  if (m.includes('expired')) return 'Deze code is verlopen. Vraag een nieuwe aan.';
  if (m.includes('invalid') || m.includes('token')) return 'Deze code klopt niet of is al gebruikt.';
  if (m.includes('fetch') || m.includes('network')) return 'De inlogdienst is even niet bereikbaar. Probeer het zo opnieuw.';
  return 'Inloggen lukte niet. Probeer het opnieuw.';
}

export default function Login() {
  const [email, setEmail] = useState('');
  const [code, setCode] = useState('');
  const [state, setState] = useState<'idle' | 'loading' | 'sent' | 'verifying'>('idle');
  const [error, setError] = useState<string | null>(null);

  async function send() {
    if (!EMAIL.test(email.trim())) { setError('Vul een geldig e-mailadres in.'); return; }
    setState('loading'); setError(null);
    const { error: e } = await supabase.auth.signInWithOtp({ email: email.trim(), options: { shouldCreateUser: true } });
    if (e) { setError(authMessage(e.code, e.message)); setState('idle'); return; }
    setState('sent');
  }

  async function verify() {
    setState('verifying'); setError(null);
    const { data, error: e } = await supabase.auth.verifyOtp({ email: email.trim(), token: code.trim(), type: 'email' });
    if (e || !data.session) { setError(authMessage(e?.code, e?.message)); setState('sent'); }
    // Bij succes schakelt de beveiligde navigatie vanzelf door naar onboarding of Vandaag.
  }

  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScreenScroll>
        <AppHeader />
        <Eyeline>IEDEREEN ANDERS. SAMEN AAN TAFEL.</Eyeline>
        <AppTitle>Welkom aan{'\n'}tafel.</AppTitle>
        {!isConfigured ? <FormError>Deze build is niet gekoppeld aan een database (EXPO_PUBLIC_SUPABASE_URL ontbreekt).</FormError> : null}
        {state === 'idle' || state === 'loading' ? (
          <>
            <Field label="E-mailadres" value={email} onChangeText={setEmail} keyboardType="email-address" autoCapitalize="none" autoComplete="email" textContentType="emailAddress" hint="We sturen je een code van 6 cijfers. Geen wachtwoord nodig." onSubmitEditing={send} returnKeyType="send" />
            <Button wide onPress={send} busy={state === 'loading'} disabled={!isConfigured}>Stuur mijn inlogcode →</Button>
          </>
        ) : (
          <>
            <Confirmation title="Kijk in je mail" text={`Vul de code in die we naar ${email} stuurden.`} />
            <Field label="Code" value={code} onChangeText={(t) => setCode(t.replace(/\D/g, '').slice(0, 6))} keyboardType="number-pad" autoComplete="one-time-code" textContentType="oneTimeCode" maxLength={6} onSubmitEditing={verify} />
            <Button wide onPress={verify} busy={state === 'verifying'} disabled={code.length !== 6}>Inloggen</Button>
            <Button wide variant="plain" style={{ marginTop: 8 }} onPress={() => { setState('idle'); setCode(''); }}>Ander e-mailadres of nieuwe code</Button>
          </>
        )}
        {error ? <FormError>{error}</FormError> : null}
        <SafeNote>Door in te loggen ga je akkoord met de voorwaarden en het privacybeleid. Alleen volwassenen hebben een account; kinderen krijgen een profiel zonder e-mailadres.</SafeNote>
        <Button variant="plain" onPress={() => void Linking.openURL(LEGAL_URLS.privacy)}>Lees de privacyverklaring</Button>
      </ScreenScroll>
    </KeyboardAvoidingView>
  );
}
