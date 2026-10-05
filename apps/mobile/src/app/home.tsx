import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useEffect, useState } from 'react';
import { Pressable, ScrollView, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { fetchProfile, type Profile } from '@/lib/profile';
import { supabase } from '@/lib/supabase';

type Section = {
  icon: keyof typeof Ionicons.glyphMap;
  title: string;
  body: string;
};

// Sample sections for now; each becomes a real screen in later steps.
const sections: Section[] = [
  {
    icon: 'sparkles',
    title: 'Recommended for you',
    body: 'Organizations matched to your interests will appear here after your profile assessment.',
  },
  {
    icon: 'calendar',
    title: 'Upcoming events',
    body: 'Approved events from Main Campus organizations will appear here.',
  },
  {
    icon: 'megaphone',
    title: 'Announcements & memorandums',
    body: 'Official OSAS memorandums and announcements from your organizations will appear here.',
  },
  {
    icon: 'people',
    title: 'My organizations',
    body: 'Organizations you have joined, and the status of your applications.',
  },
];

export default function HomeScreen() {
  const [profile, setProfile] = useState<Profile | null>(null);

  useEffect(() => {
    let active = true;

    supabase.auth.getSession().then(async ({ data }) => {
      if (!data.session) {
        router.replace('/login');
        return;
      }
      try {
        const loaded = await fetchProfile(data.session.user.id);
        if (active) setProfile(loaded);
      } catch {
        // Keep the generic greeting if the profile can't be loaded.
      }
    });

    return () => {
      active = false;
    };
  }, []);

  async function handleLogout() {
    await supabase.auth.signOut();
    router.replace('/login');
  }

  const firstName = profile?.full_name?.split(' ')[0] ?? 'there';

  return (
    <View className="flex-1 bg-surface">
      <StatusBar style="light" />
      <LinearGradient
        colors={['#4263EB', '#6C9BF8']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={{ paddingBottom: 48 }}>
        <SafeAreaView edges={['top']} className="px-6 pt-4">
          <View className="flex-row items-center justify-between">
            <View className="flex-1">
              <Text className="font-poppins text-sm text-white/80">Welcome back,</Text>
              <Text className="font-poppins-semibold text-2xl text-white" numberOfLines={1}>
                Hi, {firstName}!
              </Text>
            </View>
            <Pressable
              onPress={handleLogout}
              accessibilityRole="button"
              accessibilityLabel="Log out"
              className="h-11 w-11 items-center justify-center rounded-full bg-white/20 active:opacity-70">
              <Ionicons name="log-out-outline" size={22} color="#ffffff" />
            </Pressable>
          </View>
          {profile && (
            <View className="mt-3 self-start rounded-full bg-white/20 px-3 py-1">
              <Text className="font-poppins-medium text-xs capitalize text-white">
                {profile.role}
              </Text>
            </View>
          )}
        </SafeAreaView>
      </LinearGradient>

      <ScrollView
        className="-mt-8 flex-1 rounded-t-[32px] bg-surface"
        contentContainerClassName="gap-4 px-6 pb-10 pt-8">
        <View className="rounded-2xl border border-dashed border-brand-blue/40 bg-white px-4 py-3">
          <Text className="font-poppins text-xs text-zinc-600">
            This is a sample home screen. Real organizations and events come in the next steps.
          </Text>
        </View>

        {profile?.role === 'officer' && (
          <View className="rounded-2xl bg-brand-teal px-5 py-4">
            <Text className="font-poppins-semibold text-sm text-white">Officer account</Text>
            <Text className="mt-1 font-poppins text-xs text-white/80">
              Manage your organization, event posts and applications on the NEU ORG web dashboard.
            </Text>
          </View>
        )}

        {sections.map((section) => (
          <View key={section.title} className="rounded-2xl bg-white p-5">
            <View className="flex-row items-center gap-3">
              <View className="h-10 w-10 items-center justify-center rounded-full bg-brand-blue/10">
                <Ionicons name={section.icon} size={20} color="#3549D6" />
              </View>
              <Text className="flex-1 font-poppins-semibold text-base text-brand-ink">
                {section.title}
              </Text>
            </View>
            <Text className="mt-3 font-poppins text-sm text-zinc-500">{section.body}</Text>
          </View>
        ))}
      </ScrollView>
    </View>
  );
}
