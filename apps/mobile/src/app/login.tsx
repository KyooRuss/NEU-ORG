import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  Text,
  TextInput,
  type TextInputProps,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { fetchProfile, type Profile } from '@/lib/profile';
import { supabase } from '@/lib/supabase';

export default function LoginScreen() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

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

    router.replace('/home');
  }

  return (
    <KeyboardAvoidingView
      className="flex-1 bg-surface"
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <StatusBar style="light" />
      <ScrollView
        contentContainerClassName="flex-grow"
        keyboardShouldPersistTaps="handled"
        bounces={false}>
        <LinearGradient
          colors={['#4263EB', '#6C9BF8']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={{ height: 340 }}>
          <SafeAreaView edges={['top']} className="flex-1 justify-center px-8 pb-12">
            <Text className="font-display text-7xl text-white">Hello!</Text>
            <Text className="font-poppins-light text-xl text-white">Welcome to NEU ORG</Text>
          </SafeAreaView>
        </LinearGradient>

        <View className="-mt-12 flex-1 rounded-t-[48px] bg-surface px-7 pb-10 pt-12">
          <Text className="mb-8 font-poppins-semibold text-3xl text-brand-ink">Login</Text>

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
              icon="lock-closed-outline"
              placeholder="Password"
              value={password}
              onChangeText={setPassword}
              secureTextEntry
              autoComplete="password"
              textContentType="password"
            />
          </View>

          <Pressable
            className="mt-3 self-end"
            onPress={() => Alert.alert('Forgot password', 'Password reset is coming soon.')}>
            <Text className="font-poppins text-xs text-black">Forgot password?</Text>
          </Pressable>

          <Pressable
            onPress={handleLogin}
            disabled={loading}
            className="mt-6 h-12 w-40 items-center justify-center self-center rounded-full bg-brand-teal active:opacity-80">
            {loading ? (
              <ActivityIndicator color="#ffffff" />
            ) : (
              <Text className="font-poppins text-base text-white">Login</Text>
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
            className="h-12 flex-row items-center justify-center rounded-full border border-zinc-300 bg-white active:opacity-80">
            <Ionicons name="logo-google" size={18} color="#EA4335" />
            <Text className="ml-2 font-poppins-medium text-sm text-brand-ink">
              Continue with Google
            </Text>
          </Pressable>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

type FieldProps = TextInputProps & {
  icon: keyof typeof Ionicons.glyphMap;
};

function Field({ icon, ...inputProps }: FieldProps) {
  return (
    <View className="h-14 flex-row items-center rounded-xl bg-field px-4">
      <Ionicons name={icon} size={18} color="#3F3F46" />
      <TextInput
        className="ml-3 flex-1 font-poppins text-sm text-brand-ink"
        placeholderTextColor="#52525B"
        {...inputProps}
      />
    </View>
  );
}
