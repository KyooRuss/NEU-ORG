import { Ionicons } from '@expo/vector-icons';
import { Modal, Pressable, ScrollView, StyleSheet, Text, useWindowDimensions } from 'react-native';

type Option<T> = { value: T; label: string };

type Props<T> = {
  title: string;
  options: Option<T>[];
  selected: T | null;
  onSelect: (value: T) => void;
  onClose: () => void;
};

// A pop-up list for picking one choice, like a dropdown (Program, Year Level).
// Render it only while it's open. Styled with StyleSheet: NativeWind classes
// don't reliably reach inside a Modal on web.
export default function OptionPickerModal<T>({ title, options, selected, onSelect, onClose }: Props<T>) {
  const { width } = useWindowDimensions();

  return (
    <Modal transparent animationType="fade" onRequestClose={onClose}>
      <Pressable style={styles.backdrop} onPress={onClose}>
        {/* Taps inside the box don't close it. */}
        <Pressable style={[styles.card, { width: Math.min(width - 32, 420) }]} onPress={() => {}}>
          <Text style={styles.title}>{title}</Text>
          <ScrollView>
            {options.map((option) => {
              const isSelected = option.value === selected;
              return (
                <Pressable
                  key={String(option.value)}
                  onPress={() => onSelect(option.value)}
                  style={({ pressed }) => [styles.row, (isSelected || pressed) && styles.rowSelected]}
                  accessibilityRole="radio"
                  accessibilityState={{ selected: isSelected }}>
                  <Text style={[styles.rowText, isSelected && styles.rowTextSelected]}>{option.label}</Text>
                  {isSelected && <Ionicons name="checkmark" size={18} color="#3549D6" />}
                </Pressable>
              );
            })}
          </ScrollView>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    paddingHorizontal: 16,
  },
  card: {
    maxHeight: '75%',
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    paddingVertical: 16,
    elevation: 8,
  },
  title: {
    marginBottom: 8,
    paddingHorizontal: 20,
    fontFamily: 'Poppins_600SemiBold',
    fontSize: 16,
    color: '#1E2440',
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 12,
  },
  rowSelected: { backgroundColor: '#F5F7FB' },
  rowText: { flex: 1, fontFamily: 'Poppins_400Regular', fontSize: 14, color: '#1E2440' },
  rowTextSelected: { color: '#3549D6' },
});
