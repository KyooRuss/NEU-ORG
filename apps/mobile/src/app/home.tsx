import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { router, useFocusEffect } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import BottomNav from '@/components/bottom-nav';
import { BRAND_GRADIENT } from '@/constants/brand';
import { HAMI_IMAGES, HAMI_MOOD_BY_KIND, type HamiMood } from '@/constants/hami';
import {
  fetchNotifications,
  fetchReadKeys,
  markRead,
  notificationHref,
  onReadChanged,
  type NotificationItem,
} from '@/lib/notifications';
import { fetchProfile, type Profile } from '@/lib/profile';
import { fetchRecommendations, type RecommendedOrg } from '@/lib/recommendations';
import { supabase } from '@/lib/supabase';

// Room at the bottom of the page for the navigation bar.
const NAV_SPACE = 110;

// What Hami is telling the student: their newest unread notification, or
// null when everything has been read.
type HamiNews = { status: 'loading' } | { status: 'error' } | { status: 'ready'; item: NotificationItem | null };

function hamiSays(news: HamiNews): { mood: HamiMood; title: string | null; text: string } {
  if (news.status === 'loading') {
    return { mood: 'happy', title: null, text: 'Check out the latest events from your organizations!' };
  }
  if (news.status === 'error') {
    return { mood: 'worried', title: null, text: 'I couldn’t check your notifications. Check your connection.' };
  }
  if (!news.item) {
    return { mood: 'sleepy', title: null, text: 'You’re all caught up! I’ll tell you when something new comes up.' };
  }
  return { mood: HAMI_MOOD_BY_KIND[news.item.kind], title: news.item.title, text: news.item.body };
}

// The student dashboard. Recommended For You is live (recommend_for_me() in the
// database); My Organizations is a placeholder until memberships are shown.
// Styled with StyleSheet so every spacing and color applies the same on web and phones.
export default function HomeScreen() {
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [recommendations, setRecommendations] = useState<RecommendedOrg[] | null>(null);
  const [loadError, setLoadError] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [userId, setUserId] = useState<string | null>(null);
  const [news, setNews] = useState<HamiNews>({ status: 'loading' });

  // The Hami images are square (about 1254 x 1254).
  const hamiSize = Math.min(Math.max(width * 0.3, 110), 140);

  useEffect(() => {
    let active = true;

    supabase.auth.getSession().then(({ data }) => {
      if (!data.session) {
        router.replace('/login');
        return;
      }
      setUserId(data.session.user.id);
      fetchProfile(data.session.user.id)
        .then((loaded) => active && setProfile(loaded))
        .catch(() => {
          // Keep the generic greeting if the profile can't be loaded.
        });
      fetchRecommendations()
        .then((loaded) => active && setRecommendations(loaded))
        .catch(() => active && setLoadError(true));
    });

    return () => {
      active = false;
    };
  }, []);

  // Hami checks again each time Home is shown (e.g. back from a notification)
  // and whenever something is marked read, so it moves on to the next news.
  useFocusEffect(
    useCallback(() => {
      if (!userId) return;
      let active = true;

      function load(profileId: string) {
        Promise.all([fetchNotifications(profileId), fetchReadKeys(profileId)])
          .then(([items, read]) => {
            if (active) setNews({ status: 'ready', item: items.find((item) => !read.has(item.key)) ?? null });
          })
          .catch(() => active && setNews({ status: 'error' }));
      }

      load(userId);
      const unsubscribe = onReadChanged(() => load(userId));
      return () => {
        active = false;
        unsubscribe();
      };
    }, [userId]),
  );

  function openNews(item: NotificationItem) {
    markRead([item.key]).catch(() => {
      // It'll still show as unread next time; opening it matters more.
    });
    const href = notificationHref(item);
    if (href) router.push(href);
  }

  async function handleLogout() {
    setMenuOpen(false);
    await supabase.auth.signOut();
    router.replace('/login');
  }

  const firstName = profile?.full_name?.split(' ')[0] ?? 'there';
  const initial = (profile?.full_name ?? profile?.email ?? '?').trim().charAt(0).toUpperCase();
  const hami = hamiSays(news);
  const newsItem = news.status === 'ready' ? news.item : null;

  return (
    <View style={styles.screen}>
      <StatusBar style="light" />
      <ScrollView contentContainerStyle={{ paddingBottom: NAV_SPACE + insets.bottom }}>
        <LinearGradient {...BRAND_GRADIENT} style={[styles.header, { paddingTop: insets.top + 16 }]}>
          <View style={styles.column}>
            <View style={styles.headerRow}>
              <Text style={styles.greeting} numberOfLines={1}>
                Hello, {firstName}!
              </Text>
              <Pressable
                onPress={() => setMenuOpen((open) => !open)}
                style={({ pressed }) => [styles.avatar, pressed && styles.pressed]}
                accessibilityRole="button"
                accessibilityLabel="Account menu">
                <Text style={styles.avatarText}>{initial}</Text>
              </Pressable>
            </View>

            <View style={styles.hamiRow}>
              <Image
                source={HAMI_IMAGES[hami.mood]}
                style={{ width: hamiSize, height: hamiSize }}
                contentFit="contain"
                transition={200}
                accessibilityLabel={`Hami, the NEU-ORG mascot, looks ${hami.mood}`}
              />
              <View style={styles.bubbleWrap}>
                {/* The little point of the speech bubble, toward Hami. */}
                <View style={styles.bubbleTail} />
                <Pressable
                  onPress={newsItem ? () => openNews(newsItem) : undefined}
                  disabled={!newsItem}
                  style={({ pressed }) => [styles.bubble, pressed && styles.pressed]}
                  accessibilityRole={newsItem ? 'button' : 'text'}
                  accessibilityHint={newsItem ? 'Opens this notification' : undefined}>
                  <Text style={styles.bubbleName}>Hami</Text>
                  {hami.title && (
                    <Text style={styles.bubbleTitle} numberOfLines={2}>
                      {hami.title}
                    </Text>
                  )}
                  <Text style={styles.bubbleText} numberOfLines={hami.title ? 2 : undefined}>
                    {hami.text}
                  </Text>
                </Pressable>
              </View>
            </View>
          </View>
        </LinearGradient>

        <View style={styles.panel}>
          <View style={styles.column}>
            <Text style={styles.sectionTitle}>Recommended For You</Text>
            <Text style={styles.sectionSubtitle}>Based on your profile and interests</Text>

            {recommendations === null && !loadError && (
              <ActivityIndicator style={styles.loading} color="#3549D6" />
            )}
            {loadError && (
              <Notice text="Recommendations couldn't load. Check your connection and open the app again." />
            )}
            {recommendations?.length === 0 && (
              <Notice text="No matches yet. As more organizations join NEU-ORG, recommendations based on your interests will show up here." />
            )}
            <View style={styles.cards}>
              {recommendations?.map((org) => (
                <OrgCard key={org.id} org={org} />
              ))}
            </View>

            <Text style={[styles.sectionTitle, styles.nextSection]}>My Organizations</Text>
            <Text style={styles.sectionSubtitle}>Organizations you’ve joined</Text>
            <Notice text="Organizations you join will appear here, with their latest events and announcements." />
          </View>
        </View>
      </ScrollView>

      {menuOpen && (
        <>
          {/* Tap anywhere else to close the menu. */}
          <Pressable style={StyleSheet.absoluteFill} onPress={() => setMenuOpen(false)} />
          <View style={[styles.menu, { top: insets.top + 62 }]}>
            <Text style={styles.menuEmail} numberOfLines={1}>
              {profile?.email}
            </Text>
            <Pressable
              onPress={handleLogout}
              style={({ pressed }) => [styles.menuItem, pressed && styles.menuItemPressed]}>
              <Ionicons name="log-out-outline" size={18} color="#DC2626" />
              <Text style={styles.menuItemText}>Log out</Text>
            </Pressable>
          </View>
        </>
      )}

      <BottomNav />
    </View>
  );
}

function OrgCard({ org }: { org: RecommendedOrg }) {
  return (
    <View style={styles.card}>
      <Image
        source={org.logoUrl ? { uri: org.logoUrl } : require('@/assets/images/neu-org-logo.png')}
        style={styles.logo}
        contentFit="cover"
        accessibilityIgnoresInvertColors
      />
      <View style={styles.cardText}>
        <Text style={styles.orgName} numberOfLines={1}>
          {org.name}
        </Text>
        <Text style={styles.reason} numberOfLines={2}>
          {org.reason}
        </Text>
      </View>
      {org.recruitmentOpen && (
        <View style={styles.openBadge}>
          <Text style={styles.openText}>Open</Text>
        </View>
      )}
    </View>
  );
}

function Notice({ text }: { text: string }) {
  return (
    <View style={styles.notice}>
      <Text style={styles.noticeText}>{text}</Text>
    </View>
  );
}

const INK = '#1E2440';
const MUTED = '#71717A';

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: '#EEF1FB' },
  // Content stays phone-width on tablets instead of stretching across the screen.
  column: { width: '100%', maxWidth: 480, alignSelf: 'center', paddingHorizontal: 20 },
  pressed: { opacity: 0.7 },

  header: { paddingBottom: 44 },
  headerRow: { flexDirection: 'row', alignItems: 'center' },
  greeting: { flex: 1, fontFamily: 'Poppins_600SemiBold', fontSize: 22, color: '#FFFFFF' },
  avatar: {
    height: 40,
    width: 40,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.25)',
  },
  avatarText: { fontFamily: 'Poppins_600SemiBold', fontSize: 16, color: '#FFFFFF' },

  hamiRow: { marginTop: 14, flexDirection: 'row', alignItems: 'center' },
  bubbleWrap: { flex: 1, marginLeft: 6, flexDirection: 'row', alignItems: 'center' },
  bubbleTail: {
    width: 14,
    height: 14,
    marginRight: -7,
    transform: [{ rotate: '45deg' }],
    backgroundColor: 'rgba(255, 255, 255, 0.22)',
  },
  bubble: {
    flex: 1,
    borderRadius: 18,
    backgroundColor: 'rgba(255, 255, 255, 0.22)',
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  bubbleName: { fontFamily: 'Poppins_500Medium', fontSize: 11, color: 'rgba(255, 255, 255, 0.85)' },
  bubbleTitle: { marginTop: 2, fontFamily: 'Poppins_600SemiBold', fontSize: 13, lineHeight: 19, color: '#FFFFFF' },
  bubbleText: { marginTop: 2, fontFamily: 'Poppins_400Regular', fontSize: 13, lineHeight: 19, color: '#FFFFFF' },

  panel: {
    marginTop: -24,
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    backgroundColor: '#EEF1FB',
    paddingTop: 24,
  },
  sectionTitle: { fontFamily: 'Poppins_600SemiBold', fontSize: 20, color: INK },
  sectionSubtitle: { marginBottom: 14, fontFamily: 'Poppins_400Regular', fontSize: 12, color: MUTED },
  nextSection: { marginTop: 28 },
  loading: { marginVertical: 24 },

  cards: { gap: 12 },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 18,
    borderWidth: 1,
    borderColor: '#E4E7F2',
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 14,
    paddingVertical: 14,
    shadowColor: INK,
    shadowOpacity: 0.06,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
  },
  logo: { width: 48, height: 48, borderRadius: 24 },
  cardText: { flex: 1, marginLeft: 12 },
  orgName: { fontFamily: 'Poppins_600SemiBold', fontSize: 15, color: INK },
  reason: { marginTop: 2, fontFamily: 'Poppins_400Regular', fontSize: 12, lineHeight: 17, color: MUTED },
  openBadge: {
    marginLeft: 8,
    borderRadius: 6,
    backgroundColor: '#DCFCE7',
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  openText: { fontFamily: 'Poppins_500Medium', fontSize: 11, color: '#15803D' },

  notice: {
    borderRadius: 18,
    borderWidth: 1,
    borderStyle: 'dashed',
    borderColor: '#D4D4D8',
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 16,
    paddingVertical: 16,
  },
  noticeText: { fontFamily: 'Poppins_400Regular', fontSize: 12, lineHeight: 18, color: MUTED },

  menu: {
    position: 'absolute',
    right: 20,
    width: 190,
    borderRadius: 16,
    backgroundColor: '#FFFFFF',
    paddingVertical: 8,
    shadowColor: '#000000',
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 8,
  },
  menuEmail: { paddingHorizontal: 16, paddingBottom: 8, fontFamily: 'Poppins_400Regular', fontSize: 12, color: MUTED },
  menuItem: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 10 },
  menuItemPressed: { backgroundColor: '#F5F7FB' },
  menuItemText: { marginLeft: 8, fontFamily: 'Poppins_500Medium', fontSize: 14, color: '#DC2626' },
});
