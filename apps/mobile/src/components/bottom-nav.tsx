import { Ionicons } from '@expo/vector-icons';
import { Alert, Platform, Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

type Tab = {
  key: string;
  label: string;
  icon: keyof typeof Ionicons.glyphMap;
};

// Home sits in the middle as the big round button.
const LEFT_TABS: Tab[] = [
  { key: 'organizations', label: 'Organizations', icon: 'people-outline' },
  { key: 'my-org', label: 'My Organizations', icon: 'phone-portrait-outline' },
];
const RIGHT_TABS: Tab[] = [
  { key: 'events', label: 'Events', icon: 'calendar-outline' },
  { key: 'notifications', label: 'Notifications', icon: 'notifications-outline' },
];

// Sample count until notifications are built.
const SAMPLE_NOTIFICATIONS = 4;

// The app's bottom navigation. Only Home works for now; the other tabs are
// built in later steps.
export default function BottomNav() {
  const insets = useSafeAreaInsets();

  return (
    <View style={[styles.bar, { paddingBottom: Math.max(insets.bottom, 10) }]}>
      {LEFT_TABS.map((tab) => (
        <TabButton key={tab.key} tab={tab} />
      ))}

      <View style={styles.homeSlot}>
        <View style={styles.home} accessibilityRole="button" accessibilityLabel="Home" accessibilityState={{ selected: true }}>
          <Ionicons name="home" size={26} color="#FFFFFF" />
        </View>
      </View>

      {RIGHT_TABS.map((tab) => (
        <TabButton
          key={tab.key}
          tab={tab}
          badge={tab.key === 'notifications' ? SAMPLE_NOTIFICATIONS : 0}
        />
      ))}
    </View>
  );
}

function TabButton({ tab, badge = 0 }: { tab: Tab; badge?: number }) {
  return (
    <Pressable
      onPress={() => comingSoon(tab.label)}
      style={styles.tab}
      hitSlop={6}
      accessibilityRole="button"
      accessibilityLabel={badge ? `${tab.label}, ${badge} new` : tab.label}>
      <Ionicons name={tab.icon} size={24} color="#52525B" />
      {badge > 0 && (
        <View style={styles.badge}>
          <Text style={styles.badgeText}>{badge}</Text>
        </View>
      )}
    </Pressable>
  );
}

// React Native's Alert does nothing in the web preview, so use the browser's there.
function comingSoon(label: string) {
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
  tab: { flex: 1, alignItems: 'center', paddingVertical: 6 },
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
