import Pressable from '@/components/pressable';
import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { useState } from 'react';
import {
  FlatList,
  Modal,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
  type NativeScrollEvent,
  type NativeSyntheticEvent,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

type Props = {
  urls: string[];
  // The photo that was tapped.
  startIndex: number;
  onClose: () => void;
};

// Full-screen photos on black; swipe left and right to see the others.
// Render it only while it's open.
export default function PhotoViewerModal({ urls, startIndex, onClose }: Props) {
  const { width, height } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const [index, setIndex] = useState(startIndex);

  function handleScroll(event: NativeSyntheticEvent<NativeScrollEvent>) {
    const next = Math.round(event.nativeEvent.contentOffset.x / width);
    if (next !== index && next >= 0 && next < urls.length) setIndex(next);
  }

  return (
    <Modal animationType="fade" onRequestClose={onClose} statusBarTranslucent>
      <View style={styles.screen}>
        <FlatList
          data={urls}
          keyExtractor={(url) => url}
          horizontal
          pagingEnabled
          showsHorizontalScrollIndicator={false}
          initialScrollIndex={startIndex}
          getItemLayout={(_, i) => ({ length: width, offset: width * i, index: i })}
          onScroll={handleScroll}
          scrollEventThrottle={16}
          renderItem={({ item, index: i }) => (
            <Image
              source={{ uri: item }}
              style={{ width, height }}
              contentFit="contain"
              accessibilityLabel={`Photo ${i + 1} of ${urls.length}`}
            />
          )}
        />

        <View style={[styles.topBar, { top: insets.top + 8 }]}>
          <Text style={styles.counter}>
            {index + 1} / {urls.length}
          </Text>
          <Pressable
            onPress={onClose}
            hitSlop={10}
            style={({ pressed }) => [styles.close, pressed && styles.pressed]}
            accessibilityRole="button"
            accessibilityLabel="Close photo">
            <Ionicons name="close" size={24} color="#FFFFFF" />
          </Pressable>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: '#000000' },
  topBar: {
    position: 'absolute',
    left: 16,
    right: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  counter: { fontFamily: 'Poppins_500Medium', fontSize: 14, color: '#FFFFFF' },
  close: {
    height: 40,
    width: 40,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
  },
  pressed: { opacity: 0.7 },
});
