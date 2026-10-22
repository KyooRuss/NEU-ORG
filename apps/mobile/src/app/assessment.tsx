import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { type ReactNode, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  Text,
  TextInput,
  type TextInputProps,
  View,
  type ViewStyle,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import ChipPickerModal from '@/components/chip-picker-modal';
import OptionPickerModal from '@/components/option-picker-modal';
import { BRAND_GRADIENT } from '@/constants/brand';
import {
  type AssessmentOptions,
  COLLEGES,
  fetchAssessmentOptions,
  type PickKind,
  saveAssessment,
  splitFullName,
  YEAR_LEVELS,
} from '@/lib/assessment';
import { fetchProfile } from '@/lib/profile';
import { supabase } from '@/lib/supabase';

const PICKERS: Record<PickKind, { label: string; title: string; subtitle: string; placeholder: string }> = {
  interest: {
    label: 'Interest or Hobby',
    title: 'Interest & Hobbies',
    subtitle: 'Select your interests & hobbies',
    placeholder: 'Select interest or hobby',
  },
  skill: {
    label: 'Skills to improve',
    title: 'Skills to improve',
    subtitle: 'Select the skills you want to improve',
    placeholder: 'Select skills to improve',
  },
  activity: {
    label: 'Preferred Activities',
    title: 'Preferred Activities',
    subtitle: 'Select the activities you enjoy',
    placeholder: 'Select preferred activities',
  },
};

type OpenPicker = PickKind | 'program' | 'year' | null;

// Shown after the Terms, once: what the student studies and likes. Their picks
// drive the AI organization recommendations on the home screen.
export default function AssessmentScreen() {
  const insets = useSafeAreaInsets();
  const [options, setOptions] = useState<AssessmentOptions | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [lastName, setLastName] = useState('');
  const [firstName, setFirstName] = useState('');
  const [department, setDepartment] = useState<string | null>(null);
  const [yearLevel, setYearLevel] = useState<number | null>(null);
  const [picks, setPicks] = useState<Record<PickKind, string[]>>({ interest: [], skill: [], activity: [] });
  const [open, setOpen] = useState<OpenPicker>(null);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    async function load() {
      try {
        const [loaded, { data }] = await Promise.all([fetchAssessmentOptions(), supabase.auth.getUser()]);
        // Start from the account name; the student can correct it.
        const profile = data.user ? await fetchProfile(data.user.id) : null;
        const name = splitFullName(profile?.full_name ?? null);
        setFirstName(name.firstName);
        setLastName(name.lastName);
        setOptions(loaded);
      } catch (loadFailure) {
        setLoadError(loadFailure instanceof Error ? loadFailure.message : 'Could not load the choices.');
      }
    }
    load();
  }, []);

  function problem() {
    if (!lastName.trim() || !firstName.trim()) return 'Enter your last and first name.';
    if (!department) return 'Choose your program.';
    if (!yearLevel) return 'Choose your year level.';
    if (picks.interest.length === 0) return 'Choose at least one interest or hobby.';
    return null;
  }

  async function handleNext() {
    const found = problem();
    setError(found);
    if (found || !department || !yearLevel) return;

    setSaving(true);
    try {
      await saveAssessment({
        firstName,
        lastName,
        department,
        yearLevel,
        interests: picks.interest,
        skills: picks.skill,
        activities: picks.activity,
      });
      router.replace('/home');
    } catch (saveFailure) {
      setSaving(false);
      setError(saveFailure instanceof Error ? saveFailure.message : 'Could not save. Please try again.');
    }
  }

  if (!options) {
    return (
      <View className="flex-1 items-center justify-center bg-surface px-8">
        {loadError ? (
          <Text className="text-center font-poppins text-sm text-red-600">{loadError}</Text>
        ) : (
          <ActivityIndicator color="#3549D6" />
        )}
      </View>
    );
  }

  return (
    <KeyboardAvoidingView
      className="flex-1 bg-surface"
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <StatusBar style="dark" />
      <ScrollView
        contentContainerClassName="flex-grow px-6"
        contentContainerStyle={{ paddingTop: insets.top + 24, paddingBottom: insets.bottom + 32 }}
        keyboardShouldPersistTaps="handled">
        {/* Stays phone-width on tablets instead of stretching across the screen. */}
        <View className="w-full max-w-[420px] self-center">
          <LinearGradient
            {...BRAND_GRADIENT}
            style={{ borderRadius: 20, paddingHorizontal: 24, paddingVertical: 28 }}>
            <View className="flex-row items-center">
              <Ionicons name="person" size={26} color="#FFFFFF" />
              <View className="ml-3 flex-1">
                <Text className="font-poppins-semibold text-xl text-white">Profile Assessment</Text>
                <Text className="font-poppins-light text-xs text-white">Tell us about yourself</Text>
              </View>
            </View>
          </LinearGradient>

          <View className="mt-6 gap-4">
            <View className="flex-row gap-3">
              <Labeled label="Last Name" className="flex-1">
                <Input value={lastName} onChangeText={setLastName} placeholder="Enter your last name" autoComplete="family-name" />
              </Labeled>
              <Labeled label="First Name" className="flex-1">
                <Input value={firstName} onChangeText={setFirstName} placeholder="Enter your first name" autoComplete="given-name" />
              </Labeled>
            </View>

            <View className="flex-row gap-3">
              <Labeled label="Program" className="flex-1">
                <SelectField
                  text={department ?? 'Select your program'}
                  empty={!department}
                  onPress={() => setOpen('program')}
                />
              </Labeled>
              {/* Fixed width so "3rd Year" always fits; Program takes the rest. */}
              <Labeled label="Year Level" style={{ width: 118 }}>
                <SelectField
                  text={YEAR_LEVELS.find((year) => year.value === yearLevel)?.label ?? 'Select'}
                  empty={!yearLevel}
                  onPress={() => setOpen('year')}
                />
              </Labeled>
            </View>

            {(Object.keys(PICKERS) as PickKind[]).map((kind) => (
              <Labeled key={kind} label={PICKERS[kind].label}>
                <SelectField
                  text={picks[kind].length ? picks[kind].join(', ') : PICKERS[kind].placeholder}
                  empty={picks[kind].length === 0}
                  onPress={() => setOpen(kind)}
                />
              </Labeled>
            ))}
          </View>

          {error && <Text className="mt-4 text-center font-poppins text-xs text-red-600">{error}</Text>}

          <Pressable
            onPress={handleNext}
            disabled={saving}
            className="mt-6 h-12 w-40 items-center justify-center self-center rounded-full bg-brand-teal active:opacity-80">
            {saving ? (
              <ActivityIndicator color="#ffffff" />
            ) : (
              <Text className="font-poppins-medium text-sm text-white">Next</Text>
            )}
          </Pressable>
        </View>
      </ScrollView>

      {open === 'program' && (
        <OptionPickerModal
          title="Program"
          options={COLLEGES.map((college) => ({ value: college, label: college }))}
          selected={department}
          onSelect={(value) => {
            setDepartment(value);
            setOpen(null);
          }}
          onClose={() => setOpen(null)}
        />
      )}
      {open === 'year' && (
        <OptionPickerModal
          title="Year Level"
          options={YEAR_LEVELS}
          selected={yearLevel}
          onSelect={(value) => {
            setYearLevel(value);
            setOpen(null);
          }}
          onClose={() => setOpen(null)}
        />
      )}
      {(open === 'interest' || open === 'skill' || open === 'activity') && (
        <ChipPickerModal
          title={PICKERS[open].title}
          subtitle={PICKERS[open].subtitle}
          options={options[open]}
          selected={picks[open]}
          onCancel={() => setOpen(null)}
          onConfirm={(selected) => {
            setPicks({ ...picks, [open]: selected });
            setOpen(null);
          }}
        />
      )}
    </KeyboardAvoidingView>
  );
}

type LabeledProps = { label: string; className?: string; style?: ViewStyle; children: ReactNode };

function Labeled({ label, className, style, children }: LabeledProps) {
  return (
    <View className={className} style={style}>
      <Text className="mb-1.5 font-poppins-semibold text-xs text-brand-ink">{label}</Text>
      {children}
    </View>
  );
}

function Input(props: TextInputProps) {
  return (
    <TextInput
      className="h-12 rounded-xl bg-field px-4 font-poppins text-xs text-brand-ink"
      placeholderTextColor="#71717A"
      {...props}
    />
  );
}

// Looks like a dropdown; opens a picker pop-up.
function SelectField({ text, empty, onPress }: { text: string; empty: boolean; onPress: () => void }) {
  return (
    <Pressable
      onPress={onPress}
      className="h-12 flex-row items-center rounded-xl bg-field px-4 active:opacity-80"
      accessibilityRole="button">
      <Text
        numberOfLines={1}
        className={`flex-1 font-poppins text-xs ${empty ? 'text-zinc-500' : 'text-brand-ink'}`}>
        {text}
      </Text>
      <Ionicons name="chevron-down" size={16} color="#3F3F46" />
    </Pressable>
  );
}
