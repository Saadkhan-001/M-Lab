import React, { useEffect } from 'react';
import { View } from 'react-native';
import { ClerkProvider, ClerkLoaded, useAuth, useUser } from '@clerk/clerk-expo';
import { Stack, useRouter, useSegments, useRootNavigationState } from 'expo-router';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '../config/firebase';
import * as SecureStore from 'expo-secure-store';
import { StatusBar } from 'expo-status-bar';
import { useFonts } from 'expo-font';
import { Onest_400Regular, Onest_500Medium, Onest_600SemiBold, Onest_700Bold } from '@expo-google-fonts/onest';
import * as SplashScreen from 'expo-splash-screen';
import Purchases from 'react-native-purchases';
import { Platform } from 'react-native';
import { REVENUECAT_CONFIG } from '../config/RevenueCatConfig';
import AppText from '../components/AppText';

SplashScreen.preventAutoHideAsync();

const tokenCache = {
  async getToken(key: string) {
    try {
      const item = await SecureStore.getItemAsync(key);
      return item;
    } catch (error) {
      console.error('SecureStore get item error: ', error);
      await SecureStore.deleteItemAsync(key);
      return null;
    }
  },
  async saveToken(key: string, value: string) {
    try {
      return SecureStore.setItemAsync(key, value);
    } catch (err) {
      return;
    }
  },
};

const publishableKey = process.env.EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY;

function RootLayoutNav() {
  const { isLoaded, isSignedIn } = useAuth();
  const { user } = useUser();
  const segments = useSegments() as string[];
  const router = useRouter();
  const rootNavigationState = useRootNavigationState();

  useEffect(() => {
    if (!isLoaded || !rootNavigationState?.key) return;

    const inAuthGroup = segments[0] === '(auth)';
    const inAppGroup = segments[0] === '(app)';

    if (!isSignedIn && !inAuthGroup) {
      // Redirect to login if not signed in
      setTimeout(() => router.replace('/(auth)/login'), 0);
    } else if (isSignedIn && user) {
      // If signed in, we check the user profile for onboarding status
      const checkProfileAndRedirect = async () => {
        try {
          const docRef = doc(db, 'users', user.id);
          const docSnap = await getDoc(docRef);
          
          const profile = docSnap.exists() ? docSnap.data() : null;
          const isOnboarded = profile?.isOnboarded === true;
          const currentSubSegment = segments.length > 1 ? segments[1] : null;

          if (!isOnboarded) {
             // User needs to setup their lab
             if (currentSubSegment !== 'onboarding') {
                setTimeout(() => router.replace('/(app)/onboarding'), 0);
             }
          } else if (inAuthGroup || currentSubSegment === 'onboarding') {
             // User is already onboarded, send to tabs if in auth or on onboarding screen
             setTimeout(() => router.replace('/(app)/(tabs)'), 0);
          }
        } catch (error) {
          console.error("Redirection Error:", error);
          // Fallback to tabs if profile check fails
          setTimeout(() => router.replace('/(app)/(tabs)'), 0);
        }
      };

      checkProfileAndRedirect();
    }
  }, [isSignedIn, isLoaded, segments, user, rootNavigationState?.key]);


  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="index" options={{ headerShown: false }} />
      <Stack.Screen name="(auth)" options={{ headerShown: false }} />
      <Stack.Screen name="(app)" options={{ headerShown: false }} />
    </Stack>
  );
}

export default function RootLayout() {
  const [fontsLoaded] = useFonts({
    'Onest-Regular': Onest_400Regular,
    'Onest-Medium': Onest_500Medium,
    'Onest-SemiBold': Onest_600SemiBold,
    'Onest-Bold': Onest_700Bold,
  });

  useEffect(() => {
    if (fontsLoaded) {
      SplashScreen.hideAsync();
    }

    // Initialize RevenueCat
    const initializePurchases = async () => {
      //@ts-ignore - isConfigured sometimes not in types but works in SDK
      const isConfigured = await Purchases.isConfigured();
      if (isConfigured) return;

      if (Platform.OS === 'ios' && REVENUECAT_CONFIG.API_KEY_IOS !== 'goog_placeholder_ios_key') {
        Purchases.configure({ apiKey: REVENUECAT_CONFIG.API_KEY_IOS });
      } else if (Platform.OS === 'android' && REVENUECAT_CONFIG.API_KEY_ANDROID !== 'goog_placeholder_android_key') {
        Purchases.configure({ apiKey: REVENUECAT_CONFIG.API_KEY_ANDROID });
      }
    };
    
    initializePurchases();
  }, [fontsLoaded]);

  if (!fontsLoaded) return null;

  if (!publishableKey) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
        <AppText variant="title2">Missing Clerk Key</AppText>
        <AppText variant="body">Please set EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY in .env</AppText>
        <StatusBar style="dark" />
      </View>
    );
  }

  return (
    <ClerkProvider publishableKey={publishableKey} tokenCache={tokenCache}>
      <ClerkLoaded>
        <RootLayoutNav />
      </ClerkLoaded>
      <StatusBar style="dark" />
    </ClerkProvider>
  );
}
