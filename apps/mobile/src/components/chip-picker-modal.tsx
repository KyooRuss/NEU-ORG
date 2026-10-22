import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useState } from 'react';
import { Modal, Pressable, ScrollView, Text, TextInput, useWindowDimensions, View } from 'react-native';

import { includesLabel, MAX_LABEL_LENGTH, MAX_PICKS } from '@/lib/assessment';

type Props = {
  title: string;
  subtitle: string;
  options: string[];
  // What's picked when the pop-up opens. Changes only count after Confirm.
  selected: string[];
  onCancel: () => void;
  onConfirm: (selected: string[]) => void;
};

// The Profile Assessment pop-up: pick up to 3 chips, or type your own when
// nothing in the list fits. Render it only while it's open.
export default function ChipPickerModal({ title, subtitle, options, selected, onCancel, onConfirm }: Props) {
  const { width } = useWindowDimensions();
  const [picked, setPicked] = useState(selected);
  const [custom, setCustom] = useState('');
  const [hint, setHint] = useState<string | null>(null);
  const full = picked.length >= MAX_PICKS;

  // The list's choices, plus anything the student typed in earlier.
  const chips = [...options, ...picked.filter((label) => !includesLabel(options, label))];

  function toggle(label: string) {
    setHint(null);
    if (includesLabel(picked, label)) {
      setPicked(picked.filter((item) => item.toLowerCase() !== label.toLowerCase()));
    } else if (!full) {
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
    if (full) {
      setHint(`You can pick up to ${MAX_PICKS}. Remove one first.`);
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
      <View className="flex-1 items-center justify-center bg-black/50 px-4">
        <View
          className="max-h-[85%] rounded-3xl bg-white p-5"
          style={{ width: Math.min(width - 32, 420) }}>
          <View className="flex-row items-start justify-between">
            <View className="flex-1 pr-3">
              <Text className="font-poppins-semibold text-base text-brand-ink">{title}</Text>
              <Text className="font-poppins text-xs text-zinc-500">{subtitle}</Text>
            </View>
            <Text className="font-poppins text-xs text-orange-500">{picked.length} selected</Text>
          </View>

          <ScrollView className="mt-4" contentContainerClassName="flex-row flex-wrap justify-center gap-2">
            {chips.map((label) => {
              const isPicked = includesLabel(picked, label);
              return (
                <Pressable
                  key={label}
                  onPress={() => toggle(label)}
                  disabled={!isPicked && full}
                  className={!isPicked && full ? 'opacity-40' : ''}
                  accessibilityRole="checkbox"
                  accessibilityState={{ checked: isPicked }}>
                  {isPicked ? (
                    <LinearGradient
                      colors={['#6C9BF8', '#3549D6']}
                      start={{ x: 0, y: 0 }}
                      end={{ x: 1, y: 0 }}
                      style={{ borderRadius: 999, paddingHorizontal: 14, paddingVertical: 6 }}>
                      <Text className="font-poppins text-xs text-white">{label}</Text>
                    </LinearGradient>
                  ) : (
                    <View className="rounded-full bg-field px-3.5 py-1.5">
                      <Text className="font-poppins text-xs text-brand-ink">{label}</Text>
                    </View>
                  )}
                </Pressable>
              );
            })}
          </ScrollView>

          {/* For when nothing in the list fits. */}
          <View className="mt-4 h-11 flex-row items-center rounded-full border border-zinc-200 bg-surface pl-4 pr-1">
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
              className="flex-1 font-poppins text-xs text-brand-ink"
            />
            <Pressable
              onPress={addCustom}
              disabled={!custom.trim()}
              className={`h-9 flex-row items-center rounded-full bg-brand-blue px-3 ${custom.trim() ? '' : 'opacity-40'}`}
              accessibilityLabel="Add your own">
              <Ionicons name="add" size={16} color="#FFFFFF" />
              <Text className="font-poppins-medium text-xs text-white">Add</Text>
            </Pressable>
          </View>
          {hint && <Text className="mt-1 pl-4 font-poppins text-xs text-red-600">{hint}</Text>}

          <View className="mt-5 flex-row justify-center gap-3">
            <Pressable
              onPress={onCancel}
              className="h-11 w-28 items-center justify-center rounded-full border border-zinc-400 bg-white active:opacity-80">
              <Text className="font-poppins-medium text-sm text-brand-ink">Cancel</Text>
            </Pressable>
            <Pressable
              onPress={() => onConfirm(picked)}
              className="h-11 w-28 items-center justify-center rounded-full bg-brand-teal active:opacity-80">
              <Text className="font-poppins-medium text-sm text-white">Confirm</Text>
            </Pressable>
          </View>
        </View>
      </View>
    </Modal>
  );
}
