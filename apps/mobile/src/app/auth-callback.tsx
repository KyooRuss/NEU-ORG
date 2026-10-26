import * as WebBrowser from 'expo-web-browser';
import { router } from 'expo-router';
import { useEffect } from 'react';
import { Platform } from 'react-native';

// Google sends the student back to /auth-callback after they pick an account.
// The login screen reads that link itself (see lib/auth.ts).
// - Web: Google ran in a popup; this hands the link back to the login tab and
//   closes the popup.
// - Android: the app may also open this route for the link, so it just steps
//   back to the login screen, which keeps its place.
export default function AuthCallback() {
  useEffect(() => {
    if (Platform.OS === 'web' && WebBrowser.maybeCompleteAuthSession().type === 'success') return;
    if (router.canGoBack()) router.back();
    else router.replace('/login');
  }, []);

  return null;
}
