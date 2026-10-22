import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { StatusBar } from 'expo-status-bar';
import { useEffect, useState } from 'react';
import { StyleSheet, useWindowDimensions, View } from 'react-native';
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withTiming,
} from 'react-native-reanimated';

// Same color and logo width as the native splash (expo-splash-screen in app.json),
// so switching from the native splash to this one doesn't jump.
const NATIVE_SPLASH_COLOR = '#4B70E8';
const NATIVE_LOGO_WIDTH = 110;

// The splash design's gradient: darker blue lower-left, lighter blue upper-right.
const GRADIENT = ['#3659DD', '#4B70E8', '#6A94FA'] as const;

// Shown for at least this long, so it never just flashes by.
const INTRO_MS = 1400;
const FADE_OUT_MS = 400;
const NAME_GAP = 8;

const easeOut = Easing.out(Easing.cubic);

function clamp(value: number, min: number, max: number) {
  return Math.min(Math.max(value, min), max);
}

type Props = {
  // True once the app has what it needs to show the first screen.
  ready: boolean;
  onFinish: () => void;
};

// The NEU-ORG splash: the logo starts alone in the middle like the native splash,
// moves up as the name appears, then everything fades into the first screen.
export default function AnimatedSplash({ ready, onFinish }: Props) {
  const { width } = useWindowDimensions();
  // Sized by screen width, with limits so it looks right on small phones and tablets.
  const logoSize = clamp(width * 0.28, 96, 150);
  const fontSize = clamp(width * 0.075, 26, 38);
  const startScale = NATIVE_LOGO_WIDTH / logoSize;
  // How far below its final spot the logo starts, so it begins exactly in the middle.
  const startOffset = (fontSize * 1.2 + NAME_GAP) / 2;

  const solid = useSharedValue(1);
  const logoIn = useSharedValue(0);
  const nameIn = useSharedValue(0);
  const shown = useSharedValue(1);
  const [introDone, setIntroDone] = useState(false);

  useEffect(() => {
    solid.set(withTiming(0, { duration: 350 }));
    logoIn.set(withTiming(1, { duration: 650, easing: easeOut }));
    nameIn.set(withDelay(300, withTiming(1, { duration: 500, easing: easeOut })));
    const timer = setTimeout(() => setIntroDone(true), INTRO_MS);
    return () => clearTimeout(timer);
  }, [solid, logoIn, nameIn]);

  useEffect(() => {
    if (!ready || !introDone) return;
    shown.set(withTiming(0, { duration: FADE_OUT_MS }));
    const timer = setTimeout(onFinish, FADE_OUT_MS);
    return () => clearTimeout(timer);
  }, [ready, introDone, onFinish, shown]);

  const containerStyle = useAnimatedStyle(() => ({ opacity: shown.get() }));
  const solidStyle = useAnimatedStyle(() => ({ opacity: solid.get() }));
  const logoStyle = useAnimatedStyle(() => {
    const progress = logoIn.get();
    return {
      transform: [
        { translateY: startOffset * (1 - progress) },
        { scale: startScale + (1 - startScale) * progress },
      ],
    };
  });
  const nameStyle = useAnimatedStyle(() => ({
    opacity: nameIn.get(),
    transform: [{ translateY: 12 * (1 - nameIn.get()) }],
  }));

  return (
    <Animated.View
      style={[StyleSheet.absoluteFill, containerStyle]}
      accessible
      accessibilityLabel="NEU-ORG is loading">
      <StatusBar style="light" />
      <LinearGradient
        colors={GRADIENT}
        start={{ x: 0, y: 0.7 }}
        end={{ x: 1, y: 0.2 }}
        style={StyleSheet.absoluteFill}
      />
      {/* Starts as the native splash's solid color, then fades to show the gradient. */}
      <Animated.View
        style={[StyleSheet.absoluteFill, { backgroundColor: NATIVE_SPLASH_COLOR }, solidStyle]}
      />

      <View style={styles.center}>
        <Animated.View style={logoStyle}>
          <Image
            source={require('@/assets/images/neu-org-logo.png')}
            style={{ width: logoSize, height: logoSize }}
            contentFit="contain"
          />
        </Animated.View>
        <Animated.Text style={[styles.name, { fontSize, marginTop: NAME_GAP }, nameStyle]}>
          NEU-ORG
        </Animated.Text>
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  // Loaded in _layout.tsx.
  name: { fontFamily: 'BarlowCondensed_700Bold', color: '#FFFFFF', letterSpacing: 0.5 },
});
