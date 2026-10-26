'use client';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { AppHeader, PrimaryButton } from '@/components/ui/phone-ui';
import { getSupabaseBrowserClient } from '@/lib/supabase/browser';

export function InviteClient({ token, alreadyMember }: { token: string; alreadyMember: boolean }) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(alreadyMember ? 'Je hoort al bij een gezin. In deze versie kun je bij één gezin horen.' : null);
  async function accept() {
    const { error: e } = await getSupabaseBrowserClient()!.rpc('accept_invitation', { p_token: token });
    if (e) { setError(e.code === 'PT403' ? 'Deze uitnodiging is voor een ander e-mailadres.' : 'Deze uitnodiging is verlopen of al gebruikt.'); return; }
    router.replace('/app/vandaag'); router.refresh();
  }
  return (
    <div className="app-view">
      <AppHeader initials="?" />
      <div className="eyeline">UITNODIGING</div>
      <h2 className="app-title">Samen aan<br />tafel?</h2>
      <p className="app-subtitle">Je bent uitgenodigd als mede-ouder. Je kunt dan profielen, maaltijden en boodschappen samen beheren.</p>
      <PrimaryButton wide onClick={accept} disabled={alreadyMember || !token}>Doe mee met dit gezin</PrimaryButton>
      {error ? <p className="form-error" role="alert">{error}</p> : null}
    </div>
  );
}
