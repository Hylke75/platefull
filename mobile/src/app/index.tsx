import { Redirect } from 'expo-router';
import { useSession } from '@/lib/session';

/** Ankerroute: stuurt door naar login, onboarding of Vandaag. */
export default function Index() {
  const { session, householdId, onboarded } = useSession();
  if (!session) return <Redirect href="/login" />;
  if (!householdId || !onboarded) return <Redirect href="/onboarding" />;
  return <Redirect href="/vandaag" />;
}
