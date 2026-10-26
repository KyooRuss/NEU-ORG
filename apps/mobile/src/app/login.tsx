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
  type CodeKind,
  isSchoolEmail,
  passwordStep,
  SCHOOL_DOMAIN,
  sendCode,
  setNewPassword,
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

// Which button is working, to show its spinner.
type Busy = 'login' | 'google' | 'forgot' | 'verify' | 'resend' | null;

// Signing in with email + password or "Continue with Google". Either way a
// 6-digit code is emailed to the NEU address, and entering it signs the
// student in (see lib/auth.ts). "Forgot password?" works the same way.
export default function LoginScreen() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [busy, setBusy] = useState<Busy>(null);
  // The code that was emailed, and where to; null while on the first step.
  const [pending, setPending] = useState<{ email: string; kind: CodeKind } | null>(null);
  const [code, setCode] = useState('');
  const [newPassword, setNewPasswordText] = useState('');
  const [cooldown, setCooldown] = useState(0);

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

  function codeSent(to: string, kind: CodeKind) {
    setPending({ email: to, kind });
    setCode('');
    setNewPasswordText('');
    setCooldown(RESEND_SECONDS);
  }

  async function handleLogin() {
    if (!email.trim() || !password) {
      Alert.alert('Missing details', 'Enter your email and password.');
      return;
    }
    setBusy('login');
    try {
      const result = await passwordStep(email, password);
      if ('userId' in result) await finishSignIn(result.userId);
      else codeSent(email.trim().toLowerCase(), result.kind);
    } catch (error) {
      Alert.alert('Login failed', signInErrorMessage(error));
    } finally {
      setBusy(null);
    }
  }

  async function handleGoogle() {
    setBusy('google');
    try {
      const picked = await chooseGoogleAccount();
      if (!picked) return;
      if (!isSchoolEmail(picked)) {
        Alert.alert('Use your NEU account', `Sign in with your NEU Google account (@${SCHOOL_DOMAIN}).`);
        return;
      }
      await sendCode(picked, 'email');
      codeSent(picked, 'email');
    } catch (error) {
      Alert.alert('Sign-in failed', signInErrorMessage(error));
    } finally {
      setBusy(null);
    }
  }

  async function handleForgot() {
    const to = email.trim().toLowerCase();
    if (!to) {
      Alert.alert('Enter your email', 'Type your institutional email first, then tap “Forgot password?”.');
      return;
    }
    setBusy('forgot');
    try {
      await sendCode(to, 'recovery');
      codeSent(to, 'recovery');
    } catch (error) {
      Alert.alert('Couldn’t send the code', signInErrorMessage(error));
    } finally {
      setBusy(null);
    }
  }

  async function handleVerify() {
    if (!pending) return;
    if (!/^\d{6}$/.test(code)) {
      Alert.alert('Enter the code', 'Type the 6-digit code from the email.');
      return;
    }
    if (pending.kind === 'recovery' && newPassword.length < 8) {
      Alert.alert('New password', 'Choose a new password with at least 8 characters.');
      return;
    }
    setBusy('verify');
    try {
      const userId = await verifyCode(pending.email, code, pending.kind);
      if (pending.kind === 'recovery') await setNewPassword(newPassword);
      await finishSignIn(userId);
    } catch (error) {
      Alert.alert('Verification failed', signInErrorMessage(error));
    } finally {
      setBusy(null);
    }
  }

  async function handleResend() {
    if (!pending || cooldown > 0) return;
    setBusy('resend');
    try {
      await sendCode(pending.email, pending.kind);
      setCooldown(RESEND_SECONDS);
      Alert.alert('Code sent', `A new code is on its way to ${pending.email}.`);
    } catch (error) {
      Alert.alert('Couldn’t send the code', signInErrorMessage(error));
    } finally {
      setBusy(null);
    }
  }

  function startOver() {
    setPending(null);
    setCode('');
    setNewPasswordText('');
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
            {pending ? (
              <>
                <Text className="text-center font-poppins-medium text-base text-brand-ink">
                  {pending.kind === 'recovery' ? 'Reset your password' : 'Check your email'}
                </Text>
                <Text className="mt-1 text-center font-poppins text-sm text-zinc-600">
                  Enter the 6-digit code we sent to{'\n'}
                  <Text className="font-poppins-medium text-brand-ink">{pending.email}</Text>
                </Text>

                <View className="mt-6 gap-4">
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
                    onSubmitEditing={pending.kind === 'recovery' ? undefined : handleVerify}
                  />
                  {pending.kind === 'recovery' && (
                    <Field
                      icon="lock-closed"
                      placeholder="New password"
                      value={newPassword}
                      onChangeText={setNewPasswordText}
                      secureTextEntry={!showPassword}
                      autoComplete="new-password"
                      textContentType="newPassword"
                      trailing={
                        <ShowPasswordButton shown={showPassword} onToggle={() => setShowPassword((s) => !s)} />
                      }
                    />
                  )}
                </View>

                <Pressable
                  onPress={handleVerify}
                  disabled={busy !== null}
                  className="mt-6 h-14 items-center justify-center rounded-full bg-brand-blue active:opacity-80">
                  {busy === 'verify' ? (
                    <ActivityIndicator color="#ffffff" />
                  ) : (
                    <Text className="font-poppins-medium text-base text-white">
                      {pending.kind === 'recovery' ? 'Save password' : 'Verify'}
                    </Text>
                  )}
                </Pressable>

                <View className="mt-5 flex-row items-center justify-center">
                  <Pressable onPress={handleResend} disabled={busy !== null || cooldown > 0} hitSlop={8}>
                    <Text
                      className={`font-poppins-medium text-xs ${cooldown > 0 ? 'text-zinc-400' : 'text-brand-blue'}`}>
                      {cooldown > 0 ? `Resend code in ${cooldown}s` : 'Resend code'}
                    </Text>
                  </Pressable>
                  <Text className="mx-2 font-poppins text-xs text-zinc-400">·</Text>
                  <Pressable onPress={startOver} disabled={busy !== null} hitSlop={8}>
                    <Text className="font-poppins-medium text-xs text-brand-blue">Use a different account</Text>
                  </Pressable>
                </View>
              </>
            ) : (
              <>
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
                    onSubmitEditing={handleLogin}
                    trailing={
                      <ShowPasswordButton shown={showPassword} onToggle={() => setShowPassword((s) => !s)} />
                    }
                  />
                </View>

                <Pressable className="mt-3 self-end" onPress={handleForgot} disabled={busy !== null}>
                  {busy === 'forgot' ? (
                    <ActivityIndicator size="small" color="#3549D6" />
                  ) : (
                    <Text className="font-poppins text-xs text-brand-blue">Forgot password?</Text>
                  )}
                </Pressable>

                <Pressable
                  onPress={handleLogin}
                  disabled={busy !== null}
                  className="mt-6 h-14 items-center justify-center rounded-full bg-brand-blue active:opacity-80">
                  {busy === 'login' ? (
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

                <Pressable
                  onPress={handleGoogle}
                  disabled={busy !== null}
                  className="h-14 flex-row items-center justify-center rounded-full border border-zinc-300 bg-white active:opacity-80">
                  {busy === 'google' ? (
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

function ShowPasswordButton({ shown, onToggle }: { shown: boolean; onToggle: () => void }) {
  return (
    <Pressable
      onPress={onToggle}
      hitSlop={10}
      accessibilityRole="button"
      accessibilityLabel={shown ? 'Hide password' : 'Show password'}>
      <Ionicons name={shown ? 'eye-off-outline' : 'eye-outline'} size={20} color="#52525B" />
    </Pressable>
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
