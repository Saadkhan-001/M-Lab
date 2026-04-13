import React, { useEffect } from 'react';
import { View, ActivityIndicator } from 'react-native';
import { useRouter } from 'expo-router';
import { Colors } from '../../constants/Colors';

/**
 * Handle the native OAuth callback route to prevent "Unmatched Route" errors.
 * This component simply shows a loader while the RootLayout's useAuth() 
 * hook detects the new session and handles the final redirection.
 */
export default function OAuthNativeCallback() {
  const router = useRouter();

  useEffect(() => {
    // We don't need to do much here, as the RootLayout handles the 
    // isSignedIn logic. We just provide a valid route for Clerk to land on.
    // However, if we stay here too long, we fallback to the login.
    const timeout = setTimeout(() => {
      router.replace('/(auth)/login');
    }, 5000);

    return () => clearTimeout(timeout);
  }, []);

  return (
    <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: 'white' }}>
      <ActivityIndicator size="large" color={Colors.primary.navy} />
    </View>
  );
}
