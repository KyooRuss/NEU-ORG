import { Ionicons } from '@expo/vector-icons';
import { router, usePathname, type Href } from 'expo-router';
import { useEffect, useState } from 'react';
import { Alert, Platform, Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { fetchUnreadCount, onReadChanged } from '@/lib/notifications';
import { supabase } from '@/lib/supabase';

type Tab = {
  key: string;
  label: string;
  icon: keyof typeof Ionicons.glyphMap;
  // The screen it opens. Tabs without one aren't built yet.
  href?: Href;
};

// In bar order; Home sits in the middle.
const TABS: Tab[] = [
  { key: 'organizations', label: 'Organizations', icon: 'people-outline', href: '/organizations' },
  { key: 'recruitment', label: 'Recruitment', icon: 'phone-portrait-outline', href: '/recruitment' },
  { key: 'home', label: 'Home', icon: 'home-outline', href: '/home' },
  { key: 'events', label: 'Events', icon: 'calendar-outline', href: '/events' },
  { key: 'notifications', label: 'Notifications', icon: 'notifications-outline', href: '/notifications' },
];

// The app's bottom navigation. The tab for the current screen rises out of the
// bar as a big blue circle, and the bell shows how many notifications are unread.
export default function BottomNav() {
  const insets = useSafeAreaInsets();
  const pathname = usePathname();
  const unread = useUnreadCount();

  return (
    <View style={[styles.bar, { paddingBottom: Math.max(insets.bottom, 10) }]}>
      {TABS.map((tab) => (
        <TabButton
          key={tab.key}
          tab={tab}
          active={isActive(tab, pathname)}
          badge={tab.key === 'notifications' ? unread : 0}
        />
      ))}
    </View>
  );
}

// The student's unread notifications, kept up to date when they read some.
function useUnreadCount() {
  const [count, setCount] = useState(0);

  useEffect(() => {
    let active = true;
    function refresh() {
      supabase.auth.getSession().then(({ data }) => {
        const profileId = data.session?.user.id;
        if (!profileId) return;
        fetchUnreadCount(profileId)
          .then((loaded) => active && setCount(loaded))
          .catch(() => {
            // Keep the last count; it's only a badge.
          });
      });
    }
    refresh();
    const stop = onReadChanged(refresh);
    return () => {
      active = false;
      stop();
    };
  }, []);

  return count;
}

function isActive(tab: Tab, pathname: string) {
  return !!tab.href && pathname.startsWith(String(tab.href));
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
      <View style={active ? styles.raised : styles.iconWrap}>
        <Ionicons
          name={active ? (tab.icon.replace('-outline', '') as Tab['icon']) : tab.icon}
          size={active ? 26 : 24}
          color={active ? '#FFFFFF' : '#52525B'}
        />
        {badge > 0 && (
          <View style={[styles.badge, active && styles.badgeRaised]}>
            <Text style={styles.badgeText}>{badge > 9 ? '9+' : badge}</Text>
          </View>
        )}
      </View>
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
  tab: { flex: 1, alignItems: 'center' },
  iconWrap: { height: 44, width: 44, alignItems: 'center', justifyContent: 'center' },
  // The active tab, lifted half out of the bar.
  raised: {
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
    top: 2,
    right: 2,
    minWidth: 18,
    height: 18,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 9,
    borderWidth: 2,
    borderColor: '#FFFFFF',
    backgroundColor: '#EF4444',
    paddingHorizontal: 3,
  },
  badgeRaised: { top: -4, right: -4 },
  badgeText: { fontFamily: 'Poppins_600SemiBold', fontSize: 10, color: '#FFFFFF' },
});
