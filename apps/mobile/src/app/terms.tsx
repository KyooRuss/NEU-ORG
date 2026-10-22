import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  type NativeScrollEvent,
  type NativeSyntheticEvent,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { BRAND_GRADIENT } from '@/constants/brand';
import { supabase } from '@/lib/supabase';
import { acceptTerms, TERMS_SECTIONS } from '@/lib/terms';

// How close to the bottom (in points) counts as having scrolled to the end.
const END_SLACK = 24;

// Shown after login until the student accepts the current Terms & Privacy Policy.
// The checkbox unlocks only after scrolling to the end, so consent is informed.
export default function TermsScreen() {
  const insets = useSafeAreaInsets();
  const [scrolledToEnd, setScrolledToEnd] = useState(false);
  const [viewHeight, setViewHeight] = useState(0);
  const [contentHeight, setContentHeight] = useState(0);
  const [agreed, setAgreed] = useState(false);
  const [saving, setSaving] = useState(false);

  // On a big screen the whole text may fit without scrolling; that counts as read too.
  const fitsOnScreen = viewHeight > 0 && contentHeight > 0 && contentHeight <= viewHeight + END_SLACK;
  const canAgree = scrolledToEnd || fitsOnScreen;

  function handleScroll({ nativeEvent }: NativeSyntheticEvent<NativeScrollEvent>) {
    const { layoutMeasurement, contentOffset, contentSize } = nativeEvent;
    if (layoutMeasurement.height + contentOffset.y >= contentSize.height - END_SLACK) {
      setScrolledToEnd(true);
    }
  }

  async function handleAccept() {
    setSaving(true);
    try {
      await acceptTerms();
      router.replace('/home');
    } catch (error) {
      setSaving(false);
      Alert.alert(
        'Could not save',
        error instanceof Error ? error.message : 'Please check your connection and try again.',
      );
    }
  }

  async function handleDecline() {
    const confirmed = await confirm(
      'Decline the Terms?',
      'NEU-ORG needs your consent to use your information, so you will be logged out.',
    );
    if (!confirmed) return;
    await supabase.auth.signOut();
    router.replace('/login');
  }

  return (
    <View className="flex-1">
      <StatusBar style="light" />
      <LinearGradient {...BRAND_GRADIENT} style={StyleSheet.absoluteFill} />

      <View className="items-center px-8 pb-8" style={{ paddingTop: insets.top + 28 }}>
        <Ionicons name="shield-checkmark" size={36} color="#FFFFFF" />
        <Text className="mt-2 font-display text-5xl text-white">Terms & Privacy</Text>
        <Text className="font-poppins-light text-sm text-white">
          Please read before you continue
        </Text>
      </View>

      <View className="flex-1 rounded-t-[40px] bg-surface">
        <ScrollView
          className="flex-1"
          contentContainerClassName="px-7 pt-8 pb-4"
          onScroll={handleScroll}
          scrollEventThrottle={100}
          onLayout={(event) => setViewHeight(event.nativeEvent.layout.height)}
          onContentSizeChange={(_, height) => setContentHeight(height)}>
          {/* Stays phone-width on tablets instead of stretching across the screen. */}
          <View className="w-full max-w-[420px] gap-5 self-center">
            {TERMS_SECTIONS.map((section) => (
              <View key={section.title}>
                <Text className="mb-1 font-poppins-semibold text-base text-brand-ink">
                  {section.title}
                </Text>
                <Text className="font-poppins text-sm leading-6 text-zinc-600">{section.body}</Text>
              </View>
            ))}
          </View>
        </ScrollView>

        <View
          className="border-t border-zinc-200 px-7 pt-4"
          style={{ paddingBottom: insets.bottom + 16 }}>
          <View className="w-full max-w-[420px] self-center">
            <Pressable
              onPress={() => setAgreed((value) => !value)}
              disabled={!canAgree}
              className={`flex-row items-center ${canAgree ? '' : 'opacity-40'}`}
              accessibilityRole="checkbox"
              accessibilityState={{ checked: agreed, disabled: !canAgree }}>
              <Ionicons
                name={agreed ? 'checkbox' : 'square-outline'}
                size={24}
                color="#3549D6"
              />
              <Text className="ml-3 flex-1 font-poppins text-sm text-brand-ink">
                I have read and agree to the Terms & Privacy Policy
              </Text>
            </Pressable>
            {!canAgree && (
              <Text className="mt-1 pl-9 font-poppins text-xs text-zinc-500">
                Scroll to the end to continue
              </Text>
            )}

            <Pressable
              onPress={handleAccept}
              disabled={!agreed || saving}
              className={`mt-4 h-14 items-center justify-center rounded-full bg-brand-blue active:opacity-80 ${
                agreed ? '' : 'opacity-40'
              }`}>
              {saving ? (
                <ActivityIndicator color="#ffffff" />
              ) : (
                <Text className="font-poppins-medium text-base text-white">Accept</Text>
              )}
            </Pressable>

            <Pressable
              onPress={handleDecline}
              disabled={saving}
              className="mt-3 h-12 items-center justify-center rounded-full border border-zinc-300 bg-white active:opacity-80">
              <Text className="font-poppins-medium text-sm text-brand-ink">Decline</Text>
            </Pressable>
          </View>
        </View>
      </View>
    </View>
  );
}

// A yes/no question. React Native's Alert buttons don't work in the web preview,
// so the browser's own confirm box is used there.
function confirm(title: string, message: string) {
  if (Platform.OS === 'web') {
    return Promise.resolve(window.confirm(`${title}\n\n${message}`));
  }
  return new Promise<boolean>((resolve) =>
    Alert.alert(title, message, [
      { text: 'Cancel', style: 'cancel', onPress: () => resolve(false) },
      { text: 'Log out', style: 'destructive', onPress: () => resolve(true) },
    ]),
  );
}
