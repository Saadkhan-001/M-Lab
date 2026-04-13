import React, { useState } from 'react';
import { View, TextInput, TouchableOpacity, StyleSheet, KeyboardAvoidingView, Platform, Dimensions, ScrollView, Image } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { BlurView } from 'expo-blur';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ArrowLeft, UploadCloud, Microscope } from 'lucide-react-native';
import * as ImagePicker from 'expo-image-picker';
import { useUser } from '@clerk/clerk-expo';
import { doc, setDoc, collection } from 'firebase/firestore';
import { db } from '../../config/firebase';
import { useRouter } from 'expo-router';
import { Alert } from 'react-native';
import { Colors } from '../../constants/Colors';
import AppButton from '../../components/AppButton';
import AppText from '../../components/AppText';

const { width } = Dimensions.get('window');

export default function OnboardingWizard() {
  const router = useRouter();
  const { user } = useUser();
  const [step, setStep] = useState(1);

  // Form State
  const [labName, setLabName] = useState('');
  const [displayEmail, setDisplayEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [address, setAddress] = useState('');
  const [establishDate, setEstablishDate] = useState('');
  const [pathologistName, setPathologistName] = useState('');
  const [qualifications, setQualifications] = useState('');
  const [logoUri, setLogoUri] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const pickImage = async () => {
    let result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.5,
    });

    if (!result.canceled) {
      setLogoUri(result.assets[0].uri);
    }
  };

  const handleNext = () => {
    if (step < 3) setStep(step + 1);
  };

  const handleBack = () => {
    if (step > 1) setStep(step - 1);
  };

  const submitInstallation = async () => {
    if (!user) return;
    setIsSubmitting(true);
    try {
      const newLabRef = doc(collection(db, 'laboratories'));
      const labData = {
        name: labName,
        email: displayEmail,
        phone,
        address,
        establishDate,
        pathologistName,
        qualifications,
        logoUri, 
        ownerId: user.id,
        createdAt: new Date(),
      };

      await setDoc(newLabRef, labData);

      const userRef = doc(db, 'users', user.id);
      await setDoc(userRef, {
        uid: user.id,
        email: user.primaryEmailAddress?.emailAddress || displayEmail,
        laboratoryId: newLabRef.id,
        isOnboarded: true,
        role: 'owner',
      }, { merge: true });

      router.replace('/(app)/(tabs)');
    } catch (e: any) {
      console.error('Error saving onboarding data: ', e);
      Alert.alert('Save Failed', 'Could not save to Firebase: ' + e.message);
    } finally {
      setIsSubmitting(false);
    }
  };

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
          <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
            {step > 1 && (
              <TouchableOpacity onPress={handleBack} style={styles.backButton}>
                <ArrowLeft size={24} color={Colors.grayscale.black} />
              </TouchableOpacity>
            )}

            <View style={styles.headerContainer}>
              <View style={styles.logoContainer}>
                <Microscope size={36} color={Colors.primary.navy} strokeWidth={2.5} />
              </View>
              <AppText variant="title1" style={styles.title}>Laboratory Setup</AppText>
              <AppText variant="caption1" fontFamily="Onest-Bold" color={Colors.primary.skyBlue}>Step {step} of 3</AppText>
            </View>

            <View style={styles.formContainer}>
              {step === 1 && (
                <View>
                  <AppText variant="title3" style={styles.sectionTitle}>Basic Information</AppText>
                  
                  <View style={styles.inputGroup}>
                    <AppText variant="caption1" fontFamily="Onest-SemiBold" style={styles.inputLabel}>Laboratory Name</AppText>
                    <TextInput style={styles.input} placeholder="e.g. Apex Diagnostics" placeholderTextColor={Colors.grayscale.silver} value={labName} onChangeText={setLabName} />
                  </View>

                  <View style={styles.inputGroup}>
                    <AppText variant="caption1" fontFamily="Onest-SemiBold" style={styles.inputLabel}>Displaying Email</AppText>
                    <TextInput style={styles.input} placeholder="contact@lab.com" placeholderTextColor={Colors.grayscale.silver} keyboardType="email-address" value={displayEmail} onChangeText={setDisplayEmail} />
                  </View>

                  <View style={styles.inputGroup}>
                    <AppText variant="caption1" fontFamily="Onest-SemiBold" style={styles.inputLabel}>Establish Date</AppText>
                    <TextInput style={styles.input} placeholder="YYYY-MM-DD" placeholderTextColor={Colors.grayscale.silver} value={establishDate} onChangeText={setEstablishDate} />
                  </View>

                  <AppButton title="Next Step" onPress={handleNext} buttonStyle={{ marginTop: 12 }} />
                </View>
              )}

              {step === 2 && (
                <View>
                  <AppText variant="title3" style={styles.sectionTitle}>Contact & Location</AppText>
                  
                  <View style={styles.inputGroup}>
                    <AppText variant="caption1" fontFamily="Onest-SemiBold" style={styles.inputLabel}>Phone Number</AppText>
                    <TextInput style={styles.input} placeholder="+1 (555) 000-0000" placeholderTextColor={Colors.grayscale.silver} keyboardType="phone-pad" value={phone} onChangeText={setPhone} />
                  </View>

                  <View style={styles.inputGroup}>
                    <AppText variant="caption1" fontFamily="Onest-SemiBold" style={styles.inputLabel}>Full Address</AppText>
                    <TextInput style={[styles.input, { height: 80 }]} placeholder="123 Medical Parkway, Suite 100" placeholderTextColor={Colors.grayscale.silver} multiline value={address} onChangeText={setAddress} />
                  </View>

                  <AppButton title="Next Step" onPress={handleNext} buttonStyle={{ marginTop: 12 }} />
                </View>
              )}

              {step === 3 && (
                <View>
                  <AppText variant="title3" style={styles.sectionTitle}>Branding & Credentials</AppText>
                  
                  <View style={styles.inputGroup}>
                    <AppText variant="caption1" fontFamily="Onest-SemiBold" style={styles.inputLabel}>Laboratory Logo</AppText>
                    <TouchableOpacity style={styles.imagePicker} onPress={pickImage}>
                      {logoUri ? (
                        <Image source={{ uri: logoUri }} style={styles.imagePreview} />
                      ) : (
                        <>
                          <UploadCloud size={32} color={Colors.grayscale.silver} />
                          <AppText variant="caption1" color={Colors.grayscale.darkGray}>Tap to upload logo</AppText>
                        </>
                      )}
                    </TouchableOpacity>
                  </View>

                  <View style={styles.inputGroup}>
                    <AppText variant="caption1" fontFamily="Onest-SemiBold" style={styles.inputLabel}>Chief Pathologist Name</AppText>
                    <TextInput style={styles.input} placeholder="Dr. Sarah Johnson" placeholderTextColor={Colors.grayscale.silver} value={pathologistName} onChangeText={setPathologistName} />
                  </View>

                  <View style={styles.inputGroup}>
                    <AppText variant="caption1" fontFamily="Onest-SemiBold" style={styles.inputLabel}>Qualifications</AppText>
                    <TextInput style={styles.input} placeholder="MD, PhD (Pathology)" placeholderTextColor={Colors.grayscale.silver} value={qualifications} onChangeText={setQualifications} />
                  </View>

                  <AppButton 
                    title={isSubmitting ? 'Finalizing Setup...' : 'Complete Installation'} 
                    onPress={submitInstallation} 
                    disabled={isSubmitting}
                    buttonStyle={{ marginTop: 12, backgroundColor: Colors.message.success }} 
                  />
                </View>
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
  bgBlob1: { position: 'absolute', top: -50, left: -50, width: 300, height: 300, borderRadius: 150, opacity: 0.15 },
  bgBlob2: { position: 'absolute', bottom: -100, right: -50, width: 350, height: 350, borderRadius: 175, opacity: 0.15 },
  safeArea: { flex: 1 },
  content: { flex: 1 },
  scrollContent: { paddingHorizontal: 24, paddingVertical: 40, flexGrow: 1, justifyContent: 'center' },
  backButton: { position: 'absolute', top: 20, left: 24, zIndex: 10, padding: 8, backgroundColor: 'rgba(255,255,255,0.7)', borderRadius: 20 },
  headerContainer: { alignItems: 'center', marginBottom: 30, marginTop: 20 },
  logoContainer: { width: 72, height: 72, backgroundColor: Colors.grayscale.white, borderRadius: 24, justifyContent: 'center', alignItems: 'center', marginBottom: 16, borderWidth: 1, borderColor: Colors.grayscale.lightGray },
  title: { color: Colors.grayscale.black, marginBottom: 8, textAlign: 'center' },
  formContainer: { backgroundColor: 'rgba(255, 255, 255, 0.4)', borderRadius: 24, padding: 24, borderWidth: 1, borderColor: Colors.grayscale.lightGray },
  sectionTitle: { color: Colors.grayscale.black, marginBottom: 20 },
  inputGroup: { marginBottom: 16 },
  inputLabel: { color: Colors.grayscale.black, marginBottom: 8, marginLeft: 4 },
  input: { backgroundColor: Colors.grayscale.white, borderRadius: 12, borderWidth: 1, borderColor: Colors.grayscale.silver, height: 56, paddingHorizontal: 16, fontSize: 16, color: Colors.grayscale.black, fontFamily: 'Onest-Medium' },
  imagePicker: { height: 120, backgroundColor: Colors.grayscale.white, borderRadius: 12, borderWidth: 1, borderColor: Colors.grayscale.silver, borderStyle: 'dashed', justifyContent: 'center', alignItems: 'center'},
  imagePreview: { width: '100%', height: '100%', borderRadius: 12, resizeMode: 'cover' },
});

