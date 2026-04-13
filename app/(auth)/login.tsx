import React, { useState, useRef } from 'react';
import {
  View,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  Dimensions,
  Animated,
  Alert,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { BlurView } from 'expo-blur';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Mail, Lock, Eye, EyeOff, FlaskConical, ArrowRight } from 'lucide-react-native';
import * as WebBrowser from 'expo-web-browser';
import { useOAuth } from '@clerk/clerk-expo';
import { Link, useRouter } from 'expo-router';
import { Colors } from '../../constants/Colors';
import AppButton from '../../components/AppButton';
import AppText from '../../components/AppText';

// Warm up the android browser to improve UX
export const useWarmUpBrowser = () => {
  React.useEffect(() => {
    void (async () => {
      if (Platform.OS !== 'web') {
        try {
          await WebBrowser.warmUpAsync();
        } catch (e) {}
      }
    })();
    return () => {
      void (async () => {
        if (Platform.OS !== 'web') {
          try {
            await WebBrowser.coolDownAsync();
          } catch (e) {}
        }
      })();
    };
  }, []);
};

WebBrowser.maybeCompleteAuthSession();

const { width } = Dimensions.get('window');

export default function LoginScreen() {
  useWarmUpBrowser();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const router = useRouter();
  
  const { startOAuthFlow } = useOAuth({ strategy: 'oauth_google' });

  const handleForgotPassword = () => {
    Alert.alert(
      "Reset Password",
      "Would you like to reset your password? We will send a verification code to your email.",
      [
        { text: "No", style: "cancel" },
        { 
          text: "Yes", 
          onPress: () => router.push({
            pathname: "/(auth)/forgot-password",
            params: { initialEmail: email }
          })
        }
      ]
    );
  };

  const handleLogin = () => {
    console.log('Standard Login attempt:', email);
  };

  const triggerGoogleOAuth = React.useCallback(async () => {
    try {
      const { createdSessionId, setActive } = await startOAuthFlow();

      if (createdSessionId && setActive) {
        await setActive({ session: createdSessionId });
      }
    } catch (err) {
      console.error('OAuth error', err);
    }
  }, [startOAuthFlow]);

  return (
    <View style={styles.container}>
      <View style={styles.bgBlob1}>
        <LinearGradient
          colors={[Colors.primary.navy, Colors.primary.skyBlue]}
          style={StyleSheet.absoluteFillObject}
        />
      </View>
      <View style={styles.bgBlob2}>
        <LinearGradient
          colors={[Colors.primary.skyBlue, Colors.primary.navy]}
          style={StyleSheet.absoluteFillObject}
        />
      </View>

      <BlurView intensity={60} style={StyleSheet.absoluteFillObject} tint="light" />

      <SafeAreaView style={styles.safeArea}>
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={styles.content}
        >
          <View style={styles.headerContainer}>
            <View style={styles.logoContainer}>
              <FlaskConical size={36} color={Colors.primary.navy} strokeWidth={2.5} />
            </View>
            <AppText variant="title1" style={styles.title}>LabSync OS</AppText>
            <AppText variant="body" style={styles.subtitle}>Welcome back! Please enter your details.</AppText>
          </View>

          <View style={styles.formContainer}>
            <View style={styles.inputGroup}>
              <AppText variant="caption1" fontFamily="Onest-SemiBold" style={styles.inputLabel}>Email Address</AppText>
              <View style={styles.inputWrapper}>
                <Mail size={20} color={Colors.grayscale.darkGray} style={styles.inputIcon} />
                <TextInput
                  style={styles.input}
                  placeholder="Enter your email"
                  placeholderTextColor={Colors.grayscale.silver}
                  keyboardType="email-address"
                  autoCapitalize="none"
                  value={email}
                  onChangeText={setEmail}
                />
              </View>
            </View>

            <View style={styles.inputGroup}>
              <AppText variant="caption1" fontFamily="Onest-SemiBold" style={styles.inputLabel}>Password</AppText>
              <View style={styles.inputWrapper}>
                <Lock size={20} color={Colors.grayscale.darkGray} style={styles.inputIcon} />
                <TextInput
                  style={styles.input}
                  placeholder="Enter your password"
                  placeholderTextColor={Colors.grayscale.silver}
                  secureTextEntry={!showPassword}
                  value={password}
                  onChangeText={setPassword}
                />
                <TouchableOpacity
                  onPress={() => setShowPassword(!showPassword)}
                  style={styles.eyeIcon}
                >
                  {showPassword ? (
                    <EyeOff size={20} color={Colors.grayscale.darkGray} />
                  ) : (
                    <Eye size={20} color={Colors.grayscale.darkGray} />
                  )}
                </TouchableOpacity>
              </View>
            </View>

            <TouchableOpacity 
              style={styles.forgotPassword}
              onPress={handleForgotPassword}
            >
              <AppText variant="caption1" fontFamily="Onest-SemiBold" color={Colors.primary.navy}>Forgot password?</AppText>
            </TouchableOpacity>

            <AppButton 
              title="Sign In" 
              onPress={handleLogin}
              buttonStyle={{ marginBottom: 16 }}
            />

            <View style={styles.dividerContainer}>
              <View style={styles.dividerLine} />
              <AppText variant="caption1" style={styles.dividerText}>or</AppText>
              <View style={styles.dividerLine} />
            </View>

            <AppButton 
              title="Continue with Google" 
              variant="outline" 
              onPress={triggerGoogleOAuth}
            />

          </View>
          <View style={styles.footer}>
            <AppText variant="body" color={Colors.grayscale.darkGray}>Don't have an account? </AppText>
            <Link href="/(auth)/signup" asChild>
              <TouchableOpacity>
                <AppText variant="body" fontFamily="Onest-Bold" color={Colors.primary.navy}>Sign Up</AppText>
              </TouchableOpacity>
            </Link>
          </View>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.grayscale.white,
  },
  bgBlob1: {
    position: 'absolute',
    top: -50,
    left: -50,
    width: 300,
    height: 300,
    borderRadius: 150,
    opacity: 0.15,
  },
  bgBlob2: {
    position: 'absolute',
    bottom: -100,
    right: -50,
    width: 350,
    height: 350,
    borderRadius: 175,
    opacity: 0.15,
  },
  safeArea: {
    flex: 1,
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    paddingHorizontal: 24,
  },
  headerContainer: {
    alignItems: 'center',
    marginBottom: 40,
  },
  logoContainer: {
    width: 72,
    height: 72,
    backgroundColor: Colors.grayscale.white,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 24,
    shadowColor: Colors.primary.navy,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.1,
    shadowRadius: 16,
    borderWidth: 1,
    borderColor: Colors.grayscale.lightGray,
  },
  title: {
    color: Colors.grayscale.black,
    marginBottom: 8,
    textAlign: 'center',
  },
  subtitle: {
    color: Colors.grayscale.darkGray,
    textAlign: 'center',
  },
  formContainer: {
    backgroundColor: 'rgba(255, 255, 255, 0.4)',
    borderRadius: 24,
    padding: 24,
    borderWidth: 1,
    borderColor: Colors.grayscale.lightGray,
  },
  inputGroup: {
    marginBottom: 20,
  },
  inputLabel: {
    color: Colors.grayscale.black,
    marginBottom: 8,
    marginLeft: 4,
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.grayscale.white,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: Colors.grayscale.silver,
    height: 56,
  },
  inputIcon: {
    marginLeft: 16,
    marginRight: 12,
  },
  input: {
    flex: 1,
    height: '100%',
    fontSize: 16,
    color: Colors.grayscale.black,
    fontFamily: 'Onest-Medium',
  },
  eyeIcon: {
    padding: 16,
  },
  forgotPassword: {
    alignSelf: 'flex-end',
    marginBottom: 24,
  },
  dividerContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 20,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: Colors.grayscale.lightGray,
  },
  dividerText: {
    color: Colors.grayscale.darkGray,
    paddingHorizontal: 10,
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginTop: 32,
  },
});

