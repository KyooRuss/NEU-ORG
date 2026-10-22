import '../tailwind.css';

import {
  BarlowCondensed_500Medium,
  BarlowCondensed_700Bold,
} from '@expo-google-fonts/barlow-condensed';
import {
  Poppins_300Light,
  Poppins_400Regular,
  Poppins_500Medium,
  Poppins_600SemiBold,
  useFonts,
} from '@expo-google-fonts/poppins';
import { Stack } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { useEffect, useState } from 'react';

import AnimatedSplash from '@/components/animated-splash';
import { getInitialSession } from '@/lib/initial-session';

SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  const [fontsLoaded, fontError] = useFonts({
    Poppins_300Light,
    Poppins_400Regular,
    Poppins_500Medium,
    Poppins_600SemiBold,
    BarlowCondensed_500Medium,
    BarlowCondensed_700Bold,
  });
  const fontsReady = fontsLoaded || fontError !== null;
  const [sessionChecked, setSessionChecked] = useState(false);
  const [splashDone, setSplashDone] = useState(false);

  useEffect(() => {
    getInitialSession().then(() => setSessionChecked(true));
  }, []);

  // Swap the native splash for the animated one once the fonts are ready, so text doesn't flash.
  useEffect(() => {
    if (fontsReady) SplashScreen.hide();
  }, [fontsReady]);

  if (!fontsReady) {
    return null;
  }

  return (
    <>
      <Stack screenOptions={{ headerShown: false }} />
      {!splashDone && (
        <AnimatedSplash ready={sessionChecked} onFinish={() => setSplashDone(true)} />
      )}
    </>
  );
}
