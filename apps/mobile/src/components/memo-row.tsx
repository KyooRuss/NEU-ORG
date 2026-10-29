import { Ionicons } from '@expo/vector-icons';
import { useState } from 'react';
import { ActivityIndicator, Alert, StyleSheet, Text, View } from 'react-native';

import Pressable from '@/components/pressable';
import { formatMemoDate, openMemorandum, type Memorandum } from '@/lib/memorandums';

// One memorandum: a file icon, the title, and the date it was posted. Tapping it opens the file. Used on Home and the Memorandums screen.
export default function MemoRow({ memo }: { memo: Memorandum }) {
  const [opening, setOpening] = useState(false);
  const isImage = /\.(png|jpe?g)$/i.test(memo.fileName);

  async function open() {
    setOpening(true);
    try {
      await openMemorandum(memo);
    } catch {
      Alert.alert('Couldn’t open the memorandum', 'Check your connection and try again.');
    } finally {
      setOpening(false);
    }
  }

  return (
    <Pressable
      onPress={open}
      disabled={opening}
      style={({ pressed }) => [styles.card, pressed && styles.pressed]}
      accessibilityRole="button"
      accessibilityLabel={`${memo.title}, posted ${formatMemoDate(memo.createdAt)}. Opens the file.`}>
      <View style={styles.icon}>
        <Ionicons name={isImage ? 'image-outline' : 'document-text-outline'} size={22} color="#3549D6" />
      </View>
      <View style={styles.text}>
        <Text style={styles.title} numberOfLines={2}>
          {memo.title}
        </Text>
        <Text style={styles.meta} numberOfLines={1}>
          {formatMemoDate(memo.createdAt)}
        </Text>
      </View>
      {opening ? (
        <ActivityIndicator color="#3549D6" style={styles.end} />
      ) : (
        <Text style={[styles.view, styles.end]}>View</Text>
      )}
    </Pressable>
  );
}

const INK = '#1E2440';

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 18,
    borderWidth: 1,
    borderColor: '#E4E7F2',
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 14,
    paddingVertical: 14,
    shadowColor: INK,
    shadowOpacity: 0.06,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
  },
  pressed: { opacity: 0.7 },
  icon: {
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 12,
    backgroundColor: '#E8EDFD',
  },
  text: { flex: 1, marginLeft: 12 },
  title: { fontFamily: 'Poppins_600SemiBold', fontSize: 14, lineHeight: 20, color: INK },
  meta: { marginTop: 2, fontFamily: 'Poppins_400Regular', fontSize: 12, color: '#71717A' },
  // Bottom-right corner, level with the date.
  end: { marginLeft: 8, alignSelf: 'flex-end' },
  view: { fontFamily: 'Poppins_500Medium', fontSize: 12, color: '#4F46E5' },
});
