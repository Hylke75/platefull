// Alleen de gewichten uit het designsystem bundelen (per-gewicht imports).
import { DMSans_400Regular } from '@expo-google-fonts/dm-sans/400Regular';
import { DMSans_500Medium } from '@expo-google-fonts/dm-sans/500Medium';
import { DMSans_600SemiBold } from '@expo-google-fonts/dm-sans/600SemiBold';
import { DMSans_700Bold } from '@expo-google-fonts/dm-sans/700Bold';
import { DMSans_800ExtraBold } from '@expo-google-fonts/dm-sans/800ExtraBold';
import { Fraunces_500Medium } from '@expo-google-fonts/fraunces/500Medium';
import { Fraunces_500Medium_Italic } from '@expo-google-fonts/fraunces/500Medium_Italic';
import { Fraunces_600SemiBold } from '@expo-google-fonts/fraunces/600SemiBold';
import { Fraunces_700Bold } from '@expo-google-fonts/fraunces/700Bold';
import { useFonts } from 'expo-font';
import { Stack } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { useEffect } from 'react';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { SessionProvider, useSession } from '@/lib/session';
import { ToastProvider } from '@/lib/toast';
import { colors } from '@/theme';

SplashScreen.preventAutoHideAsync().catch(() => undefined);

function Routes() {
  const { ready, session, householdId, onboarded } = useSession();
  useEffect(() => { if (ready) SplashScreen.hideAsync().catch(() => undefined); }, [ready]);
  if (!ready) return null;
  const signedIn = !!session;
  return (
    <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: colors.screen } }}>
      <Stack.Protected guard={!signedIn}>
        <Stack.Screen name="login" />
      </Stack.Protected>
      <Stack.Protected guard={signedIn && !(householdId && onboarded)}>
        <Stack.Screen name="onboarding" />
      </Stack.Protected>
      <Stack.Protected guard={signedIn && !!householdId && onboarded}>
        <Stack.Screen name="(app)" />
      </Stack.Protected>
      <Stack.Protected guard={signedIn}>
        <Stack.Screen name="uitnodiging" />
      </Stack.Protected>
    </Stack>
  );
}

export default function RootLayout() {
  const [fontsLoaded] = useFonts({
    DMSans_400Regular, DMSans_500Medium, DMSans_600SemiBold, DMSans_700Bold, DMSans_800ExtraBold,
    Fraunces_500Medium, Fraunces_500Medium_Italic, Fraunces_600SemiBold, Fraunces_700Bold,
  });
  if (!fontsLoaded) return null;
  return (
    <SafeAreaProvider>
      <SessionProvider>
        <ToastProvider>
          <StatusBar style="dark" />
          <Routes />
        </ToastProvider>
      </SessionProvider>
    </SafeAreaProvider>
  );
}
