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
import * as NativeSplash from 'expo-splash-screen';
import { useEffect, useState } from 'react';

import SplashScreen from '@/components/splash-screen';
import { getFirstScreen } from '@/lib/initial-session';

NativeSplash.preventAutoHideAsync();

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
    getFirstScreen().then(() => setSessionChecked(true));
  }, []);

  // The NEU-ORG splash only renders once the fonts are ready, so its name never shows in
  // the wrong font. It hides the phone's native splash once its logo is on screen.
  if (!fontsReady) {
    return null;
  }

  return (
    <>
      <Stack screenOptions={{ headerShown: false }} />
      {!splashDone && (
        <SplashScreen
          ready={sessionChecked}
          onShown={NativeSplash.hide}
          onFinish={() => setSplashDone(true)}
        />
      )}
    </>
  );
}
