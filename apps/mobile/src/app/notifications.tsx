import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Pressable, RefreshControl, SectionList, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import BottomNav from '@/components/bottom-nav';
import HamiNotice from '@/components/hami-notice';
import { BRAND_GRADIENT } from '@/constants/brand';
import type { HamiMood } from '@/constants/hami';
import {
  fetchNotifications,
  fetchReadKeys,
  markRead,
  timeAgo,
  type NotificationItem,
  type NotificationKind,
} from '@/lib/notifications';
import { supabase } from '@/lib/supabase';

// Room at the bottom of the page for the navigation bar.
const NAV_SPACE = 110;

const ICONS: Record<NotificationKind, { name: keyof typeof Ionicons.glyphMap; color: string; background: string }> = {
  announcement: { name: 'megaphone-outline', color: '#7E22CE', background: '#F3E8FF' },
  event: { name: 'calendar-outline', color: '#3549D6', background: '#E8EDFD' },
  accepted: { name: 'checkmark-circle-outline', color: '#15803D', background: '#DCFCE7' },
  declined: { name: 'close-circle-outline', color: '#DC2626', background: '#FEE2E2' },
  reminder: { name: 'alarm-outline', color: '#B45309', background: '#FEF3C7' },
  rate: { name: 'star-outline', color: '#B45309', background: '#FEF3C7' },
};

// Announcements, new events, application results and reminders. Ones from the
// student's organizations come first.
// Styled with StyleSheet so every spacing and color applies the same on web and phones.
export default function NotificationsScreen() {
  const insets = useSafeAreaInsets();
  const [userId, setUserId] = useState<string | null>(null);
  const [items, setItems] = useState<NotificationItem[] | null>(null);
  const [readKeys, setReadKeys] = useState<Set<string>>(new Set());
  const [loadError, setLoadError] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    let active = true;

    supabase.auth.getSession().then(({ data }) => {
      if (!data.session) {
        router.replace('/login');
        return;
      }
      const profileId = data.session.user.id;
      setUserId(profileId);
      Promise.all([fetchNotifications(profileId), fetchReadKeys(profileId)])
        .then(([loadedItems, loadedReads]) => {
          if (!active) return;
          setItems(loadedItems);
          setReadKeys(loadedReads);
        })
        .catch(() => active && setLoadError(true));
    });

    return () => {
      active = false;
    };
  }, []);

  const handleRefresh = useCallback(async () => {
    if (!userId) return;
    setRefreshing(true);
    try {
      const [loadedItems, loadedReads] = await Promise.all([fetchNotifications(userId), fetchReadKeys(userId)]);
      setItems(loadedItems);
      setReadKeys(loadedReads);
      setLoadError(false);
    } catch {
      setLoadError(true);
    } finally {
      setRefreshing(false);
    }
  }, [userId]);

  const unreadKeys = useMemo(
    () => (items ?? []).filter((item) => !readKeys.has(item.key)).map((item) => item.key),
    [items, readKeys],
  );

  const sections = useMemo(() => {
    const mine = (items ?? []).filter((item) => item.mine);
    const others = (items ?? []).filter((item) => !item.mine);
    return [
      { title: 'My Organizations', data: mine },
      { title: 'Other Organizations', data: others },
    ].filter((section) => section.data.length > 0);
  }, [items]);

  // Shows them as read right away; saving happens in the background.
  function setRead(keys: string[]) {
    if (keys.length === 0) return;
    setReadKeys((current) => new Set([...current, ...keys]));
    markRead(keys).catch(() => {
      // Stays read on screen; it'll show as unread again after a refresh.
    });
  }

  function open(item: NotificationItem) {
    setRead([item.key]);
    if ('event' in item.target) {
      router.push({ pathname: '/event/[id]', params: { id: item.target.event } });
    } else if ('announcement' in item.target) {
      router.push({ pathname: '/announcement/[id]', params: { id: item.target.announcement } });
    } else if (item.target.organization) {
      router.push({ pathname: '/organization/[id]', params: { id: item.target.organization } });
    }
  }

  function emptyState(): { mood: HamiMood; text: string } {
    if (loadError) {
      return { mood: 'worried', text: "Notifications couldn't load. Check your connection and pull down to try again." };
    }
    return {
      mood: 'sleepy',
      text: 'No notifications yet. Announcements and new events from organizations will show up here.',
    };
  }

  return (
    <View style={styles.screen}>
      <StatusBar style="light" />
      <LinearGradient {...BRAND_GRADIENT} style={[styles.header, { paddingTop: insets.top + 16 }]}>
        <View style={[styles.column, styles.headerRow]}>
          <View style={styles.headerText}>
            <Text style={styles.title}>Notifications</Text>
            {items !== null && (
              <Text style={styles.subtitle}>
                {unreadKeys.length > 0 ? `${unreadKeys.length} unread` : 'All caught up'}
              </Text>
            )}
          </View>
          <Pressable
            onPress={() => setRead(unreadKeys)}
            disabled={unreadKeys.length === 0}
            style={({ pressed }) => [
              styles.markAll,
              unreadKeys.length === 0 && styles.disabled,
              pressed && styles.pressed,
            ]}
            accessibilityRole="button">
            <Text style={styles.markAllText}>Mark all read</Text>
          </Pressable>
        </View>
      </LinearGradient>

      <SectionList
        sections={sections}
        keyExtractor={(item) => item.key}
        renderSectionHeader={({ section }) =>
          section.title ? (
            <View style={styles.column}>
              <Text style={styles.sectionTitle}>{section.title}</Text>
            </View>
          ) : null
        }
        renderItem={({ item, index, section }) => (
          <View style={styles.column}>
            <NotificationRow
              item={item}
              unread={!readKeys.has(item.key)}
              first={index === 0}
              last={index === section.data.length - 1}
              onPress={() => open(item)}
            />
          </View>
        )}
        stickySectionHeadersEnabled={false}
        ListEmptyComponent={
          items === null && !loadError ? (
            <ActivityIndicator style={styles.loading} color="#3549D6" />
          ) : (
            <View style={styles.column}>
              <HamiNotice {...emptyState()} style={styles.notice} />
            </View>
          )
        }
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} colors={['#3549D6']} tintColor="#3549D6" />
        }
        style={styles.list}
        contentContainerStyle={{ paddingTop: 8, paddingBottom: NAV_SPACE + insets.bottom }}
      />

      <BottomNav />
    </View>
  );
}

type RowProps = { item: NotificationItem; unread: boolean; first: boolean; last: boolean; onPress: () => void };

// One notification. A section's rows join into one white panel with thin lines between.
function NotificationRow({ item, unread, first, last, onPress }: RowProps) {
  const icon = ICONS[item.kind];

  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        styles.row,
        first && styles.rowFirst,
        last && styles.rowLast,
        unread && styles.rowUnread,
        pressed && styles.rowPressed,
      ]}
      accessibilityRole="button"
      accessibilityLabel={`${unread ? 'Unread. ' : ''}${item.title}. ${item.body}`}>
      <View style={[styles.icon, { backgroundColor: icon.background }]}>
        <Ionicons name={icon.name} size={20} color={icon.color} />
      </View>
      <View style={styles.rowText}>
        <Text style={styles.rowTitle} numberOfLines={2}>
          {item.title}
        </Text>
        <Text style={styles.rowBody} numberOfLines={2}>
          {item.body}
        </Text>
        <Text style={styles.rowTime}>{timeAgo(item.at)}</Text>
      </View>
      {unread && <View style={styles.dot} />}
    </Pressable>
  );
}

const INK = '#1E2440';

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: '#EEF1FB' },
  // Content stays phone-width on tablets instead of stretching across the screen.
  column: { width: '100%', maxWidth: 480, alignSelf: 'center', paddingHorizontal: 20 },
  pressed: { opacity: 0.7 },
  disabled: { opacity: 0.5 },

  header: { paddingBottom: 20 },
  headerRow: { flexDirection: 'row', alignItems: 'center' },
  headerText: { flex: 1 },
  title: { fontFamily: 'Poppins_600SemiBold', fontSize: 22, color: '#FFFFFF' },
  subtitle: { fontFamily: 'Poppins_400Regular', fontSize: 12, color: 'rgba(255, 255, 255, 0.85)' },
  markAll: {
    borderRadius: 10,
    backgroundColor: 'rgba(255, 255, 255, 0.22)',
    paddingHorizontal: 12,
    paddingVertical: 7,
  },
  markAllText: { fontFamily: 'Poppins_500Medium', fontSize: 12, color: '#FFFFFF' },

  list: { flex: 1 },
  sectionTitle: {
    marginTop: 16,
    marginBottom: 6,
    fontFamily: 'Poppins_600SemiBold',
    fontSize: 11,
    letterSpacing: 1,
    textTransform: 'uppercase',
    color: '#8A8FA3',
  },
  loading: { marginVertical: 24 },
  notice: { marginTop: 16 },

  row: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#EEF0F5',
    paddingHorizontal: 14,
    paddingVertical: 14,
  },
  rowFirst: { borderTopLeftRadius: 18, borderTopRightRadius: 18 },
  rowLast: { borderBottomWidth: 0, borderBottomLeftRadius: 18, borderBottomRightRadius: 18 },
  // A faint blue tint, on top of the dot, so unread ones stand out.
  rowUnread: { backgroundColor: '#F7F9FF' },
  rowPressed: { backgroundColor: '#EEF1FB' },
  icon: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center', borderRadius: 20 },
  rowText: { flex: 1 },
  rowTitle: { fontFamily: 'Poppins_600SemiBold', fontSize: 13, lineHeight: 19, color: INK },
  rowBody: { marginTop: 2, fontFamily: 'Poppins_400Regular', fontSize: 12, lineHeight: 18, color: '#52525B' },
  rowTime: { marginTop: 4, fontFamily: 'Poppins_400Regular', fontSize: 11, color: '#A1A1AA' },
  dot: { marginTop: 6, width: 8, height: 8, borderRadius: 4, backgroundColor: '#3549D6' },
});
