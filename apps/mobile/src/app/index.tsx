import { Redirect } from 'expo-router';
import { useEffect, useState } from 'react';

import { type FirstScreen, getFirstScreen } from '@/lib/initial-session';

// Opens home when a login session is saved on the phone (or Terms if the student
// hasn't accepted them yet), otherwise the login screen. The splash screen covers this.
export default function Index() {
  const [screen, setScreen] = useState<FirstScreen | null>(null);

  useEffect(() => {
    getFirstScreen().then(setScreen);
  }, []);

  if (screen === null) return null;

  return <Redirect href={screen} />;
}
