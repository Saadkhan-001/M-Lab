import React, { useState, useEffect, useMemo } from 'react';
import { View, StyleSheet, TouchableOpacity, TextInput, FlatList, Dimensions, RefreshControl, Modal, Alert, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Search, UserPlus, Users, UserCheck, UserMinus, Phone, Hash, Calendar, ChevronRight, X } from 'lucide-react-native';
import { collection, query, onSnapshot, doc, setDoc, getDocs, limit, getDoc, Timestamp, addDoc } from 'firebase/firestore';
import { db } from '../../../config/firebase';
import { useUser } from '@clerk/clerk-expo';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { Colors } from '../../../constants/Colors';
import AppText from '../../../components/AppText';
import AppButton from '../../../components/AppButton';

const { width } = Dimensions.get('window');

interface Patient {
  id: string;
  name: string;
  phone: string;
  mrNumber: string;
  age: number;
  gender: 'Male' | 'Female' | 'Other';
  createdAt: any;
}

export default function PatientsScreen() {
  const router = useRouter();
  const { q } = useLocalSearchParams();
  const { user } = useUser();
  const [searchQuery, setSearchQuery] = useState('');
  const [patients, setPatients] = useState<Patient[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    if (q) setSearchQuery(q as string);
  }, [q]);

  // Registration Modal State
  const [isRegisterOpen, setIsRegisterOpen] = useState(false);
  const [newPatient, setNewPatient] = useState({ name: '', phone: '', age: '', gender: 'Male' as 'Male' | 'Female' | 'Other' });
  const [isRegistering, setIsRegistering] = useState(false);

  // Real-time listener for patients
  useEffect(() => {
    if (!user?.id) return;

    const fetchRealData = async () => {
      try {
        const userRef = doc(db, 'users', user.id);
        const userSnap = await getDoc(userRef);
        
        if (userSnap.exists()) {
          const labId = userSnap.data().laboratoryId;
          if (!labId) {
            setLoading(false);
            return;
          }

          const patientsRef = collection(db, 'laboratories', labId, 'patients');
          const unsubscribe = onSnapshot(patientsRef, (snapshot) => {
            const patientData = snapshot.docs.map(doc => ({
              id: doc.id,
              ...doc.data()
            })) as Patient[];
            
            setPatients(patientData);
            setLoading(false);
          });

          return unsubscribe;
        }
      } catch (error) {
        console.error("Error fetching lab data:", error);
        setLoading(false);
      }
    };

    let unsubscribe: any;
    fetchRealData().then(unsub => {
      unsubscribe = unsub;
    });

    return () => {
      if (unsubscribe) unsubscribe();
    };
  }, [user]);

  const stats = useMemo(() => {
    const total = patients.length;
    const male = patients.filter(p => p.gender === 'Male').length;
    const female = patients.filter(p => p.gender === 'Female').length;
    return { total, male, female };
  }, [patients]);

  const filteredPatients = useMemo(() => {
    if (!searchQuery) return patients;
    const lowerQuery = searchQuery.toLowerCase();
    return patients.filter(p => 
      p.name.toLowerCase().includes(lowerQuery) || 
      p.mrNumber.includes(searchQuery) ||
      p.phone.includes(searchQuery)
    );
  }, [patients, searchQuery]);

  const onRefresh = React.useCallback(() => {
    setRefreshing(true);
    setTimeout(() => setRefreshing(false), 1500);
  }, []);

  const handleRegisterPatient = async () => {
    if (!newPatient.name || !newPatient.phone || !newPatient.age) {
       Alert.alert("Error", "Please fill all patient details.");
       return;
    }

    setIsRegistering(true);
    try {
      const userRef = doc(db, 'users', user?.id || '');
      const userSnap = await getDoc(userRef);
      const labId = userSnap.data()?.laboratoryId;
      if (!labId) throw new Error("Lab ID not found");

      const year = new Date().getFullYear();
      const month = String(new Date().getMonth() + 1).padStart(2, '0');
      const patientsRef = collection(db, 'laboratories', labId, 'patients');
      
      const snapshot = await getDocs(patientsRef);
      const nextId = String(snapshot.size + 1).padStart(2, '0');
      const mrNumber = `${year}000${month}${nextId}`;

      const patientDoc = {
        name: newPatient.name,
        phone: newPatient.phone,
        age: parseInt(newPatient.age),
        gender: newPatient.gender,
        mrNumber,
        createdAt: Timestamp.now()
      };

      await addDoc(patientsRef, patientDoc);
      
      // Reset and close
      setNewPatient({ name: '', phone: '', age: '', gender: 'Male' });
      setIsRegisterOpen(false);
      Alert.alert("Success", "Patient successfully registered.");
    } catch (e: any) {
      console.error(e);
      Alert.alert("Registration Failed", e.message || "An error occurred.");
    } finally {
      setIsRegistering(false);
    }
  };

  const renderStatCard = (title: string, value: number, icon: any, color: string) => (
    <View style={styles.statCard}>
      <View style={[styles.statIconContainer, { backgroundColor: `${color}15` }]}>
        {icon}
      </View>
      <AppText variant="title2" style={{ color: Colors.primary.navy }}>{value}</AppText>
      <AppText variant="caption1" color={Colors.grayscale.darkGray}>{title}</AppText>
    </View>
  );

  const renderPatientCard = ({ item }: { item: Patient }) => (
    <TouchableOpacity 
      style={styles.patientCard}
      onPress={() => router.push(`/(app)/patient/${item.id}`)}
    >
      <View style={styles.patientAvatar}>
        <AppText variant="title3" color={Colors.primary.navy}>
          {item.name.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase()}
        </AppText>
      </View>
      
      <View style={styles.patientInfo}>
        <View style={styles.patientTopRow}>
          <AppText variant="body" fontFamily="Onest-Bold" color={Colors.grayscale.black}>{item.name}</AppText>
          <View style={[styles.genderBadge, { backgroundColor: item.gender === 'Male' ? '#E3F2FD' : '#FCE4EC' }]}>
            <AppText variant="caption1" style={{ fontSize: 10, color: item.gender === 'Male' ? '#1976D2' : '#C2185B' }}>
              {item.gender}
            </AppText>
          </View>
        </View>

        <View style={styles.detailsRow}>
          <View style={styles.detailItem}>
            <Hash size={14} color={Colors.grayscale.silver} />
            <AppText variant="caption1" color={Colors.grayscale.darkGray} style={styles.detailText}>{item.mrNumber}</AppText>
          </View>
          <View style={styles.detailItem}>
            <Calendar size={14} color={Colors.grayscale.silver} />
            <AppText variant="caption1" color={Colors.grayscale.darkGray} style={styles.detailText}>{item.age} yrs</AppText>
          </View>
        </View>

        <View style={styles.detailItem}>
          <Phone size={14} color={Colors.grayscale.silver} />
          <AppText variant="caption1" color={Colors.grayscale.darkGray} style={styles.detailText}>{item.phone}</AppText>
        </View>
      </View>
      
      <ChevronRight size={20} color={Colors.grayscale.lightGray} />
    </TouchableOpacity>
  );

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* Search Header */}
      <View style={styles.header}>
        <AppText variant="title1" style={styles.pageTitle}>Patients</AppText>
        <View style={styles.searchBar}>
          <Search size={20} color={Colors.grayscale.silver} style={styles.searchIcon} />
          <TextInput 
            placeholder="Search name, phone or MR#..."
            placeholderTextColor={Colors.grayscale.silver}
            style={styles.searchInput}
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
        </View>
      </View>

      <FlatList
        data={filteredPatients}
        keyExtractor={(item) => item.id}
        renderItem={renderPatientCard}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={Colors.primary.navy} />
        }
        ListHeaderComponent={
          <View style={styles.statsRow}>
            {renderStatCard('Total', stats.total, <Users size={20} color={Colors.primary.navy} />, Colors.primary.navy)}
            {renderStatCard('Male', stats.male, <UserCheck size={20} color="#1976D2" />, "#1976D2")}
            {renderStatCard('Female', stats.female, <UserCheck size={20} color="#C2185B" />, "#C2185B")}
          </View>
        }
        ListEmptyComponent={
          !loading ? (
            <View style={styles.emptyContainer}>
              <UserMinus size={64} color={Colors.grayscale.lightGray} strokeWidth={1.5} />
              <AppText variant="title2" style={styles.emptyTitle}>No Results Found</AppText>
              <AppText variant="body" color={Colors.grayscale.darkGray}>Try searching for something else.</AppText>
            </View>
          ) : null
        }
      />

      <TouchableOpacity 
        style={styles.fab}
        onPress={() => setIsRegisterOpen(true)}
      >
        <UserPlus size={28} color={Colors.grayscale.white} />
      </TouchableOpacity>

      <Modal visible={isRegisterOpen} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
             <View style={styles.modalHeader}>
                <AppText variant="title2">Register Patient</AppText>
                <TouchableOpacity onPress={() => setIsRegisterOpen(false)}><X size={24} color="black" /></TouchableOpacity>
             </View>

             <ScrollView style={{ padding: 24 }}>
                <View style={styles.formGroup}>
                  <AppText variant="caption1" style={styles.label}>Patient Full Name</AppText>
                  <TextInput style={styles.input} placeholder="John Doe" value={newPatient.name} onChangeText={v => setNewPatient({...newPatient, name: v})} />
                </View>
                <View style={styles.formGroup}>
                  <AppText variant="caption1" style={styles.label}>Phone Number</AppText>
                  <TextInput style={styles.input} placeholder="03XXXXXXXXX" keyboardType="phone-pad" value={newPatient.phone} onChangeText={v => setNewPatient({...newPatient, phone: v})} />
                </View>
                <View style={{ flexDirection: 'row', gap: 16 }}>
                  <View style={[styles.formGroup, { flex: 1 }]}>
                    <AppText variant="caption1" style={styles.label}>Age</AppText>
                    <TextInput style={styles.input} placeholder="25" keyboardType="numeric" value={newPatient.age} onChangeText={v => setNewPatient({...newPatient, age: v})} />
                  </View>
                  <View style={[styles.formGroup, { flex: 1 }]}>
                    <AppText variant="caption1" style={styles.label}>Gender</AppText>
                    <View style={styles.genderRow}>
                       {(['Male', 'Female'] as const).map(g => (
                         <TouchableOpacity key={g} style={[styles.genderBtn, newPatient.gender === g && styles.genderBtnActive]} onPress={() => setNewPatient({...newPatient, gender: g})}>
                            <AppText variant="caption1" color={newPatient.gender === g ? 'white' : 'black'}>{g}</AppText>
                         </TouchableOpacity>
                       ))}
                    </View>
                  </View>
                </View>
                <AppButton title={isRegistering ? "Registering..." : "Confirm Registration"} disabled={isRegistering} onPress={handleRegisterPatient} buttonStyle={{ marginTop: 24, marginBottom: 40 }} />
             </ScrollView>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.grayscale.white },
  header: { paddingHorizontal: 24, paddingTop: 10, paddingBottom: 20 },
  pageTitle: { color: Colors.primary.navy, marginBottom: 16 },
  searchBar: { flexDirection: 'row', alignItems: 'center', backgroundColor: Colors.grayscale.lightGray, borderRadius: 16, height: 50, paddingHorizontal: 16 },
  searchIcon: { marginRight: 12 },
  searchInput: { flex: 1, height: '100%', fontFamily: 'Onest-Medium', fontSize: 14, color: Colors.primary.navy },
  statsRow: { flexDirection: 'row', justifyContent: 'space-between', paddingHorizontal: 24, marginBottom: 24, marginTop: 10 },
  statCard: { width: (width - 48 - 24) / 3, backgroundColor: Colors.grayscale.white, borderRadius: 20, padding: 12, alignItems: 'center', borderWidth: 1, borderColor: Colors.grayscale.lightGray },
  statIconContainer: { width: 40, height: 40, borderRadius: 12, justifyContent: 'center', alignItems: 'center', marginBottom: 8 },
  listContent: { paddingBottom: 100 },
  patientCard: { flexDirection: 'row', alignItems: 'center', padding: 16, borderBottomWidth: 1, borderBottomColor: Colors.grayscale.offWhite, marginHorizontal: 24, backgroundColor: Colors.grayscale.white, borderRadius: 20, marginBottom: 12, borderWidth: 1, borderColor: Colors.grayscale.offWhite },
  patientAvatar: { width: 50, height: 50, borderRadius: 16, backgroundColor: Colors.grayscale.lightGray, justifyContent: 'center', alignItems: 'center', marginRight: 16 },
  patientInfo: { flex: 1 },
  patientTopRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 },
  genderBadge: { paddingHorizontal: 8, paddingVertical: 2, borderRadius: 10 },
  detailsRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 4 },
  detailItem: { flexDirection: 'row', alignItems: 'center', marginRight: 16 },
  detailText: { marginLeft: 4, fontSize: 12 },
  emptyContainer: { alignItems: 'center', marginTop: 100 },
  emptyTitle: { color: Colors.grayscale.black, marginTop: 16, marginBottom: 4 },
  fab: { position: 'absolute', bottom: 30, right: 30, width: 64, height: 64, borderRadius: 32, backgroundColor: Colors.primary.navy, justifyContent: 'center', alignItems: 'center', elevation: 5, shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 8 },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  modalContent: { backgroundColor: 'white', borderTopLeftRadius: 32, borderTopRightRadius: 32, height: '80%' },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 24, paddingVertical: 20, borderBottomWidth: 1, borderBottomColor: Colors.grayscale.lightGray },
  formGroup: { marginBottom: 20 },
  label: { color: Colors.grayscale.darkGray, marginBottom: 8, marginLeft: 4 },
  input: { backgroundColor: Colors.grayscale.lightGray, borderRadius: 16, padding: 16, fontFamily: 'Onest-Medium', fontSize: 16, color: Colors.grayscale.black },
  genderRow: { flexDirection: 'row', gap: 12 },
  genderBtn: { flex: 1, height: 54, borderRadius: 16, backgroundColor: Colors.grayscale.lightGray, justifyContent: 'center', alignItems: 'center' },
  genderBtnActive: { backgroundColor: Colors.primary.navy },
});
