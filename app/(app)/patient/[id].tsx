import React, { useEffect, useState } from 'react';
import { View, StyleSheet, TouchableOpacity, ScrollView, Dimensions, ActivityIndicator } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ArrowLeft, Phone, Hash, Calendar, Shield, Clipboard, MessageSquare, Edit3, Stethoscope, Clock, CheckCircle2 as CheckCircle } from 'lucide-react-native';
import { doc, getDoc, collection, query, where, onSnapshot } from 'firebase/firestore';
import { db } from '../../../config/firebase';
import { Colors } from '../../../constants/Colors';
import AppText from '../../../components/AppText';
import AppButton from '../../../components/AppButton';

const { width } = Dimensions.get('window');

interface TestRecord {
  id: string;
  testName: string;
  reportStatus: 'pending' | 'completed';
  paymentStatus: 'paid' | 'pending';
  result?: string;
  time?: string;
  createdAt?: any;
}

export default function PatientProfile() {
  const { id } = useLocalSearchParams();
  const router = useRouter();
  const [patient, setPatient] = useState<any>(null);
  const [tests, setTests] = useState<TestRecord[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!id) return;
    
    const labId = 'demo-lab-123';
    const patientRef = doc(db, 'laboratories', labId, 'patients', id as string);
    const testsRef = collection(db, 'laboratories', labId, 'tests');
    const q = query(testsRef, where('patientId', '==', id));

    // Fetch Patient Data
    const fetchPatient = async () => {
      try {
        const docSnap = await getDoc(patientRef);
        if (docSnap.exists()) {
          setPatient(docSnap.data());
        }
      } catch (error) {
        console.error("Error fetching patient:", error);
      }
    };

    // Listen to Test History
    const unsubscribeTests = onSnapshot(q, (snapshot) => {
      const testList = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as TestRecord[];
      
      // Sort client-side to avoid Firebase Index Requirement
      testList.sort((a, b) => {
        const dateA = a.createdAt?.toDate?.() || new Date(0);
        const dateB = b.createdAt?.toDate?.() || new Date(0);
        return dateB.getTime() - dateA.getTime();
      });

      setTests(testList);
      setLoading(false);
    });

    fetchPatient();
    return () => unsubscribeTests();
  }, [id]);

  if (loading) {
    return (
      <View style={[styles.container, styles.centered]}>
        <ActivityIndicator size="large" color={Colors.primary.navy} />
      </View>
    );
  }

  if (!patient) return <AppText>Patient not found</AppText>;

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <ArrowLeft size={24} color={Colors.grayscale.black} />
        </TouchableOpacity>
        <AppText variant="title3" style={styles.headerTitle}>Patient Profile</AppText>
        <TouchableOpacity style={styles.editButton}>
          <Edit3 size={20} color={Colors.primary.navy} />
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {/* Profile Card */}
        <View style={styles.profileCard}>
          <View style={styles.avatarLarge}>
            <AppText style={{ fontSize: 32, fontFamily: 'Onest-Bold', color: Colors.primary.navy }}>
              {patient.name.split(' ').map((n: string) => n[0]).join('').toUpperCase()}
            </AppText>
          </View>
          <AppText variant="title2" style={styles.patientName}>{patient.name}</AppText>
          <View style={[styles.genderBadge, { backgroundColor: patient.gender === 'Male' ? '#E3F2FD' : '#FCE4EC' }]}>
            <AppText variant="caption1" style={{ color: patient.gender === 'Male' ? '#1976D2' : '#C2185B' }}>{patient.gender}</AppText>
          </View>
        </View>

        {/* Quick Info Grid */}
        <View style={styles.infoGrid}>
          <View style={styles.infoBox}>
            <Hash size={18} color={Colors.primary.skyBlue} />
            <AppText variant="caption1" color={Colors.grayscale.darkGray}>MR Number</AppText>
            <AppText variant="body" fontFamily="Onest-SemiBold" style={{ fontSize: 13 }}>{patient.mrNumber}</AppText>
          </View>
          <View style={styles.infoBox}>
            <Calendar size={18} color={Colors.primary.skyBlue} />
            <AppText variant="caption1" color={Colors.grayscale.darkGray}>Age</AppText>
            <AppText variant="body" fontFamily="Onest-SemiBold">{patient.age} Years</AppText>
          </View>
          <View style={styles.infoBox}>
            <Stethoscope size={18} color={Colors.primary.orange} />
            <AppText variant="caption1" color={Colors.grayscale.darkGray}>Visits</AppText>
            <AppText variant="body" fontFamily="Onest-SemiBold">{tests.length}</AppText>
          </View>
        </View>

        {/* Contact Info */}
        <View style={styles.section}>
          <AppText variant="caption1" fontFamily="Onest-Bold" style={styles.sectionHeading}>Contact Information</AppText>
          <View style={styles.contactItem}>
            <View style={styles.iconCircle}>
              <Phone size={20} color={Colors.primary.navy} />
            </View>
            <View>
              <AppText variant="caption1" color={Colors.grayscale.darkGray}>Mobile Number</AppText>
              <AppText variant="body" fontFamily="Onest-SemiBold">{patient.phone}</AppText>
            </View>
          </View>
        </View>

        {/* Diagnostic History */}
        <View style={styles.section}>
          <AppText variant="caption1" fontFamily="Onest-Bold" style={styles.sectionHeading}>Diagnostic History</AppText>
          {tests.length > 0 ? (
            tests.map((record) => (
              <View key={record.id} style={styles.historyCard}>
                <View style={styles.historyTop}>
                   <View style={styles.testInfo}>
                      <AppText variant="body" fontFamily="Onest-Bold">{record.testName}</AppText>
                      <AppText variant="caption1" color={Colors.grayscale.darkGray}>{record.time || 'Registered'}</AppText>
                   </View>
                   <View style={[styles.statusBadge, { backgroundColor: record.reportStatus === 'completed' ? '#E8F5E9' : '#FFF3E0' }]}>
                      {record.reportStatus === 'completed' ? <CheckCircle size={12} color="#2E7D32" /> : <Clock size={12} color="#EF6C00" />}
                      <AppText variant="caption1" style={{ fontSize: 10, color: record.reportStatus === 'completed' ? '#2E7D32' : '#EF6C00', marginLeft: 4 }}>
                        {record.reportStatus.toUpperCase()}
                      </AppText>
                   </View>
                </View>

                {record.reportStatus === 'completed' && record.result && (
                  <View style={styles.resultSummary}>
                    <AppText variant="caption1" color={Colors.grayscale.darkGray}>Summary: </AppText>
                    <AppText variant="caption1" fontFamily="Onest-SemiBold" color={Colors.primary.navy}>{record.result}</AppText>
                  </View>
                )}
              </View>
            ))
          ) : (
            <View style={styles.emptyHistory}>
              <Clipboard size={40} color={Colors.grayscale.lightGray} strokeWidth={1.5} />
              <AppText variant="caption1" color={Colors.grayscale.darkGray} style={{ marginTop: 12 }}>No recent tests recorded for this patient.</AppText>
            </View>
          )}
        </View>
      </ScrollView>

      <View style={styles.footerActions}>
        <AppButton 
          title="Add New Test" 
          onPress={() => {}} 
          buttonStyle={{ flex: 1, marginRight: 12 }} 
        />
        <TouchableOpacity style={styles.messageButton}>
          <MessageSquare size={24} color={Colors.primary.navy} />
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.grayscale.white },
  centered: { justifyContent: 'center', alignItems: 'center' },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 24, paddingVertical: 16 },
  backButton: { padding: 8, backgroundColor: Colors.grayscale.lightGray, borderRadius: 12 },
  headerTitle: { color: Colors.grayscale.black },
  editButton: { padding: 8 },
  scrollContent: { paddingBottom: 100 },
  profileCard: { alignItems: 'center', marginVertical: 24 },
  avatarLarge: { width: 100, height: 100, borderRadius: 32, backgroundColor: Colors.grayscale.lightGray, justifyContent: 'center', alignItems: 'center', marginBottom: 16 },
  patientName: { color: Colors.grayscale.black, marginBottom: 8 },
  genderBadge: { paddingHorizontal: 12, paddingVertical: 4, borderRadius: 12 },
  infoGrid: { flexDirection: 'row', paddingHorizontal: 24, gap: 10, marginBottom: 32 },
  infoBox: { flex: 1, backgroundColor: Colors.grayscale.lightGray, borderRadius: 20, padding: 12, gap: 4, alignItems: 'center' },
  section: { paddingHorizontal: 24, marginBottom: 32 },
  sectionHeading: { color: Colors.grayscale.silver, textTransform: 'uppercase', marginBottom: 16, letterSpacing: 1 },
  contactItem: { flexDirection: 'row', alignItems: 'center', gap: 16 },
  iconCircle: { width: 44, height: 44, borderRadius: 22, backgroundColor: '#E8EAF6', justifyContent: 'center', alignItems: 'center' },
  historyCard: { backgroundColor: Colors.grayscale.white, borderRadius: 20, padding: 16, marginBottom: 12, borderWidth: 1, borderColor: Colors.grayscale.offWhite },
  historyTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  testInfo: { flex: 1 },
  statusBadge: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8 },
  resultSummary: { marginTop: 12, paddingTop: 12, borderTopWidth: 1, borderTopColor: Colors.grayscale.offWhite, flexDirection: 'row' },
  emptyHistory: { alignItems: 'center', paddingVertical: 40, backgroundColor: Colors.grayscale.offWhite, borderRadius: 24, borderStyle: 'dashed', borderWidth: 1, borderColor: Colors.grayscale.lightGray },
  footerActions: { position: 'absolute', bottom: 0, left: 0, right: 0, backgroundColor: Colors.grayscale.white, paddingHorizontal: 24, paddingVertical: 16, flexDirection: 'row', alignItems: 'center', borderTopWidth: 1, borderTopColor: Colors.grayscale.lightGray },
  messageButton: { width: 56, height: 56, borderRadius: 16, backgroundColor: Colors.grayscale.lightGray, justifyContent: 'center', alignItems: 'center' },
});
