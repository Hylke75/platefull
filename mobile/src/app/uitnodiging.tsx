// Uitnodiging als mede-ouder (deep link platefull://uitnodiging?token=…). Alleen geldig voor het uitgenodigde e-mailadres.
import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { ScreenScroll } from '@/components/ScreenScroll';
import { AppHeader, AppTitle, Button, Eyeline, FormError, Subtitle } from '@/components/ui';
import { useSession } from '@/lib/session';
import { supabase } from '@/lib/supabase';

export default function Uitnodiging() {
  const { token } = useLocalSearchParams<{ token?: string }>();
  const { householdId, refreshHousehold } = useSession();
  const [error, setError] = useState<string | null>(householdId ? 'Je hoort al bij een gezin. In deze versie kun je bij één gezin horen.' : null);
  const [busy, setBusy] = useState(false);
  async function accept() {
    setBusy(true);
    const { error: e } = await supabase.rpc('accept_invitation', { p_token: token ?? '' });
    if (e) { setError(e.code === 'PT403' ? 'Deze uitnodiging is voor een ander e-mailadres.' : 'Deze uitnodiging is verlopen of al gebruikt.'); setBusy(false); return; }
    // Een mede-ouder slaat de onboarding over: het gezin bestaat al.
    await refreshHousehold();
    router.replace('/vandaag');
  }
  return (
    <ScreenScroll>
      <AppHeader />
      <Eyeline>UITNODIGING</Eyeline>
      <AppTitle>{'Samen aan\ntafel?'}</AppTitle>
      <Subtitle>Je bent uitgenodigd als mede-ouder. Je kunt dan profielen, maaltijden en boodschappen samen beheren.</Subtitle>
      <Button wide onPress={accept} busy={busy} disabled={!!householdId || !token}>Doe mee met dit gezin</Button>
      {error ? <FormError>{error}</FormError> : null}
    </ScreenScroll>
  );
}
