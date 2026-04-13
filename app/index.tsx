import { Redirect } from 'expo-router';

export default function Index() {
  // Currently redirecting directly to login. 
  // Once Auth logic is placed, this might conditionally route to (app) or (auth).
  return <Redirect href="/(auth)/login" />;
}
