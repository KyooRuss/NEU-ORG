import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useState } from 'react';
import {
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  useWindowDimensions,
  View,
} from 'react-native';

import { includesLabel, MAX_LABEL_LENGTH } from '@/lib/assessment';

type Props = {
  title: string;
  subtitle: string;
  options: string[];
  // What's picked when the pop-up opens. Changes only count after Confirm.
  selected: string[];
  onCancel: () => void;
  onConfirm: (selected: string[]) => void;
};

// The Profile Assessment pop-up: pick any number of chips, or type your own when
// nothing in the list fits. Render it only while it's open.
// Styled with StyleSheet: NativeWind classes don't reliably reach inside a Modal on web.
export default function ChipPickerModal({ title, subtitle, options, selected, onCancel, onConfirm }: Props) {
  const { width } = useWindowDimensions();
  const [picked, setPicked] = useState(selected);
  const [custom, setCustom] = useState('');
  const [hint, setHint] = useState<string | null>(null);
  const canAdd = custom.trim().length > 0;

  // The list's choices, plus anything the student typed in earlier.
  const chips = [...options, ...picked.filter((label) => !includesLabel(options, label))];

  function toggle(label: string) {
    setHint(null);
    if (includesLabel(picked, label)) {
      setPicked(picked.filter((item) => item.toLowerCase() !== label.toLowerCase()));
    } else {
      setPicked([...picked, label]);
    }
  }

  function addCustom() {
    const typed = custom.trim().replace(/\s+/g, ' ');
    if (!typed) return;
    if (typed.length > MAX_LABEL_LENGTH) {
      setHint(`Keep it under ${MAX_LABEL_LENGTH} characters.`);
      return;
    }
    if (includesLabel(picked, typed)) {
      setHint('You already picked that.');
      return;
    }
    // If it's already in the list, pick that one so the spelling matches.
    const existing = options.find((option) => option.toLowerCase() === typed.toLowerCase());
    setPicked([...picked, existing ?? typed]);
    setCustom('');
    setHint(null);
  }

  return (
    <Modal transparent animationType="fade" onRequestClose={onCancel}>
      <View style={styles.backdrop}>
        <View style={[styles.card, { width: Math.min(width - 32, 420) }]}>
          <View style={styles.header}>
            <View style={styles.headerText}>
              <Text style={styles.title}>{title}</Text>
              <Text style={styles.subtitle}>{subtitle}</Text>
            </View>
            <Text style={styles.count}>{picked.length} selected</Text>
          </View>

          <ScrollView style={styles.chipScroll} contentContainerStyle={styles.chips}>
            {chips.map((label) => {
              const isPicked = includesLabel(picked, label);
              return (
                <Pressable
                  key={label}
                  onPress={() => toggle(label)}
                  accessibilityRole="checkbox"
                  accessibilityState={{ checked: isPicked }}>
                  {isPicked ? (
                    <LinearGradient
                      colors={['#6C9BF8', '#3549D6']}
                      start={{ x: 0, y: 0 }}
                      end={{ x: 1, y: 0 }}
                      style={styles.chip}>
                      <Text style={[styles.chipText, styles.chipTextPicked]}>{label}</Text>
                    </LinearGradient>
                  ) : (
                    <View style={[styles.chip, styles.chipIdle]}>
                      <Text style={styles.chipText}>{label}</Text>
                    </View>
                  )}
                </Pressable>
              );
            })}
          </ScrollView>

          {/* For when nothing in the list fits. */}
          <View style={styles.customRow}>
            <TextInput
              value={custom}
              onChangeText={(text) => {
                setCustom(text);
                setHint(null);
              }}
              onSubmitEditing={addCustom}
              placeholder="Not in the list? Type your own"
              placeholderTextColor="#71717A"
              maxLength={MAX_LABEL_LENGTH + 10}
              returnKeyType="done"
              style={styles.customInput}
            />
            <Pressable
              onPress={addCustom}
              disabled={!canAdd}
              style={[styles.addButton, !canAdd && styles.locked]}
              accessibilityLabel="Add your own">
              <Ionicons name="add" size={16} color="#FFFFFF" />
              <Text style={styles.addText}>Add</Text>
            </Pressable>
          </View>
          {hint && <Text style={styles.hint}>{hint}</Text>}

          <View style={styles.actions}>
            <Pressable onPress={onCancel} style={[styles.button, styles.cancel]}>
              <Text style={styles.cancelText}>Cancel</Text>
            </Pressable>
            <Pressable onPress={() => onConfirm(picked)} style={[styles.button, styles.confirm]}>
              <Text style={styles.confirmText}>Confirm</Text>
            </Pressable>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const INK = '#1E2440';

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    paddingHorizontal: 16,
  },
  card: {
    maxHeight: '85%',
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    padding: 20,
    shadowColor: '#000000',
    shadowOpacity: 0.15,
    shadowRadius: 20,
    shadowOffset: { width: 0, height: 8 },
    elevation: 8,
  },
  header: { flexDirection: 'row', alignItems: 'flex-start' },
  headerText: { flex: 1, paddingRight: 12 },
  title: { fontFamily: 'Poppins_600SemiBold', fontSize: 16, color: INK },
  subtitle: { fontFamily: 'Poppins_400Regular', fontSize: 12, color: '#71717A' },
  count: { fontFamily: 'Poppins_400Regular', fontSize: 12, color: '#F97316' },
  chipScroll: { marginTop: 18, flexGrow: 0 },
  chips: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', gap: 8 },
  chip: { borderRadius: 999, paddingHorizontal: 14, paddingVertical: 7 },
  chipIdle: { backgroundColor: '#E8E9EC' },
  chipText: { fontFamily: 'Poppins_400Regular', fontSize: 12, color: INK },
  chipTextPicked: { color: '#FFFFFF' },
  locked: { opacity: 0.4 },
  customRow: {
    marginTop: 18,
    height: 44,
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 999,
    borderWidth: 1,
    borderColor: '#E4E4E7',
    backgroundColor: '#F5F7FB',
    paddingLeft: 16,
    paddingRight: 4,
  },
  customInput: { flex: 1, fontFamily: 'Poppins_400Regular', fontSize: 12, color: INK },
  addButton: {
    height: 36,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
    borderRadius: 999,
    backgroundColor: '#3549D6',
    paddingHorizontal: 12,
  },
  addText: { fontFamily: 'Poppins_500Medium', fontSize: 12, color: '#FFFFFF' },
  hint: { marginTop: 4, paddingLeft: 16, fontFamily: 'Poppins_400Regular', fontSize: 12, color: '#DC2626' },
  actions: { marginTop: 22, flexDirection: 'row', justifyContent: 'center', gap: 12 },
  button: { height: 44, width: 116, alignItems: 'center', justifyContent: 'center', borderRadius: 999 },
  cancel: { borderWidth: 1, borderColor: '#A1A1AA', backgroundColor: '#FFFFFF' },
  cancelText: { fontFamily: 'Poppins_500Medium', fontSize: 14, color: INK },
  confirm: { backgroundColor: '#15506E' },
  confirmText: { fontFamily: 'Poppins_500Medium', fontSize: 14, color: '#FFFFFF' },
});
