import { router } from 'expo-router';
import { useEffect } from 'react';

// Google sends the student back to mobile://auth-callback after they pick an
// account. The login screen reads that link itself (see lib/auth.ts); on
// Android the app may also open this route for it, so it just steps back to
// the login screen, which keeps its place.
export default function AuthCallback() {
  useEffect(() => {
    if (router.canGoBack()) router.back();
    else router.replace('/login');
  }, []);

  return null;
}
