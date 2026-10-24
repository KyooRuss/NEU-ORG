import { Ionicons } from '@expo/vector-icons';
import { router, usePathname, type Href } from 'expo-router';
import { Alert, Platform, Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

type Tab = {
  key: string;
  label: string;
  icon: keyof typeof Ionicons.glyphMap;
  // The screen it opens. Tabs without one aren't built yet.
  href?: Href;
};

// Home sits in the middle as the big round button.
const LEFT_TABS: Tab[] = [
  { key: 'organizations', label: 'Organizations', icon: 'people-outline', href: '/organizations' },
  { key: 'recruitment', label: 'Recruitment', icon: 'phone-portrait-outline', href: '/recruitment' },
];
const RIGHT_TABS: Tab[] = [
  { key: 'events', label: 'Events', icon: 'calendar-outline' },
  { key: 'notifications', label: 'Notifications', icon: 'notifications-outline' },
];

// Sample count until notifications are built.
const SAMPLE_NOTIFICATIONS = 4;

// The app's bottom navigation. Home, Organizations and Recruitment work; the other tabs are
// built in later steps. The tab for the current screen is highlighted.
export default function BottomNav() {
  const insets = useSafeAreaInsets();
  const pathname = usePathname();
  const onHome = pathname === '/home';

  return (
    <View style={[styles.bar, { paddingBottom: Math.max(insets.bottom, 10) }]}>
      {LEFT_TABS.map((tab) => (
        <TabButton key={tab.key} tab={tab} active={!!tab.href && pathname.startsWith(String(tab.href))} />
      ))}

      <View style={styles.homeSlot}>
        <Pressable
          onPress={() => !onHome && router.replace('/home')}
          style={[styles.home, !onHome && styles.homeIdle]}
          accessibilityRole="button"
          accessibilityLabel="Home"
          accessibilityState={{ selected: onHome }}>
          <Ionicons name={onHome ? 'home' : 'home-outline'} size={26} color={onHome ? '#FFFFFF' : '#3549D6'} />
        </Pressable>
      </View>

      {RIGHT_TABS.map((tab) => (
        <TabButton
          key={tab.key}
          tab={tab}
          active={false}
          badge={tab.key === 'notifications' ? SAMPLE_NOTIFICATIONS : 0}
        />
      ))}
    </View>
  );
}

function TabButton({ tab, active, badge = 0 }: { tab: Tab; active: boolean; badge?: number }) {
  function handlePress() {
    if (!tab.href) comingSoon(tab.label);
    else if (!active) router.replace(tab.href);
  }

  return (
    <Pressable
      onPress={handlePress}
      style={styles.tab}
      hitSlop={6}
      accessibilityRole="button"
      accessibilityState={{ selected: active }}
      accessibilityLabel={badge ? `${tab.label}, ${badge} new` : tab.label}>
      <View style={[styles.iconWrap, active && styles.iconWrapActive]}>
        <Ionicons
          name={active ? (tab.icon.replace('-outline', '') as Tab['icon']) : tab.icon}
          size={24}
          color={active ? '#FFFFFF' : '#52525B'}
        />
      </View>
      {badge > 0 && (
        <View style={styles.badge}>
          <Text style={styles.badgeText}>{badge}</Text>
        </View>
      )}
    </Pressable>
  );
}

// React Native's Alert does nothing in the web preview, so use the browser's there.
export function comingSoon(label: string) {
  const message = `${label} is coming soon.`;
  if (Platform.OS === 'web') window.alert(message);
  else Alert.alert(label, message);
}

const styles = StyleSheet.create({
  bar: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    paddingTop: 10,
    paddingHorizontal: 12,
    shadowColor: '#1E2440',
    shadowOpacity: 0.1,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: -4 },
    elevation: 12,
  },
  tab: { flex: 1, alignItems: 'center', paddingVertical: 2 },
  iconWrap: { height: 44, width: 44, alignItems: 'center', justifyContent: 'center', borderRadius: 22 },
  iconWrapActive: { backgroundColor: '#3549D6' },
  homeSlot: { flex: 1, alignItems: 'center' },
  home: {
    marginTop: -30,
    height: 60,
    width: 60,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 30,
    backgroundColor: '#3549D6',
    borderWidth: 4,
    borderColor: '#FFFFFF',
    shadowColor: '#3549D6',
    shadowOpacity: 0.35,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
    elevation: 8,
  },
  homeIdle: { backgroundColor: '#EEF1FB', shadowOpacity: 0.12 },
  badge: {
    position: 'absolute',
    top: 0,
    right: '28%',
    minWidth: 18,
    height: 18,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 9,
    backgroundColor: '#EF4444',
    paddingHorizontal: 4,
  },
  badgeText: { fontFamily: 'Poppins_600SemiBold', fontSize: 10, color: '#FFFFFF' },
});
