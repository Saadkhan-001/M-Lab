import React, { useState } from 'react';
import { View, TextInput, StyleSheet, KeyboardAvoidingView, Platform, ScrollView, Alert, TouchableOpacity } from 'react-native';
import { useSignIn } from '@clerk/clerk-expo';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ArrowLeft, Mail, ShieldCheck, Lock, Eye, EyeOff } from 'lucide-react-native';
import { BlurView } from 'expo-blur';
import { LinearGradient } from 'expo-linear-gradient';
import { Colors } from '../../constants/Colors';
import AppButton from '../../components/AppButton';
import AppText from '../../components/AppText';

export default function ForgotPasswordScreen() {
  const { isLoaded, signIn, setActive } = useSignIn();
  const router = useRouter();
  const { initialEmail } = useLocalSearchParams<{ initialEmail?: string }>();

  const [email, setEmail] = useState(initialEmail || '');
  const [code, setCode] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [successfulCreation, setSuccessfulCreation] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  // Step 1: Request reset code
  const onRequestReset = async () => {
    if (!isLoaded || !email) return;
    setIsLoading(true);
    try {
      await signIn.create({
        strategy: 'reset_password_email_code',
        identifier: email,
      });
      setSuccessfulCreation(true);
    } catch (err: any) {
      Alert.alert("Error", err.errors?.[0]?.longMessage || "Could not request reset code. Please check your email.");
    } finally {
      setIsLoading(false);
    }
  };

  // Step 2: Verify code and reset password
  const onResetPassword = async () => {
    if (!isLoaded) return;
    if (password !== confirmPassword) {
      Alert.alert("Error", "Passwords do not match!");
      return;
    }
    
    setIsLoading(true);
    try {
      const result = await signIn.attemptFirstFactor({
        strategy: 'reset_password_email_code',
        code,
        password,
      });

      if (result.status === 'complete') {
        await setActive({ session: result.createdSessionId });
        router.replace('/(app)/dashboard');
      } else {
        Alert.alert("Error", "Something went wrong. Please check your recovery code.");
      }
    } catch (err: any) {
      Alert.alert("Error", err.errors?.[0]?.longMessage || "Failed to reset password. Check your code.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.bgBlob1}>
        <LinearGradient colors={[Colors.primary.navy, Colors.primary.skyBlue]} style={StyleSheet.absoluteFillObject} />
      </View>
      <View style={styles.bgBlob2}>
        <LinearGradient colors={[Colors.primary.skyBlue, Colors.primary.navy]} style={StyleSheet.absoluteFillObject} />
      </View>
      <BlurView intensity={60} style={StyleSheet.absoluteFillObject} tint="light" />

      <SafeAreaView style={styles.safeArea}>
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={styles.flex}>
          <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
            <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
              <ArrowLeft size={24} color={Colors.grayscale.black} />
            </TouchableOpacity>

            <View style={styles.headerContainer}>
              <View style={styles.iconContainer}>
                <ShieldCheck size={36} color={Colors.primary.navy} strokeWidth={2.5} />
              </View>
              <AppText variant="title1" style={styles.title}>
                {successfulCreation ? "Reset Password" : "Forgot Password?"}
              </AppText>
              <AppText variant="body" style={styles.subtitle}>
                {successfulCreation 
                  ? "Enter the code sent to your email and choose a new password."
                  : "Don't worry! Enter your email and we'll send you a recovery code."}
              </AppText>
            </View>

            <View style={styles.formContainer}>
              {!successfulCreation ? (
                <>
                  <View style={styles.inputGroup}>
                    <AppText variant="caption1" fontFamily="Onest-SemiBold" style={styles.inputLabel}>Email Address</AppText>
                    <View style={styles.inputWrapper}>
                      <Mail size={20} color={Colors.grayscale.darkGray} style={styles.inputIcon} />
                      <TextInput
                        style={styles.input}
                        placeholder="your@email.com"
                        placeholderTextColor={Colors.grayscale.silver}
                        keyboardType="email-address"
                        autoCapitalize="none"
                        value={email}
                        onChangeText={setEmail}
                      />
                    </View>
                  </View>
                  <AppButton 
                    title={isLoading ? "Sending..." : "Send Reset Code"} 
                    onPress={onRequestReset} 
                    disabled={isLoading || !email}
                  />
                </>
              ) : (
                <>
                  <View style={styles.inputGroup}>
                    <AppText variant="caption1" fontFamily="Onest-SemiBold" style={styles.inputLabel}>Verification Code</AppText>
                    <View style={styles.inputWrapper}>
                      <ShieldCheck size={20} color={Colors.grayscale.darkGray} style={styles.inputIcon} />
                      <TextInput
                        style={styles.input}
                        placeholder="6-digit code"
                        placeholderTextColor={Colors.grayscale.silver}
                        keyboardType="number-pad"
                        value={code}
                        onChangeText={setCode}
                      />
                    </View>
                  </View>

                  <View style={styles.inputGroup}>
                    <AppText variant="caption1" fontFamily="Onest-SemiBold" style={styles.inputLabel}>New Password</AppText>
                    <View style={styles.inputWrapper}>
                      <Lock size={20} color={Colors.grayscale.darkGray} style={styles.inputIcon} />
                      <TextInput
                        style={styles.input}
                        placeholder="Min 8 characters"
                        placeholderTextColor={Colors.grayscale.silver}
                        secureTextEntry={!showPassword}
                        value={password}
                        onChangeText={setPassword}
                      />
                      <TouchableOpacity onPress={() => setShowPassword(!showPassword)} style={styles.eyeIcon}>
                        {showPassword ? <EyeOff size={20} color={Colors.grayscale.darkGray} /> : <Eye size={20} color={Colors.grayscale.darkGray} />}
                      </TouchableOpacity>
                    </View>
                  </View>

                  <View style={styles.inputGroup}>
                    <AppText variant="caption1" fontFamily="Onest-SemiBold" style={styles.inputLabel}>Confirm Password</AppText>
                    <View style={styles.inputWrapper}>
                      <Lock size={20} color={Colors.grayscale.darkGray} style={styles.inputIcon} />
                      <TextInput
                        style={styles.input}
                        placeholder="Repeat password"
                        placeholderTextColor={Colors.grayscale.silver}
                        secureTextEntry={!showPassword}
                        value={confirmPassword}
                        onChangeText={setConfirmPassword}
                      />
                    </View>
                  </View>

                  <AppButton 
                    title={isLoading ? "Resetting..." : "Update Password"} 
                    onPress={onResetPassword} 
                    disabled={isLoading || !code || !password || !confirmPassword}
                  />
                  
                  <TouchableOpacity onPress={() => setSuccessfulCreation(false)} style={styles.resendLink}>
                    <AppText variant="caption1" color={Colors.grayscale.darkGray}>Didn't get a code? </AppText>
                    <AppText variant="caption1" fontFamily="Onest-Bold" color={Colors.primary.navy}>Try again</AppText>
                  </TouchableOpacity>
                </>
              )}
            </View>
          </ScrollView>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.grayscale.white },
  flex: { flex: 1 },
  bgBlob1: { position: 'absolute', top: -50, left: -50, width: 300, height: 300, borderRadius: 150, opacity: 0.15 },
  bgBlob2: { position: 'absolute', bottom: -100, right: -50, width: 350, height: 350, borderRadius: 175, opacity: 0.15 },
  safeArea: { flex: 1 },
  scrollContent: { paddingHorizontal: 24, paddingVertical: 40, flexGrow: 1, justifyContent: 'center' },
  backButton: { position: 'absolute', top: 20, left: 24, zIndex: 10, padding: 8, backgroundColor: 'rgba(255,255,255,0.7)', borderRadius: 20 },
  headerContainer: { alignItems: 'center', marginBottom: 30, marginTop: 20 },
  iconContainer: { width: 72, height: 72, backgroundColor: Colors.grayscale.white, borderRadius: 24, justifyContent: 'center', alignItems: 'center', marginBottom: 16, borderWidth: 1, borderColor: Colors.grayscale.lightGray },
  title: { color: Colors.grayscale.black, marginBottom: 8, textAlign: 'center' },
  subtitle: { color: Colors.grayscale.darkGray, textAlign: 'center', paddingHorizontal: 20 },
  formContainer: { backgroundColor: 'rgba(255, 255, 255, 0.4)', borderRadius: 24, padding: 24, borderWidth: 1, borderColor: Colors.grayscale.lightGray },
  inputGroup: { marginBottom: 16 },
  inputLabel: { color: Colors.grayscale.black, marginBottom: 8, marginLeft: 4 },
  inputWrapper: { flexDirection: 'row', alignItems: 'center', backgroundColor: Colors.grayscale.white, borderRadius: 12, borderWidth: 1, borderColor: Colors.grayscale.silver, height: 56 },
  inputIcon: { marginLeft: 16, marginRight: 12 },
  input: { flex: 1, height: '100%', fontSize: 16, color: Colors.grayscale.black, fontFamily: 'Onest-Medium' },
  eyeIcon: { padding: 16 },
  resendLink: { flexDirection: 'row', justifyContent: 'center', marginTop: 20 },
});
