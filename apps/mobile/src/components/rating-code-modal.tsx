import { Ionicons } from '@expo/vector-icons';
import { useState } from 'react';
import { ActivityIndicator, KeyboardAvoidingView, Modal, Platform, StyleSheet, Text, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import Pressable from '@/components/pressable';
import { checkRatingCode } from '@/lib/events';

type Props = {
  eventId: string;
  eventTitle: string;
  // Called with the code once it's right; the rating sheet opens next.
  onAccepted: (code: string) => void;
  onClose: () => void;
};

// Asks for the code the officers announced at the event before the student can
// rate it, as a sheet from the bottom of the screen. Render it only while it's open.
// Styled with StyleSheet: NativeWind classes don't reliably reach inside a Modal on web.
export default function RatingCodeModal({ eventId, eventTitle, onAccepted, onClose }: Props) {
  const insets = useSafeAreaInsets();
  const [code, setCode] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [checking, setChecking] = useState(false);

  const clean = code.replace(/\s/g, '').toUpperCase();
  // Every code is exactly 6 letters or numbers.
  const complete = /^[A-Z0-9]{6}$/.test(clean);

  async function handleContinue() {
    if (!complete) return setError('The code is 6 letters or numbers.');
    setChecking(true);
    setError(null);
    try {
      if (await checkRatingCode(eventId, clean)) {
        onAccepted(clean);
        return;
      }
      setError('That code is incorrect. Check it with the event’s officers.');
    } catch {
      setError("The code couldn't be checked. Check your connection and try again.");
    }
    setChecking(false);
  }

  return (
    <Modal transparent animationType="slide" onRequestClose={onClose} statusBarTranslucent>
      <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        {/* Tap above the sheet to close it. */}
        <Pressable style={styles.backdrop} onPress={checking ? undefined : onClose} accessibilityLabel="Close" />

        <View style={[styles.sheet, { paddingBottom: insets.bottom + 20 }]}>
          <View style={styles.handle} />
          <View style={styles.icon}>
            <Ionicons name="key-outline" size={22} color="#3549D6" />
          </View>
          <Text style={styles.title}>Enter Rating Code</Text>
          <Text style={styles.subtitle} numberOfLines={2}>
            {eventTitle}
          </Text>
          <Text style={styles.body}>
            Enter the code shared by officers during the event to rate it.
          </Text>

          <TextInput
            value={code}
            onChangeText={(text) => {
              setCode(text.toUpperCase());
              setError(null);
            }}
            onSubmitEditing={handleContinue}
            placeholder="6-character code"
            placeholderTextColor="#A1A1AA"
            autoCapitalize="characters"
            autoCorrect={false}
            autoFocus
            maxLength={6}
            editable={!checking}
            returnKeyType="done"
            style={[styles.input, !code && styles.inputEmpty, error && styles.inputError]}
            accessibilityLabel="Rating code"
          />
          {error && <Text style={styles.error}>{error}</Text>}

          <View style={styles.actions}>
            <Pressable
              onPress={onClose}
              disabled={checking}
              style={({ pressed }) => [styles.button, styles.cancel, pressed && styles.pressed]}>
              <Text style={styles.cancelText}>Cancel</Text>
            </Pressable>
            <Pressable
              onPress={handleContinue}
              disabled={checking}
              style={({ pressed }) => [styles.button, styles.submit, !complete && styles.disabled, pressed && styles.pressed]}>
              {checking ? <ActivityIndicator color="#FFFFFF" /> : <Text style={styles.submitText}>Continue</Text>}
            </Pressable>
          </View>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const INK = '#1E2440';
const NAVY = '#1E3A8A';

const styles = StyleSheet.create({
  flex: { flex: 1 },
  backdrop: { flex: 1, backgroundColor: 'rgba(0, 0, 0, 0.45)' },
  sheet: {
    width: '100%',
    maxWidth: 520,
    alignSelf: 'center',
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 20,
    paddingTop: 10,
  },
  handle: { alignSelf: 'center', width: 40, height: 4, borderRadius: 2, backgroundColor: '#D4D4D8' },
  icon: {
    marginTop: 18,
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 12,
    backgroundColor: '#E8EDFD',
  },
  title: { marginTop: 12, fontFamily: 'Poppins_600SemiBold', fontSize: 18, color: NAVY },
  subtitle: { fontFamily: 'Poppins_400Regular', fontSize: 12, color: '#71717A' },
  body: { marginTop: 10, fontFamily: 'Poppins_400Regular', fontSize: 13, lineHeight: 19, color: '#3F3F46' },
  pressed: { opacity: 0.7 },
  disabled: { opacity: 0.5 },

  input: {
    marginTop: 16,
    height: 54,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#D4D4D8',
    backgroundColor: '#F4F7FB',
    paddingHorizontal: 16,
    textAlign: 'center',
    fontFamily: 'Poppins_600SemiBold',
    fontSize: 20,
    letterSpacing: 4,
    color: INK,
  },
  // A placeholder can't be styled on its own, so the empty box uses smaller,
  // normally spaced text; the code itself stays big once typed.
  inputEmpty: { fontFamily: 'Poppins_400Regular', fontSize: 14, letterSpacing: 0 },
  inputError: { borderColor: '#DC2626' },
  error: { marginTop: 8, fontFamily: 'Poppins_400Regular', fontSize: 12, lineHeight: 17, color: '#DC2626' },

  actions: { marginTop: 18, flexDirection: 'row', gap: 10 },
  button: { height: 50, alignItems: 'center', justifyContent: 'center', borderRadius: 999 },
  cancel: { flex: 2, borderWidth: 1, borderColor: '#D4D4D8', backgroundColor: '#FFFFFF' },
  cancelText: { fontFamily: 'Poppins_500Medium', fontSize: 14, color: INK },
  submit: { flex: 4, backgroundColor: NAVY },
  submitText: { fontFamily: 'Poppins_600SemiBold', fontSize: 14, color: '#FFFFFF' },
});
