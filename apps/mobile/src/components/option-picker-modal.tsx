import { Ionicons } from '@expo/vector-icons';
import { Modal, Pressable, ScrollView, Text, useWindowDimensions } from 'react-native';

type Option<T> = { value: T; label: string };

type Props<T> = {
  title: string;
  options: Option<T>[];
  selected: T | null;
  onSelect: (value: T) => void;
  onClose: () => void;
};

// A pop-up list for picking one choice, like a dropdown (Program, Year Level).
// Render it only while it's open.
export default function OptionPickerModal<T>({ title, options, selected, onSelect, onClose }: Props<T>) {
  const { width } = useWindowDimensions();

  return (
    <Modal transparent animationType="fade" onRequestClose={onClose}>
      <Pressable className="flex-1 items-center justify-center bg-black/50 px-4" onPress={onClose}>
        {/* Taps inside the box don't close it. */}
        <Pressable
          className="max-h-[75%] rounded-3xl bg-white py-4"
          style={{ width: Math.min(width - 32, 420) }}
          onPress={() => {}}>
          <Text className="mb-2 px-5 font-poppins-semibold text-base text-brand-ink">{title}</Text>
          <ScrollView>
            {options.map((option) => {
              const isSelected = option.value === selected;
              return (
                <Pressable
                  key={String(option.value)}
                  onPress={() => onSelect(option.value)}
                  className={`flex-row items-center justify-between px-5 py-3 active:bg-surface ${
                    isSelected ? 'bg-surface' : ''
                  }`}
                  accessibilityRole="radio"
                  accessibilityState={{ selected: isSelected }}>
                  <Text
                    className={`flex-1 font-poppins text-sm ${
                      isSelected ? 'text-brand-blue' : 'text-brand-ink'
                    }`}>
                    {option.label}
                  </Text>
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
