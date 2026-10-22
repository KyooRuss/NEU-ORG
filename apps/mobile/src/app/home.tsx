import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useEffect, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, Text, useWindowDimensions, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import BottomNav from '@/components/bottom-nav';
import { BRAND_GRADIENT } from '@/constants/brand';
import { fetchProfile, type Profile } from '@/lib/profile';
import { fetchRecommendations, type RecommendedOrg } from '@/lib/recommendations';
import { supabase } from '@/lib/supabase';

// login-hami.png is 1080 x 798. A dashboard pose will replace it later.
const HAMI_ASPECT = 1080 / 798;
// Room at the bottom of the page for the navigation bar.
const NAV_SPACE = 110;

// The student dashboard. Recommended For You is live (recommend_for_me() in the
// database); My Organizations is a placeholder until memberships are shown.
export default function HomeScreen() {
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [recommendations, setRecommendations] = useState<RecommendedOrg[] | null>(null);
  const [loadError, setLoadError] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);

  const hamiWidth = Math.min(Math.max(width * 0.32, 110), 160);

  useEffect(() => {
    let active = true;

    supabase.auth.getSession().then(async ({ data }) => {
      if (!data.session) {
        router.replace('/login');
        return;
      }
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

  async function handleLogout() {
    setMenuOpen(false);
    await supabase.auth.signOut();
    router.replace('/login');
  }

  const firstName = profile?.full_name?.split(' ')[0] ?? 'there';
  const initial = (profile?.full_name ?? profile?.email ?? '?').trim().charAt(0).toUpperCase();

  return (
    <View className="flex-1 bg-surface">
      <StatusBar style="light" />
      <ScrollView contentContainerStyle={{ paddingBottom: NAV_SPACE + insets.bottom }}>
        <LinearGradient {...BRAND_GRADIENT} style={{ paddingTop: insets.top + 16, paddingBottom: 40 }}>
          {/* Stays phone-width on tablets instead of stretching across the screen. */}
          <View className="w-full max-w-[480px] self-center px-5">
            <View className="flex-row items-center">
              <Text className="flex-1 font-poppins-semibold text-xl text-white" numberOfLines={1}>
                Hello, {firstName}!
              </Text>
              <Pressable
                onPress={() => {}}
                className="h-10 w-10 items-center justify-center rounded-full bg-white/25 active:opacity-70"
                accessibilityRole="button"
                accessibilityLabel="Messages">
                <Ionicons name="chatbubble-ellipses" size={20} color="#FFFFFF" />
              </Pressable>
              <Pressable
                onPress={() => setMenuOpen((open) => !open)}
                className="ml-3 h-10 w-10 items-center justify-center rounded-full bg-white/25 active:opacity-70"
                accessibilityRole="button"
                accessibilityLabel="Account menu">
                <Text className="font-poppins-semibold text-base text-white">{initial}</Text>
              </Pressable>
            </View>

            <View className="mt-4 flex-row items-center">
              <Image
                source={require('@/assets/images/login-hami.png')}
                style={{ width: hamiWidth, height: hamiWidth / HAMI_ASPECT }}
                contentFit="contain"
                accessibilityLabel="Hami, the NEU-ORG mascot"
              />
              <View className="ml-2 flex-1 rounded-2xl bg-white/20 px-4 py-3">
                <Text className="font-poppins-medium text-xs text-white/80">Hami</Text>
                <Text className="font-poppins text-sm text-white">
                  Check out the latest events from your organizations!
                </Text>
              </View>
            </View>
          </View>
        </LinearGradient>

        <View className="-mt-6 rounded-t-[28px] bg-surface pt-6">
          <View className="w-full max-w-[480px] self-center px-5">
            <Text className="font-poppins-semibold text-xl text-brand-ink">Recommended For You</Text>
            <Text className="mb-4 font-poppins text-xs text-zinc-500">
              Based on your profile and interests
            </Text>

            {recommendations === null && !loadError && (
              <ActivityIndicator className="my-6" color="#3549D6" />
            )}
            {loadError && (
              <Notice text="Recommendations couldn't load. Check your connection and open the app again." />
            )}
            {recommendations?.length === 0 && (
              <Notice text="No matches yet. As more organizations join NEU-ORG, recommendations based on your interests will show up here." />
            )}
            <View className="gap-3">
              {recommendations?.map((org) => (
                <OrgCard key={org.id} org={org} />
              ))}
            </View>

            <Text className="mt-8 font-poppins-semibold text-xl text-brand-ink">My Organizations</Text>
            <Text className="mb-4 font-poppins text-xs text-zinc-500">Organizations you’ve joined</Text>
            <Notice text="Organizations you join will appear here, with their latest events and announcements." />
          </View>
        </View>
      </ScrollView>

      {menuOpen && (
        <>
          {/* Tap anywhere else to close the menu. */}
          <Pressable className="absolute inset-0" onPress={() => setMenuOpen(false)} />
          <View
            className="absolute right-5 w-44 rounded-2xl bg-white py-2"
            style={{ top: insets.top + 64, elevation: 8, shadowColor: '#000', shadowOpacity: 0.15, shadowRadius: 12 }}>
            <Text className="px-4 pb-2 font-poppins text-xs text-zinc-500" numberOfLines={1}>
              {profile?.email}
            </Text>
            <Pressable onPress={handleLogout} className="flex-row items-center px-4 py-2.5 active:bg-surface">
              <Ionicons name="log-out-outline" size={18} color="#DC2626" />
              <Text className="ml-2 font-poppins-medium text-sm text-red-600">Log out</Text>
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
    <View
      className="flex-row items-center rounded-2xl bg-white p-4"
      style={{ elevation: 2, shadowColor: '#1E2440', shadowOpacity: 0.06, shadowRadius: 8, shadowOffset: { width: 0, height: 2 } }}>
      <Image
        source={org.logoUrl ? { uri: org.logoUrl } : require('@/assets/images/neu-org-logo.png')}
        style={{ width: 52, height: 52, borderRadius: 26 }}
        contentFit="cover"
        accessibilityIgnoresInvertColors
      />
      <View className="ml-3 flex-1">
        <Text className="font-poppins-semibold text-sm text-brand-ink" numberOfLines={1}>
          {org.name}
        </Text>
        <Text className="font-poppins text-xs text-zinc-500" numberOfLines={2}>
          {org.reason}
        </Text>
      </View>
      {org.recruitmentOpen && (
        <View className="ml-2 rounded-md bg-green-100 px-2 py-0.5">
          <Text className="font-poppins-medium text-xs text-green-700">Open</Text>
        </View>
      )}
    </View>
  );
}

function Notice({ text }: { text: string }) {
  return (
    <View className="rounded-2xl border border-dashed border-zinc-300 bg-white px-4 py-4">
      <Text className="font-poppins text-xs text-zinc-500">{text}</Text>
    </View>
  );
}
