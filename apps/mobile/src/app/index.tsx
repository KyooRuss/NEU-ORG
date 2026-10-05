import { Redirect } from 'expo-router';
import { useEffect, useState } from 'react';
import { ActivityIndicator, View } from 'react-native';

import { supabase } from '@/lib/supabase';

// Opens the home screen when a login session is saved on the phone, otherwise the login screen.
export default function Index() {
  const [hasSession, setHasSession] = useState<boolean | null>(null);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => setHasSession(data.session !== null));
  }, []);

  if (hasSession === null) {
    return (
      <View className="flex-1 items-center justify-center bg-surface">
        <ActivityIndicator color="#3549D6" />
      </View>
    );
  }

  return <Redirect href={hasSession ? '/home' : '/login'} />;
}
