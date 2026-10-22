import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { StatusBar } from 'expo-status-bar';
import { useEffect, useState } from 'react';
import { StyleSheet, Text, useWindowDimensions, View } from 'react-native';

import { BRAND_GRADIENT } from '@/constants/brand';

// Shown for at least this long, so it never just flashes by.
const MIN_SHOWN_MS = 1400;
// Shows the splash anyway if the logo hasn't loaded by then, so the app can't get stuck.
const LOGO_WAIT_LIMIT_MS = 3000;

function clamp(value: number, min: number, max: number) {
  return Math.min(Math.max(value, min), max);
}

type Props = {
  // True once the app has what it needs to show the first screen.
  ready: boolean;
  // Called once the logo and name are on screen (the phone's native splash can go then).
  onShown: () => void;
  onFinish: () => void;
};

// The NEU-ORG splash: the logo and name on the brand gradient, shown over the
// first screen until the app is ready. The logo and name appear together once
// the logo has loaded, never half-drawn.
export default function SplashScreen({ ready, onShown, onFinish }: Props) {
  const { width } = useWindowDimensions();
  // Sized by screen width, with limits so it looks right on small phones and tablets.
  const logoSize = clamp(width * 0.28, 96, 150);
  const fontSize = clamp(width * 0.075, 26, 38);
  const [logoLoaded, setLogoLoaded] = useState(false);
  const [minTimeDone, setMinTimeDone] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => setLogoLoaded(true), LOGO_WAIT_LIMIT_MS);
    return () => clearTimeout(timer);
  }, []);

  // The minimum time counts from when the splash is actually visible.
  useEffect(() => {
    if (!logoLoaded) return;
    onShown();
    const timer = setTimeout(() => setMinTimeDone(true), MIN_SHOWN_MS);
    return () => clearTimeout(timer);
  }, [logoLoaded, onShown]);

  useEffect(() => {
    if (ready && minTimeDone) onFinish();
  }, [ready, minTimeDone, onFinish]);

  return (
    <View style={StyleSheet.absoluteFill} accessible accessibilityLabel="NEU-ORG is loading">
      <StatusBar style="light" />
      <LinearGradient {...BRAND_GRADIENT} style={StyleSheet.absoluteFill} />

      {/* Hidden (not removed) until the logo loads, so the image can load in the meantime. */}
      <View style={[styles.center, { opacity: logoLoaded ? 1 : 0 }]}>
        <Image
          source={require('@/assets/images/neu-org-logo.png')}
          style={{ width: logoSize, height: logoSize }}
          contentFit="contain"
          onLoad={() => setLogoLoaded(true)}
          onError={() => setLogoLoaded(true)}
        />
        <Text style={[styles.name, { fontSize }]}>NEU-ORG</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  // Loaded in _layout.tsx.
  name: { fontFamily: 'BarlowCondensed_700Bold', color: '#FFFFFF', letterSpacing: 0.5, marginTop: 8 },
});
