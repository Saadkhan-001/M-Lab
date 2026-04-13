import React, { useEffect } from 'react';
import { View } from 'react-native';
import { ClerkProvider, ClerkLoaded, useAuth } from '@clerk/clerk-expo';
import { Stack, useRouter, useSegments } from 'expo-router';
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
  const segments = useSegments();
  const router = useRouter();

  useEffect(() => {
    if (!isLoaded) return;

    const inAuthGroup = segments[0] === '(auth)';

    if (isSignedIn && inAuthGroup) {
      router.replace('/(app)/(tabs)');
    } else if (!isSignedIn && !inAuthGroup) {
      router.replace('/(auth)/login');
    }
  }, [isSignedIn, isLoaded, segments]);

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
