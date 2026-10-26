import { Tabs } from 'expo-router';
import { TabBar } from '@/components/TabBar';
import { colors } from '@/theme';

export default function TabsLayout() {
  return (
    <Tabs tabBar={(props) => <TabBar {...props} />} screenOptions={{ headerShown: false, sceneStyle: { backgroundColor: colors.screen } }}>
      <Tabs.Screen name="vandaag" />
      <Tabs.Screen name="week" />
      <Tabs.Screen name="gezin" />
      <Tabs.Screen name="lijst" />
    </Tabs>
  );
}
