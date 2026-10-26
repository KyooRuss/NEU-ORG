import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { type ReactNode, useEffect, useState } from 'react';
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
import {
  chooseGoogleAccount,
  isSchoolEmail,
  SCHOOL_DOMAIN,
  sendCode,
  signInErrorMessage,
  verifyCode,
} from '@/lib/auth';
import { fetchProfile, type Profile } from '@/lib/profile';
import { supabase } from '@/lib/supabase';
import { nextScreen } from '@/lib/onboarding';

// login-hami.png is 1080 x 798, trimmed to Hami. The bottom ~4% is the rounded
// underside of his sleeves, so he's lowered by that much: the widest part of
// his sleeves then sits right on the login card's top edge.
const HAMI_ASPECT = 1080 / 798;
const HAMI_SINK = 0.04;
// Seconds before another code can be sent.
const RESEND_SECONDS = 60;

function clamp(value: number, min: number, max: number) {
  return Math.min(Math.max(value, min), max);
}

// Signing in: "Continue with Google", then the 6-digit code emailed to that
// NEU account (see lib/auth.ts). In Expo Go there's also a password form for
// the seeded test accounts.
export default function LoginScreen() {
  // The NEU email the code was sent to; null until Google is done.
  const [codeEmail, setCodeEmail] = useState<string | null>(null);
  const [code, setCode] = useState('');
  const [cooldown, setCooldown] = useState(0);
  const [loading, setLoading] = useState(false);
  const [usePassword, setUsePassword] = useState(false);

  const { width, height } = useWindowDimensions();
  // Room for the notch / status bar and the phone's bottom bar.
  const insets = useSafeAreaInsets();
  // Smaller on short phones so the form still fits; capped on tablets.
  const hamiWidth = clamp(Math.min(width * 0.7, height * 0.32), 200, 360);
  const hamiHeight = hamiWidth / HAMI_ASPECT;

  // Counts down until "Resend code" works again.
  useEffect(() => {
    if (cooldown <= 0) return;
    const timer = setTimeout(() => setCooldown((seconds) => seconds - 1), 1000);
    return () => clearTimeout(timer);
  }, [cooldown]);

  async function handleGoogle() {
    setLoading(true);
    try {
      const email = await chooseGoogleAccount();
      if (!email) return;
      if (!isSchoolEmail(email)) {
        Alert.alert('Use your NEU account', `Sign in with your NEU Google account (@${SCHOOL_DOMAIN}).`);
        return;
      }
      await sendCode(email);
      setCodeEmail(email);
      setCode('');
      setCooldown(RESEND_SECONDS);
    } catch (error) {
      Alert.alert('Sign-in failed', signInErrorMessage(error));
    } finally {
      setLoading(false);
    }
  }

  async function handleVerify() {
    if (!codeEmail) return;
    if (!/^\d{6}$/.test(code)) {
      Alert.alert('Enter the code', 'Type the 6-digit code from the email.');
      return;
    }
    setLoading(true);
    try {
      const userId = await verifyCode(codeEmail, code);
      await finishSignIn(userId);
    } catch (error) {
      Alert.alert('Verification failed', signInErrorMessage(error));
    } finally {
      setLoading(false);
    }
  }

  async function handleResend() {
    if (!codeEmail || cooldown > 0) return;
    setLoading(true);
    try {
      await sendCode(codeEmail);
      setCooldown(RESEND_SECONDS);
      Alert.alert('Code sent', `A new code is on its way to ${codeEmail}.`);
    } catch (error) {
      Alert.alert('Couldn’t send the code', signInErrorMessage(error));
    } finally {
      setLoading(false);
    }
  }

  function startOver() {
    setCodeEmail(null);
    setCode('');
    setCooldown(0);
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
            {usePassword ? (
              <PasswordForm onBack={() => setUsePassword(false)} />
            ) : codeEmail ? (
              <>
                <Text className="text-center font-poppins-medium text-base text-brand-ink">
                  Check your email
                </Text>
                <Text className="mt-1 text-center font-poppins text-sm text-zinc-600">
                  Enter the 6-digit code we sent to{'\n'}
                  <Text className="font-poppins-medium text-brand-ink">{codeEmail}</Text>
                </Text>

                <View className="mt-6">
                  <Field
                    icon="keypad"
                    placeholder="6-digit code"
                    value={code}
                    onChangeText={(text) => setCode(text.replace(/\D/g, '').slice(0, 6))}
                    keyboardType="number-pad"
                    maxLength={6}
                    autoComplete="one-time-code"
                    textContentType="oneTimeCode"
                    autoFocus
                    onSubmitEditing={handleVerify}
                  />
                </View>

                <Pressable
                  onPress={handleVerify}
                  disabled={loading}
                  className="mt-6 h-14 items-center justify-center rounded-full bg-brand-blue active:opacity-80">
                  {loading ? (
                    <ActivityIndicator color="#ffffff" />
                  ) : (
                    <Text className="font-poppins-medium text-base text-white">Verify</Text>
                  )}
                </Pressable>

                <View className="mt-5 flex-row items-center justify-center">
                  <Pressable onPress={handleResend} disabled={loading || cooldown > 0} hitSlop={8}>
                    <Text
                      className={`font-poppins-medium text-xs ${cooldown > 0 ? 'text-zinc-400' : 'text-brand-blue'}`}>
                      {cooldown > 0 ? `Resend code in ${cooldown}s` : 'Resend code'}
                    </Text>
                  </Pressable>
                  <Text className="mx-2 font-poppins text-xs text-zinc-400">·</Text>
                  <Pressable onPress={startOver} disabled={loading} hitSlop={8}>
                    <Text className="font-poppins-medium text-xs text-brand-blue">Use a different account</Text>
                  </Pressable>
                </View>
              </>
            ) : (
              <>
                <Text className="mb-6 text-center font-poppins text-sm text-zinc-600">
                  Sign in with your NEU Google account
                </Text>
                <Pressable
                  onPress={handleGoogle}
                  disabled={loading}
                  className="h-14 flex-row items-center justify-center rounded-full border border-zinc-300 bg-white active:opacity-80">
                  {loading ? (
                    <ActivityIndicator color="#3549D6" />
                  ) : (
                    <>
                      <Image
                        source={require('@/assets/images/google-logo.png')}
                        style={{ width: 20, height: 20 }}
                        accessibilityIgnoresInvertColors
                      />
                      <Text className="ml-2 font-poppins-medium text-sm text-brand-ink">
                        Continue with Google
                      </Text>
                    </>
                  )}
                </Pressable>
                <Text className="mt-4 text-center font-poppins text-xs text-zinc-500">
                  We’ll email a 6-digit code to confirm it’s you.
                </Text>

                {/* Only in development (Expo Go): the seeded test accounts use passwords. */}
                {__DEV__ && (
                  <Pressable onPress={() => setUsePassword(true)} className="mt-8 self-center" hitSlop={8}>
                    <Text className="font-poppins text-xs text-zinc-400 underline">Use password (testing)</Text>
                  </Pressable>
                )}
              </>
            )}
          </View>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

// After any sign-in: admins (OSAS) use the web dashboard, not the app; everyone
// else goes to the Terms & Privacy, then the Profile Assessment, then home.
async function finishSignIn(userId: string) {
  let profile: Profile | null = null;
  try {
    profile = await fetchProfile(userId);
  } catch {
    profile = null;
  }

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

  router.replace(nextScreen(profile));
}

// The old email + password login, kept for the seeded test accounts. Shown
// only in development.
function PasswordForm({ onBack }: { onBack: () => void }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);

  async function handleLogin() {
    if (!email.trim() || !password) {
      Alert.alert('Missing details', 'Enter your email and password.');
      return;
    }

    setLoading(true);
    const { data, error } = await supabase.auth.signInWithPassword({ email: email.trim(), password });
    if (error) {
      setLoading(false);
      Alert.alert('Login failed', error.message);
      return;
    }
    await finishSignIn(data.user.id);
    setLoading(false);
  }

  return (
    <>
      <View className="gap-4">
        <Field
          icon="person"
          placeholder="Email"
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
              <Ionicons name={showPassword ? 'eye-off-outline' : 'eye-outline'} size={20} color="#52525B" />
            </Pressable>
          }
        />
      </View>

      <Pressable
        onPress={handleLogin}
        disabled={loading}
        className="mt-6 h-14 items-center justify-center rounded-full bg-brand-blue active:opacity-80">
        {loading ? (
          <ActivityIndicator color="#ffffff" />
        ) : (
          <Text className="font-poppins-medium text-base text-white">Login (testing)</Text>
        )}
      </Pressable>

      <Pressable onPress={onBack} className="mt-5 self-center" hitSlop={8}>
        <Text className="font-poppins-medium text-xs text-brand-blue">Back to Google sign-in</Text>
      </Pressable>
    </>
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
