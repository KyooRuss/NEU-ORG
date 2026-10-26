import { Image } from 'expo-image';
import { StyleSheet, Text, View, type StyleProp, type ViewStyle } from 'react-native';

import { HAMI_IMAGES, type HamiMood } from '@/constants/hami';

// The message shown when a list is empty or couldn't load, with Hami above it
// in the mood that fits (see constants/hami.ts).
export default function HamiNotice({
  mood,
  text,
  style,
}: {
  mood: HamiMood;
  text: string;
  style?: StyleProp<ViewStyle>;
}) {
  return (
    <View style={[styles.notice, style]}>
      <Image
        source={HAMI_IMAGES[mood]}
        style={styles.hami}
        contentFit="contain"
        accessibilityLabel={`Hami looks ${mood}`}
      />
      <Text style={styles.text}>{text}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  notice: {
    alignItems: 'center',
    borderRadius: 18,
    borderWidth: 1,
    borderStyle: 'dashed',
    borderColor: '#D4D4D8',
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 16,
    paddingVertical: 16,
  },
  hami: { width: 110, height: 110, marginBottom: 8 },
  text: {
    textAlign: 'center',
    fontFamily: 'Poppins_400Regular',
    fontSize: 12,
    lineHeight: 18,
    color: '#71717A',
  },
});
