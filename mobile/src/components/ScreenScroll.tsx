import type { ReactNode } from 'react';
import { RefreshControl, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Screen } from '@/components/ui';
import { colors } from '@/theme';

/** Schermschil: veilige marges, interne scroll zoals .screen-scroll, pull-to-refresh. */
export function ScreenScroll({ children, onRefresh, refreshing = false, tabs = false }: { children: ReactNode; onRefresh?: () => void; refreshing?: boolean; tabs?: boolean }) {
  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.screen }} edges={tabs ? ['top', 'left', 'right'] : ['top', 'left', 'right', 'bottom']}>
      <ScrollView
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={{ paddingBottom: 90 }}
        refreshControl={onRefresh ? <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.forest} /> : undefined}
      >
        <Screen>{children}</Screen>
      </ScrollView>
    </SafeAreaView>
  );
}
