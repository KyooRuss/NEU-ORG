import { Redirect } from 'expo-router';

// TODO(Step 5): send logged-in users to the home screen instead.
export default function Index() {
  return <Redirect href="/login" />;
}
