import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { router, useLocalSearchParams } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useEffect, useState } from 'react';
import { ActivityIndicator, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import Pressable from '@/components/pressable';
import { BRAND_GRADIENT } from '@/constants/brand';
import { formatEventDate } from '@/lib/events';
import { fetchAnnouncement, type Announcement } from '@/lib/notifications';

// One announcement in full, opened from Notifications.
// Styled with StyleSheet so every spacing and color applies the same on web and phones.
export default function AnnouncementScreen() {
  const insets = useSafeAreaInsets();
  const { id } = useLocalSearchParams<{ id: string }>();
  // undefined while loading, null when it was deleted or isn't for this student.
  const [announcement, setAnnouncement] = useState<Announcement | null | undefined>(undefined);
  const [loadError, setLoadError] = useState(false);

  useEffect(() => {
    let active = true;
    fetchAnnouncement(id)
      .then((loaded) => active && setAnnouncement(loaded))
      .catch(() => active && setLoadError(true));
    return () => {
      active = false;
    };
  }, [id]);

  function goBack() {
    if (router.canGoBack()) router.back();
    else router.replace('/notifications');
  }

  return (
    <View style={styles.screen}>
      <StatusBar style="light" />
      <LinearGradient {...BRAND_GRADIENT} style={[styles.header, { paddingTop: insets.top + 12 }]}>
        <View style={[styles.column, styles.headerRow]}>
          <Pressable onPress={goBack} hitSlop={10} style={styles.back} accessibilityRole="button" accessibilityLabel="Back">
            <Ionicons name="chevron-back" size={24} color="#FFFFFF" />
          </Pressable>
          <Text style={styles.headerTitle}>Announcement</Text>
        </View>
      </LinearGradient>

      <ScrollView contentContainerStyle={[styles.column, styles.body, { paddingBottom: insets.bottom + 32 }]}>
        {!announcement ? (
          announcement === undefined && !loadError ? (
            <ActivityIndicator style={styles.loading} color="#3549D6" />
          ) : (
            <View style={styles.notice}>
              <Text style={styles.noticeText}>
                {loadError
                  ? "This announcement couldn't load. Check your connection and try again."
                  : 'This announcement is no longer available.'}
              </Text>
            </View>
          )
        ) : (
          <View style={styles.card}>
            <Pressable
              onPress={() =>
                announcement.org.id &&
                router.push({ pathname: '/organization/[id]', params: { id: announcement.org.id } })
              }
              style={({ pressed }) => [styles.orgChip, pressed && styles.pressed]}
              accessibilityRole="button"
              accessibilityLabel={`Open ${announcement.org.name}`}>
              <Image
                source={
                  announcement.org.logoUrl
                    ? { uri: announcement.org.logoUrl }
                    : require('@/assets/images/neu-org-logo.png')
                }
                style={styles.orgLogo}
                contentFit="cover"
              />
              <Text style={styles.orgName} numberOfLines={1}>
                {announcement.org.name}
              </Text>
              <Ionicons name="chevron-forward" size={14} color="#3549D6" />
            </Pressable>

            <Text style={styles.title}>{announcement.title}</Text>

            <View style={styles.meta}>
              <View style={styles.metaItem}>
                <Ionicons name="calendar-outline" size={14} color="#71717A" />
                <Text style={styles.metaText}>Posted {formatEventDate(announcement.date)}</Text>
              </View>
              <View style={[styles.tag, announcement.audience === 'university' ? styles.tagAll : styles.tagMembers]}>
                <Text
                  style={[
                    styles.tagText,
                    announcement.audience === 'university' ? styles.tagAllText : styles.tagMembersText,
                  ]}>
                  {announcement.audience === 'university' ? 'University Wide' : 'Members only'}
                </Text>
              </View>
            </View>

            <View style={styles.divider} />
            <Text style={styles.paragraph} selectable>
              {announcement.description}
            </Text>
          </View>
        )}
      </ScrollView>
    </View>
  );
}

const INK = '#1E2440';
const BLUE = '#3549D6';

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: '#EEF1FB' },
  // Content stays phone-width on tablets instead of stretching across the screen.
  column: { width: '100%', maxWidth: 480, alignSelf: 'center', paddingHorizontal: 20 },
  pressed: { opacity: 0.75 },

  header: { paddingBottom: 16 },
  headerRow: { flexDirection: 'row', alignItems: 'center' },
  back: { marginLeft: -6, padding: 2 },
  headerTitle: { marginLeft: 6, fontFamily: 'Poppins_600SemiBold', fontSize: 18, color: '#FFFFFF' },

  body: { paddingTop: 16 },
  loading: { marginVertical: 24 },
  notice: {
    borderRadius: 18,
    borderWidth: 1,
    borderStyle: 'dashed',
    borderColor: '#D4D4D8',
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 16,
    paddingVertical: 16,
  },
  noticeText: { fontFamily: 'Poppins_400Regular', fontSize: 12, lineHeight: 18, color: '#71717A' },

  card: {
    borderRadius: 18,
    borderWidth: 1,
    borderColor: '#E4E7F2',
    backgroundColor: '#FFFFFF',
    padding: 18,
    shadowColor: INK,
    shadowOpacity: 0.06,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
  },
  orgChip: {
    alignSelf: 'flex-start',
    maxWidth: '100%',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    borderRadius: 999,
    backgroundColor: '#EEF1FB',
    paddingLeft: 4,
    paddingRight: 10,
    paddingVertical: 4,
  },
  orgLogo: { width: 24, height: 24, borderRadius: 12 },
  orgName: { flexShrink: 1, fontFamily: 'Poppins_500Medium', fontSize: 12, color: BLUE },
  title: { marginTop: 12, fontFamily: 'Poppins_600SemiBold', fontSize: 20, lineHeight: 28, color: INK },
  meta: { marginTop: 8, flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: 10 },
  metaItem: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  metaText: { fontFamily: 'Poppins_400Regular', fontSize: 12, color: '#71717A' },
  tag: { borderRadius: 6, paddingHorizontal: 8, paddingVertical: 2 },
  tagText: { fontFamily: 'Poppins_500Medium', fontSize: 11 },
  tagAll: { backgroundColor: '#E8EDFD' },
  tagAllText: { color: BLUE },
  tagMembers: { backgroundColor: '#F3E8FF' },
  tagMembersText: { color: '#7E22CE' },
  divider: { marginVertical: 16, height: 1, backgroundColor: '#EEF0F5' },
  paragraph: { fontFamily: 'Poppins_400Regular', fontSize: 14, lineHeight: 23, color: '#3F3F46' },
});
