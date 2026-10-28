// Kooktimer-alarm: een lokale melding die het toestel zelf inplant. Werkt dus ook zonder netwerk
// (vliegtuigmodus), met de app op de achtergrond en met een vergrendeld scherm.
import * as Notifications from 'expo-notifications';
import { AndroidImportance, AndroidNotificationVisibility } from 'expo-notifications';
import { Platform } from 'react-native';

const CHANNEL = 'kooktimer';
let scheduledId: string | null = null;
let prepared: Promise<boolean> | null = null;

// Ook als de app open is: banner tonen en geluid afspelen.
if (Platform.OS !== 'web') Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldPlaySound: true,
    shouldSetBadge: false,
    shouldShowBanner: true,
    shouldShowList: true,
    priority: Notifications.AndroidNotificationPriority.MAX,
  }),
});

async function prepare(): Promise<boolean> {
  if (Platform.OS === 'web') return false;
  if (Platform.OS === 'android') {
    // Het kanaal moet bestaan vóór de toestemmingsvraag (Android 13+).
    await Notifications.setNotificationChannelAsync(CHANNEL, {
      name: 'Kooktimer',
      importance: AndroidImportance.MAX,
      sound: 'default',
      vibrationPattern: [0, 400, 250, 400, 250, 400],
      lockscreenVisibility: AndroidNotificationVisibility.PUBLIC,
      bypassDnd: true,
    });
  }
  const current = await Notifications.getPermissionsAsync();
  if (current.granted) return true;
  if (!current.canAskAgain) return false;
  const asked = await Notifications.requestPermissionsAsync({ ios: { allowAlert: true, allowSound: true, allowBadge: false } });
  return asked.granted;
}

/** Plant het alarm voor een kookstap; een eerder alarm vervalt. Geeft false als meldingen niet zijn toegestaan. */
export async function startCookAlarm(seconds: number, stepTitle: string, recipeName: string): Promise<boolean> {
  await stopCookAlarm();
  prepared ??= prepare();
  const allowed = await prepared;
  if (!allowed) { prepared = null; return false; }
  scheduledId = await Notifications.scheduleNotificationAsync({
    content: {
      title: 'Tijd! ⏰',
      body: `${stepTitle} · ${recipeName}`,
      sound: 'default',
      interruptionLevel: 'timeSensitive',
      priority: Notifications.AndroidNotificationPriority.MAX,
      vibrate: [0, 400, 250, 400, 250, 400],
    },
    trigger: { type: Notifications.SchedulableTriggerInputTypes.TIME_INTERVAL, seconds: Math.max(1, Math.round(seconds)), channelId: CHANNEL },
  });
  return true;
}

export async function stopCookAlarm(): Promise<void> {
  if (!scheduledId) return;
  const id = scheduledId;
  scheduledId = null;
  await Notifications.cancelScheduledNotificationAsync(id).catch(() => {});
}
