import React, { useState } from 'react';
import { View, TextInput, TouchableOpacity, StyleSheet, KeyboardAvoidingView, Platform, Dimensions } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { BlurView } from 'expo-blur';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Mail, Lock, Eye, EyeOff, User, ArrowLeft, FlaskConical } from 'lucide-react-native';
import * as Linking from 'expo-linking';
import { useSignUp, useOAuth } from '@clerk/clerk-expo';
import { useRouter } from 'expo-router';
import { Alert } from 'react-native';
import { Colors } from '../../constants/Colors';
import AppButton from '../../components/AppButton';
import AppText from '../../components/AppText';

const { width } = Dimensions.get('window');

export default function SignUpScreen() {
  const router = useRouter();
  const { isLoaded, signUp, setActive } = useSignUp();
  const { startOAuthFlow } = useOAuth({ strategy: 'oauth_google' });

  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [username, setUsername] = useState('');
  const [emailAddress, setEmailAddress] = useState('');
  const [password, setPassword] = useState('');
  
  const [pendingVerification, setPendingVerification] = useState(false);
  const [code, setCode] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  const onSignUpPress = async () => {
    if (!isLoaded) return;
    try {
      await signUp.create({
        firstName,
        lastName,
        username,
        emailAddress,
        password,
      });
      await signUp.prepareEmailAddressVerification({ strategy: 'email_code' });
      setPendingVerification(true);
    } catch (err: any) {
      if (err.errors && err.errors.length > 0) {
        Alert.alert('Sign Up Failed', err.errors[0].longMessage || err.errors[0].message);
      } else {
        Alert.alert('Error', err.message || 'An unknown error occurred');
      }
    }
  };

  const onPressVerify = async () => {
    if (!isLoaded) return;
    try {
      const completeSignUp = await signUp.attemptEmailAddressVerification({ code });
      
      if (completeSignUp.status === 'complete' || completeSignUp.createdSessionId) {
        await setActive({ session: completeSignUp.createdSessionId });
      } else {
        Alert.alert(
          'Missing Requirements: ' + completeSignUp.status, 
          JSON.stringify(completeSignUp, null, 2)
        );
      }
    } catch (err: any) {
      if (err.errors && err.errors.length > 0) {
        Alert.alert('Verification Failed', err.errors[0].longMessage || err.errors[0].message);
      } else {
        Alert.alert('Error', err.message || 'An unknown error occurred');
      }
    }
  };

  const triggerGoogleOAuth = React.useCallback(async () => {
    try {
      const { createdSessionId, setActive: setOAuthActive } = await startOAuthFlow({
        redirectUrl: Linking.createURL('/oauth-native-callback', { scheme: 'labmanagementapp' }),
      });
      if (createdSessionId && setOAuthActive) {
        await setOAuthActive({ session: createdSessionId });
      }
    } catch (err: any) {
      console.error('OAuth error', err);
    }
  }, [startOAuthFlow]);

  return (
    <View style={styles.container}>
      {/* Background blobs */}
      <View style={styles.bgBlob1}>
        <LinearGradient colors={[Colors.primary.navy, Colors.primary.skyBlue]} style={StyleSheet.absoluteFillObject} />
      </View>
      <View style={styles.bgBlob2}>
        <LinearGradient colors={[Colors.primary.skyBlue, Colors.primary.navy]} style={StyleSheet.absoluteFillObject} />
      </View>

      <BlurView intensity={60} style={StyleSheet.absoluteFillObject} tint="light" />

      <SafeAreaView style={styles.safeArea}>
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={styles.content}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
            <ArrowLeft size={24} color={Colors.grayscale.black} />
          </TouchableOpacity>

          <View style={styles.headerContainer}>
            <View style={styles.logoContainer}>
              <FlaskConical size={36} color={Colors.primary.navy} strokeWidth={2.5} />
            </View>
            <AppText variant="title1" style={styles.title}>Create Account</AppText>
            <AppText variant="body" style={styles.subtitle}>Join LabSync OS to manage your diagnostics.</AppText>
          </View>

          <View style={styles.formContainer}>
            {!pendingVerification && (
              <>
                <View style={styles.row}>
                  <View style={[styles.inputGroup, { flex: 1, marginRight: 8 }]}>
                    <AppText variant="caption1" fontFamily="Onest-SemiBold" style={styles.inputLabel}>First Name</AppText>
                    <View style={styles.inputWrapper}>
                      <TextInput
                        style={[styles.input, { marginLeft: 16 }]}
                        placeholder="John"
                        placeholderTextColor={Colors.grayscale.silver}
                        value={firstName}
                        onChangeText={setFirstName}
                      />
                    </View>
                  </View>
                  <View style={[styles.inputGroup, { flex: 1, marginLeft: 8 }]}>
                    <AppText variant="caption1" fontFamily="Onest-SemiBold" style={styles.inputLabel}>Last Name</AppText>
                    <View style={styles.inputWrapper}>
                      <TextInput
                        style={[styles.input, { marginLeft: 16 }]}
                        placeholder="Doe"
                        placeholderTextColor={Colors.grayscale.silver}
                        value={lastName}
                        onChangeText={setLastName}
                      />
                    </View>
                  </View>
                </View>

                <View style={styles.inputGroup}>
                  <AppText variant="caption1" fontFamily="Onest-SemiBold" style={styles.inputLabel}>Username</AppText>
                  <View style={styles.inputWrapper}>
                    <User size={20} color={Colors.grayscale.darkGray} style={styles.inputIcon} />
                    <TextInput
                      style={styles.input}
                      placeholder="Choose a username"
                      placeholderTextColor={Colors.grayscale.silver}
                      autoCapitalize="none"
                      value={username}
                      onChangeText={setUsername}
                    />
                  </View>
                </View>

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
                      value={emailAddress}
                      onChangeText={setEmailAddress}
                    />
                  </View>
                </View>

                <View style={styles.inputGroup}>
                  <AppText variant="caption1" fontFamily="Onest-SemiBold" style={styles.inputLabel}>Password</AppText>
                  <View style={styles.inputWrapper}>
                    <Lock size={20} color={Colors.grayscale.darkGray} style={styles.inputIcon} />
                    <TextInput
                      style={styles.input}
                      placeholder="Create a password"
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

                <AppButton 
                  title="Sign Up" 
                  onPress={onSignUpPress}
                  buttonStyle={{ marginTop: 12 }}
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
              </>
            )}

            {pendingVerification && (
              <>
                <View style={styles.inputGroup}>
                  <AppText variant="caption1" fontFamily="Onest-SemiBold" style={styles.inputLabel}>Verification Code</AppText>
                  <View style={styles.inputWrapper}>
                    <TextInput
                      style={[styles.input, { marginLeft: 16 }]}
                      placeholder="Enter the 6-digit code sent to your email"
                      placeholderTextColor={Colors.grayscale.silver}
                      value={code}
                      onChangeText={setCode}
                      keyboardType="number-pad"
                    />
                  </View>
                </View>
                
                <AppButton 
                  title="Verify Email" 
                  onPress={onPressVerify}
                  buttonStyle={{ marginTop: 12 }}
                />
              </>
            )}
          </View>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.grayscale.white },
  bgBlob1: { position: 'absolute', top: -50, left: -50, width: 300, height: 300, borderRadius: 150, opacity: 0.15 },
  bgBlob2: { position: 'absolute', bottom: -100, right: -50, width: 350, height: 350, borderRadius: 175, opacity: 0.15 },
  safeArea: { flex: 1 },
  content: { flex: 1, justifyContent: 'center', paddingHorizontal: 24 },
  backButton: { position: 'absolute', top: 20, left: 24, zIndex: 10, padding: 8, backgroundColor: 'rgba(255,255,255,0.7)', borderRadius: 20 },
  headerContainer: { alignItems: 'center', marginBottom: 40, marginTop: 40 },
  logoContainer: { marginBottom: 16 },
  title: { color: Colors.grayscale.black, marginBottom: 8, textAlign: 'center' },
  subtitle: { color: Colors.grayscale.darkGray, textAlign: 'center' },
  formContainer: {
    backgroundColor: 'rgba(255, 255, 255, 0.4)',
    borderRadius: 24,
    padding: 24, borderWidth: 1, borderColor: Colors.grayscale.lightGray },
  row: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 16 },
  inputGroup: { marginBottom: 16 },
  inputLabel: { color: Colors.grayscale.black, marginBottom: 8, marginLeft: 4 },
  inputWrapper: { flexDirection: 'row', alignItems: 'center', backgroundColor: Colors.grayscale.white, borderRadius: 12, borderWidth: 1, borderColor: Colors.grayscale.silver, height: 56 },
  inputIcon: { marginLeft: 16, marginRight: 12 },
  input: { flex: 1, height: '100%', fontSize: 16, color: Colors.grayscale.black, fontFamily: 'Onest-Medium' },
  eyeIcon: { padding: 16 },
  dividerContainer: { flexDirection: 'row', alignItems: 'center', marginVertical: 20 },
  dividerLine: { flex: 1, height: 1, backgroundColor: Colors.grayscale.lightGray },
  dividerText: { color: Colors.grayscale.darkGray, paddingHorizontal: 10 },
});

