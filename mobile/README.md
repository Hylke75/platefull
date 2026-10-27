# Plateful — native app (Expo)

React Native-app voor iOS en Android op dezelfde Supabase-backend als de webapp. Expo SDK 58, Expo Router, TypeScript.

- **Slug** `platefull`, **owner** `link-and-lead`, bundle-id/package `nl.linkandlead.platefull` (aanname, zie `docs/AFWIJKINGEN.md`).
- **Gedeelde logica:** de app importeert de domein- en veiligheidsengine (`../src/domain`) en de datalaag (`../src/core`) rechtstreeks — dezelfde code als de webapp, geen kopie. Metro bundelt die map via `metro.config.js`; in TypeScript heet hij `@shared/*`.
- **Backend:** de app praat direct met Supabase met de sessie van de gebruiker. RLS en de databasefuncties (`commit_slot_change`, `add_hard_rule`, `hard_violations` …) gelden volledig; een harde allergie kan dus ook via de app niet worden omzeild.
- **Ontwerp:** componenten in `src/components/ui.tsx` zijn een 1:1-vertaling van design system v2.0 (kleuren, maten, Fraunces/DM Sans). Iconen gerenderd uit de originele v2-vectoren (`npm run icons`).

## Starten

```bash
cd mobile
npm install
cp .env.example .env.local        # vul de Supabase-URL en publishable key in
npx expo start                     # Expo Go of development build
```

Lokale Supabase: `supabase start` in de hoofdmap (zie hoofd-README). Inlogcodes komen binnen in Mailpit (http://127.0.0.1:54324).

## EAS

De app is gekoppeld aan het Expo-project `link-and-lead/platefull`
(`extra.eas.projectId` `1918aec3-7a07-4f55-8166-7c410102a20e` in `app.json`). Slug en owner moeten
exact zo blijven, anders weigert EAS de build. Opnieuw koppelen (alleen bij een ander project):

```bash
npx eas-cli@latest init --id <project-ID>
```

Zet `EXPO_PUBLIC_SUPABASE_URL` en `EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY` als EAS-omgevingsvariabelen (development/preview/production), daarna:

```bash
npx eas-cli@latest build --profile preview --platform all
```

## Controles

| Commando | Wat |
| --- | --- |
| `npm run typecheck` | TypeScript strict, inclusief de gedeelde code |
| `npm run lint` | ESLint (eslint-config-expo, React Compiler-regels) |
| `npm run doctor` | expo-doctor (20 checks) |
| `npm run export` | bundelt iOS, Android en web |
| `npm run test:e2e` | E2E van deze app-code via react-native-web tegen lokale Supabase (14 stappen) |

De E2E draait de React Native-code in een mobiele Chromium. Native rendering op een echt iOS-/Android-toestel valt daarbuiten: test een development build op een toestel vóór publicatie.
