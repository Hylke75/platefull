// Bottom-navigatie uit het ontwerp (.phone-nav): 66 px, vier tabs, actieve tab forest met mandarijn icoon.
import type { BottomTabBarProps } from 'expo-router/build/layouts/Tabs';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { glyph } from '@/components/ui';
import { colors, fonts } from '@/theme';

const ITEMS: Record<string, { icon: string; label: string }> = {
  vandaag: { icon: '⌂', label: 'Vandaag' },
  week: { icon: '▦', label: 'Week' },
  gezin: { icon: '♡', label: 'Gezin' },
  lijst: { icon: '☷', label: 'Lijst' },
};

export function TabBar({ state, navigateToTab }: BottomTabBarProps) {
  const insets = useSafeAreaInsets();
  return (
    <View style={[styles.nav, { height: 66 + insets.bottom, paddingBottom: 6 + insets.bottom }]} accessibilityRole="tablist">
      {state.routes.map((route, index) => {
        const item = ITEMS[route.name];
        if (!item) return null;
        const active = state.index === index;
        return (
          <Pressable
            key={route.key}
            accessibilityRole="tab"
            accessibilityState={{ selected: active }}
            accessibilityLabel={item.label}
            style={styles.button}
            onPress={() => { if (!active) navigateToTab(route.key); }}
          >
            <Text style={[styles.icon, active && { color: colors.orange }]}>{glyph(item.icon)}</Text>
            <Text style={[styles.label, active && { color: colors.forest }]}>{item.label}</Text>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  nav: { backgroundColor: colors.nav, borderTopWidth: 1, borderTopColor: colors.navLine, flexDirection: 'row', justifyContent: 'space-around', alignItems: 'stretch', paddingTop: 6, paddingHorizontal: 12 },
  button: { alignItems: 'center', justifyContent: 'center', gap: 1, minWidth: 60 },
  icon: { fontFamily: 'Arial', fontWeight: '700', fontSize: 24, lineHeight: 25, color: colors.navIdle },
  label: { fontSize: 10, fontFamily: fonts.body700, color: colors.navIdle },
});
