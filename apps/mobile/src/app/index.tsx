import { Redirect } from 'expo-router';
import { useEffect, useState } from 'react';

import { getInitialSession } from '@/lib/initial-session';

// Opens the home screen when a login session is saved on the phone, otherwise the login screen.
// The splash screen covers this while the session is read.
export default function Index() {
  const [hasSession, setHasSession] = useState<boolean | null>(null);

  useEffect(() => {
    getInitialSession().then((session) => setHasSession(session !== null));
  }, []);

  if (hasSession === null) return null;

  return <Redirect href={hasSession ? '/home' : '/login'} />;
}
