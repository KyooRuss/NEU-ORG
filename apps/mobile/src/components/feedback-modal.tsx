import { Ionicons } from '@expo/vector-icons';
import { useState } from 'react';
import { ActivityIndicator, Modal, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import Pressable from '@/components/pressable';
import { FEEDBACK_CATEGORIES, submitFeedback, type FeedbackCategory, type FeedbackRatings } from '@/lib/events';

type Props = {
  eventId: string;
  eventTitle: string;
  onSent: () => void;
  onClose: () => void;
};

// Rate an event that has ended, 1 to 5 stars in six categories, as a sheet
// from the bottom of the screen. Render it only while it's open.
// Styled with StyleSheet: NativeWind classes don't reliably reach inside a Modal on web.
export default function FeedbackModal({ eventId, eventTitle, onSent, onClose }: Props) {
  const insets = useSafeAreaInsets();
  const [ratings, setRatings] = useState<Partial<FeedbackRatings>>({});
  const [error, setError] = useState<string | null>(null);
  const [sending, setSending] = useState(false);

  const complete = FEEDBACK_CATEGORIES.every(({ key }) => ratings[key]);

  function rate(key: FeedbackCategory, value: number) {
    setRatings((current) => ({ ...current, [key]: value }));
    setError(null);
  }

  async function handleSubmit() {
    if (!complete) return setError('Rate all six to send your feedback.');
    setSending(true);
    try {
      await submitFeedback(eventId, ratings as FeedbackRatings);
      onSent();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong. Try again.');
      setSending(false);
    }
  }

  return (
    <Modal transparent animationType="slide" onRequestClose={onClose} statusBarTranslucent>
      <View style={styles.flex}>
        {/* Tap above the sheet to close it. */}
        <Pressable style={styles.backdrop} onPress={sending ? undefined : onClose} accessibilityLabel="Close" />

        <View style={[styles.sheet, { paddingBottom: insets.bottom + 20 }]}>
          <View style={styles.handle} />
          <Text style={styles.title}>Rate this Event</Text>
          <Text style={styles.subtitle} numberOfLines={2}>
            {eventTitle}
          </Text>

          <ScrollView style={styles.rows} contentContainerStyle={styles.rowsContent}>
            {FEEDBACK_CATEGORIES.map(({ key, label }) => (
              <View key={key} style={styles.row}>
                <Text style={styles.label}>{label}</Text>
                <View style={styles.stars} accessibilityRole="radiogroup" accessibilityLabel={label}>
                  {[1, 2, 3, 4, 5].map((value) => {
                    const filled = (ratings[key] ?? 0) >= value;
                    return (
                      <Pressable
                        key={value}
                        onPress={() => rate(key, value)}
                        disabled={sending}
                        hitSlop={4}
                        accessibilityRole="radio"
                        accessibilityState={{ selected: ratings[key] === value }}
                        accessibilityLabel={`${value} out of 5`}>
                        <Ionicons name={filled ? 'star' : 'star-outline'} size={26} color={filled ? '#F59E0B' : '#D4D4D8'} />
                      </Pressable>
                    );
                  })}
                </View>
              </View>
            ))}
          </ScrollView>

          <View style={styles.note}>
            <Ionicons name="lock-closed-outline" size={14} color="#3549D6" />
            <Text style={styles.noteText}>Your ratings are anonymous. Officers only see the averages.</Text>
          </View>
          {error && <Text style={styles.error}>{error}</Text>}

          <View style={styles.actions}>
            <Pressable
              onPress={onClose}
              disabled={sending}
              style={({ pressed }) => [styles.button, styles.cancel, pressed && styles.pressed]}>
              <Text style={styles.cancelText}>Cancel</Text>
            </Pressable>
            <Pressable
              onPress={handleSubmit}
              disabled={sending}
              style={({ pressed }) => [
                styles.button,
                styles.submit,
                !complete && styles.disabled,
                pressed && styles.pressed,
              ]}>
              {sending ? <ActivityIndicator color="#FFFFFF" /> : <Text style={styles.submitText}>Submit Feedback</Text>}
            </Pressable>
          </View>
        </View>
      </View>
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
    maxHeight: '88%',
    alignSelf: 'center',
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 20,
    paddingTop: 10,
  },
  handle: { alignSelf: 'center', width: 40, height: 4, borderRadius: 2, backgroundColor: '#D4D4D8' },
  title: { marginTop: 16, fontFamily: 'Poppins_600SemiBold', fontSize: 18, color: NAVY },
  subtitle: { fontFamily: 'Poppins_400Regular', fontSize: 12, color: '#71717A' },
  pressed: { opacity: 0.7 },
  disabled: { opacity: 0.5 },

  rows: { marginTop: 12, flexGrow: 0 },
  rowsContent: { gap: 4 },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F2F6',
    paddingVertical: 10,
  },
  label: { flex: 1, fontFamily: 'Poppins_500Medium', fontSize: 13, color: INK },
  stars: { flexDirection: 'row', gap: 4 },

  note: {
    marginTop: 14,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    borderRadius: 12,
    backgroundColor: '#F1F4FB',
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  noteText: { flex: 1, fontFamily: 'Poppins_400Regular', fontSize: 12, lineHeight: 17, color: '#3F3F46' },
  error: { marginTop: 8, fontFamily: 'Poppins_400Regular', fontSize: 12, lineHeight: 17, color: '#DC2626' },

  actions: { marginTop: 18, flexDirection: 'row', gap: 10 },
  button: { height: 50, alignItems: 'center', justifyContent: 'center', borderRadius: 999 },
  cancel: { flex: 2, borderWidth: 1, borderColor: '#D4D4D8', backgroundColor: '#FFFFFF' },
  cancelText: { fontFamily: 'Poppins_500Medium', fontSize: 14, color: INK },
  submit: { flex: 4, backgroundColor: NAVY },
  submitText: { fontFamily: 'Poppins_600SemiBold', fontSize: 14, color: '#FFFFFF' },
});
