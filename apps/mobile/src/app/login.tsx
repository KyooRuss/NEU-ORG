import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { type ReactNode, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  type TextInputProps,
  useWindowDimensions,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { BRAND_GRADIENT } from '@/constants/brand';
import { fetchProfile, type Profile } from '@/lib/profile';
import { supabase } from '@/lib/supabase';
import { nextScreen } from '@/lib/onboarding';

// login-hami.png is 1080 x 798, trimmed to Hami. The bottom ~4% is the rounded
// underside of his sleeves, so he's lowered by that much: the widest part of
// his sleeves then sits right on the login card's top edge.
const HAMI_ASPECT = 1080 / 798;
const HAMI_SINK = 0.04;

function clamp(value: number, min: number, max: number) {
  return Math.min(Math.max(value, min), max);
}

export default function LoginScreen() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);

  const { width, height } = useWindowDimensions();
  // Room for the notch / status bar and the phone's bottom bar.
  const insets = useSafeAreaInsets();
  // Smaller on short phones so the form still fits; capped on tablets.
  const hamiWidth = clamp(Math.min(width * 0.7, height * 0.32), 200, 360);
  const hamiHeight = hamiWidth / HAMI_ASPECT;

  async function handleLogin() {
    if (!email.trim() || !password) {
      Alert.alert('Missing details', 'Enter your email and password.');
      return;
    }

    setLoading(true);
    const { data, error } = await supabase.auth.signInWithPassword({
      email: email.trim(),
      password,
    });

    if (error) {
      setLoading(false);
      Alert.alert('Login failed', error.message);
      return;
    }

    // Admins (OSAS) work on the web dashboard, not the mobile app.
    let profile: Profile | null = null;
    try {
      profile = await fetchProfile(data.user.id);
    } catch {
      profile = null;
    }
    setLoading(false);

    if (!profile || profile.role === 'admin') {
      await supabase.auth.signOut();
      Alert.alert(
        'Login not allowed',
        profile
          ? 'Admin accounts use the NEU ORG web dashboard.'
          : 'Your account has no profile yet. Please contact the OSAS admin.',
      );
      return;
    }

    // Terms & Privacy, then the Profile Assessment, then home.
    router.replace(nextScreen(profile));
  }

  return (
    <KeyboardAvoidingView
      className="flex-1"
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <StatusBar style="light" />
      <LinearGradient {...BRAND_GRADIENT} style={StyleSheet.absoluteFill} />
      <ScrollView
        contentContainerClassName="flex-grow"
        keyboardShouldPersistTaps="handled"
        bounces={false}>
        {/* Spare screen height is split evenly between this and the bottom of the card,
            so everything sits in the middle on any screen. */}
        <View className="flex-grow" style={{ minHeight: insets.top + 24 }} />

        {/* In front of the card, so Hami's sleeves can rest over its top edge. */}
        <View className="items-center px-8" style={{ zIndex: 1 }}>
          <Text className="font-display text-6xl text-white">Hello!</Text>
          <Text className="font-poppins-light text-lg text-white">Welcome to NEU-ORG</Text>

          <Image
            source={require('@/assets/images/login-hami.png')}
            style={{
              width: hamiWidth,
              height: hamiHeight,
              marginTop: 12,
              marginBottom: -hamiHeight * HAMI_SINK,
            }}
            contentFit="contain"
            accessibilityLabel="Hami, the NEU-ORG mascot, waving hello"
          />
        </View>

        <View
          className="flex-grow rounded-t-[40px] bg-surface px-7 pt-10"
          style={{ paddingBottom: insets.bottom + 32 }}>
          {/* Stays phone-width on tablets instead of stretching across the screen. */}
          <View className="w-full max-w-[420px] self-center">
            <View className="gap-4">
              <Field
                icon="person"
                placeholder="Institutional Email"
                value={email}
                onChangeText={setEmail}
                autoCapitalize="none"
                autoComplete="email"
                keyboardType="email-address"
                textContentType="emailAddress"
              />
              <Field
                icon="lock-closed"
                placeholder="Password"
                value={password}
                onChangeText={setPassword}
                secureTextEntry={!showPassword}
                autoComplete="password"
                textContentType="password"
                trailing={
                  <Pressable
                    onPress={() => setShowPassword((shown) => !shown)}
                    hitSlop={10}
                    accessibilityRole="button"
                    accessibilityLabel={showPassword ? 'Hide password' : 'Show password'}>
                    <Ionicons
                      name={showPassword ? 'eye-off-outline' : 'eye-outline'}
                      size={20}
                      color="#52525B"
                    />
                  </Pressable>
                }
              />
            </View>

            <Pressable
              className="mt-3 self-end"
              onPress={() => Alert.alert('Forgot password', 'Password reset is coming soon.')}>
              <Text className="font-poppins text-xs text-brand-blue">Forgot password?</Text>
            </Pressable>

            <Pressable
              onPress={handleLogin}
              disabled={loading}
              className="mt-6 h-14 items-center justify-center rounded-full bg-brand-blue active:opacity-80">
              {loading ? (
                <ActivityIndicator color="#ffffff" />
              ) : (
                <Text className="font-poppins-medium text-base text-white">Login</Text>
              )}
            </Pressable>

            <View className="my-6 flex-row items-center">
              <View className="h-px flex-1 bg-zinc-300" />
              <Text className="mx-3 font-poppins text-xs text-zinc-500">or</Text>
              <View className="h-px flex-1 bg-zinc-300" />
            </View>

            {/* TODO(Step 6): native Google sign-in. */}
            <Pressable
              onPress={() => Alert.alert('Google sign-in', 'Google sign-in is coming soon.')}
              className="h-14 flex-row items-center justify-center rounded-full border border-zinc-300 bg-white active:opacity-80">
              <Image
                source={require('@/assets/images/google-logo.png')}
                style={{ width: 20, height: 20 }}
                accessibilityIgnoresInvertColors
              />
              <Text className="ml-2 font-poppins-medium text-sm text-brand-ink">
                Continue with Google
              </Text>
            </Pressable>
          </View>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

type FieldProps = TextInputProps & {
  icon: keyof typeof Ionicons.glyphMap;
  // Shown at the right end of the field, like the show-password button.
  trailing?: ReactNode;
};

// A rounded input with a blue icon badge on the left.
function Field({ icon, trailing, ...inputProps }: FieldProps) {
  return (
    <View className="h-14 flex-row items-center rounded-full border border-zinc-200 bg-white pl-1.5 pr-4">
      <View className="h-11 w-11 items-center justify-center rounded-full bg-brand-blue">
        <Ionicons name={icon} size={18} color="#FFFFFF" />
      </View>
      <TextInput
        className="ml-3 flex-1 font-poppins text-sm text-brand-ink"
        placeholderTextColor="#71717A"
        {...inputProps}
      />
      {trailing}
    </View>
  );
}
