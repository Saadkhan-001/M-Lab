import React, { useState, useEffect, useMemo } from 'react';
import { View, StyleSheet, TouchableOpacity, TextInput, ScrollView, Modal, Alert, ActivityIndicator, FlatList, KeyboardAvoidingView, Platform } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Search, UserPlus, CreditCard, Plus, X, Check, Calculator, ReceiptText, User, Tag, Banknote, Landmark } from 'lucide-react-native';
import { collection, query, where, onSnapshot, doc, setDoc, addDoc, Timestamp, getDocs, getDoc } from 'firebase/firestore';
import * as Localization from 'expo-localization';
import { db, storage } from '../../../config/firebase';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { useUser } from '@clerk/clerk-expo';
import { Colors } from '../../../constants/Colors';
import AppText from '../../../components/AppText';
import AppButton from '../../../components/AppButton';
import { useLocalSearchParams } from 'expo-router';
import { ReportEngine } from '../../../utils/reportEngine';
import * as Sharing from 'expo-sharing';
import * as Clipboard from 'expo-clipboard';
import * as Print from 'expo-print';
import * as Linking from 'expo-linking';

// Interfaces
interface TestCatalogItem {
  id: string;
  name: string;
  price: number;
  tat: string;
}

interface Patient {
  id: string;
  name: string;
  phone: string;
  mrNumber: string;
  age: number;
  gender: 'Male' | 'Female' | 'Other';
}

export default function BillingScreen() {
  const { user } = useUser();
  const { patientId } = useLocalSearchParams();
  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [patients, setPatients] = useState<Patient[]>([]);
  const [selectedPatient, setSelectedPatient] = useState<Patient | null>(null);
  
  // Dynamic Catalog State
  const [testCatalog, setTestCatalog] = useState<TestCatalogItem[]>([]);
  const [isCatalogLoading, setIsCatalogLoading] = useState(true);
  
  // Registration Modal State
  const [isRegisterOpen, setIsRegisterOpen] = useState(false);
  const [newPatient, setNewPatient] = useState({ name: '', phone: '', age: '', gender: 'Male' as 'Male' | 'Female' | 'Other' });

  // Billing Essentials
  const [selectedTests, setSelectedTests] = useState<TestCatalogItem[]>([]);
  const [discount, setDiscount] = useState('0');
  const [paidAmount, setPaidAmount] = useState('0');
  const [isFinalizing, setIsFinalizing] = useState(false);
  const [labProfile, setLabProfile] = useState<any>(null);
  const [completedInvoice, setCompletedInvoice] = useState<any>(null);

  // Localization
  const currencySymbol = useMemo(() => {
    const locales = Localization.getLocales();
    return locales && locales.length > 0 ? locales[0].currencySymbol || '₨' : '₨';
  }, []);

  // Real-time Test Catalog Sync
  useEffect(() => {
    if (!user?.id) return;

    const fetchCatalog = async () => {
      try {
        setIsCatalogLoading(true);
        const userRef = doc(db, 'users', user.id);
        const userSnap = await getDoc(userRef);
        const labId = userSnap.data()?.laboratoryId;
        if (!labId) return;

        const labRef = doc(db, 'laboratories', labId);
        onSnapshot(labRef, snap => {
           if (snap.exists()) setLabProfile(snap.data());
        });

        const catalogRef = collection(db, 'laboratories', labId, 'test_catalog');
        const unsubscribe = onSnapshot(catalogRef, (snapshot) => {
          setTestCatalog(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })) as TestCatalogItem[]);
          setIsCatalogLoading(false);
        });

        return unsubscribe;
      } catch (error) {
        console.error("Catalog Listener Error: ", error);
        setIsCatalogLoading(false);
      }
    };

    let unsubscribe: any;
    fetchCatalog().then(unsub => unsubscribe = unsub);

    return () => {
      if (unsubscribe) unsubscribe();
    };
  }, [user?.id]);

  // Real-time patient lookup
  useEffect(() => {
    if (searchQuery.length < 3 || !user?.id) {
      setPatients([]);
      return;
    }

    const fetchPatients = async () => {
      try {
        const userRef = doc(db, 'users', user.id);
        const userSnap = await getDoc(userRef);
        const labId = userSnap.data()?.laboratoryId;
        if (!labId) return;

        const patientsRef = collection(db, 'laboratories', labId, 'patients');
        const unsubscribe = onSnapshot(patientsRef, (snapshot) => {
          const all = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })) as Patient[];
          const filtered = all.filter(p => 
            p.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
            p.phone.includes(searchQuery) ||
            p.mrNumber.includes(searchQuery)
          );
          setPatients(filtered.slice(0, 5));
        });

        return unsubscribe;
      } catch (error) {
        console.error("Patient Lookup Error: ", error);
      }
    };

    let unsubscribe: any;
    fetchPatients().then(unsub => unsubscribe = unsub);

    return () => {
      if (unsubscribe) unsubscribe();
    };
  }, [searchQuery, user?.id]);

  // Pre-select patient if routed from Patient Profile
  useEffect(() => {
    if (!patientId || !user?.id) return;
    
    const fetchSpecificPatient = async () => {
      try {
        const userRef = doc(db, 'users', user.id);
        const userSnap = await getDoc(userRef);
        const labId = userSnap.data()?.laboratoryId;
        if (!labId) return;

        const patientRef = doc(db, 'laboratories', labId, 'patients', patientId as string);
        const pSnap = await getDoc(patientRef);
        if (pSnap.exists()) {
           setSelectedPatient({ id: pSnap.id, ...pSnap.data() } as Patient);
        }
      } catch (e) {
        console.error("Auto-select Patient Error:", e);
      }
    };
    
    fetchSpecificPatient();
  }, [patientId, user?.id]);

  // Calculations
  const totalPrice = useMemo(() => {
    return selectedTests.reduce((sum: number, test: TestCatalogItem) => sum + (test.price || 0), 0);
  }, [selectedTests]);

  const discountVal = parseFloat(discount) || 0;
  const paidVal = parseFloat(paidAmount) || 0;
  const balance = totalPrice - discountVal - paidVal;

  const handleAddTest = (test: TestCatalogItem) => {
    if (selectedTests.find(t => t.id === test.id)) {
      setSelectedTests(prev => prev.filter(t => t.id !== test.id));
    } else {
      setSelectedTests(prev => [...prev, test]);
    }
  };

  const handleRegisterPatient = async () => {
    if (!newPatient.name || !newPatient.phone || !newPatient.age) {
       Alert.alert("Error", "Please fill all patient details.");
       return;
    }

    setLoading(true);
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

      const docRef = await addDoc(patientsRef, patientDoc);
      setSelectedPatient({ id: docRef.id, ...patientDoc } as Patient);
      setIsRegisterOpen(false);
      setNewPatient({ name: '', phone: '', age: '', gender: 'Male' });
      Alert.alert("Success", `Patient ${newPatient.name} registered with MR# ${mrNumber}`);
    } catch (error: any) {
      console.error(error);
      Alert.alert("Error", "Registration failed: " + error.message);
    } finally {
      setLoading(false);
    }
  };

  const finalizeBill = async () => {
    if (!selectedPatient || selectedTests.length === 0) {
      Alert.alert("Error", "Please select a patient and at least one test.");
      return;
    }

    setIsFinalizing(true);
    try {
      const userRef = doc(db, 'users', user?.id || '');
      const userSnap = await getDoc(userRef);
      const labId = userSnap.data()?.laboratoryId;
      if (!labId) throw new Error("Lab ID not found");
      
      // 1. Save Invoice
      const invoiceRef = collection(db, 'laboratories', labId, 'invoices');
      await addDoc(invoiceRef, {
        patientId: selectedPatient.id,
        patientName: selectedPatient.name,
        tests: selectedTests.map(t => t.name),
        totalAmount: totalPrice,
        discount: discountVal,
        paid: paidVal,
        balance,
        createdAt: Timestamp.now()
      });

      // 2. Create Tests for Results Screen
      const testsRef = collection(db, 'laboratories', labId, 'tests');
      for (const test of selectedTests) {
        await addDoc(testsRef, {
          patientId: selectedPatient.id,
          patientName: selectedPatient.name,
          testId: test.id,
          testName: test.name,
          reportStatus: 'pending',
          paymentStatus: balance <= 0 ? 'paid' : 'pending',
          createdAt: Timestamp.now()
        });
      }

      // Prepare UI for Completion Modal
      const invoiceData = {
         invoiceNo: user?.id?.substring(0, 4).toUpperCase() + '-' + Date.now().toString().slice(-6),
         tests: selectedTests.map(t => ({ name: t.name, price: t.price })),
         totalAmount: totalPrice,
         discount: discountVal,
         paid: paidVal,
         balance,
         createdAt: { toDate: () => new Date() }
      };

      setCompletedInvoice({ ...invoiceData, patient: selectedPatient });

      setSelectedPatient(null);
      setSelectedTests([]);
      setDiscount('0');
      setPaidAmount('0');
      setSearchQuery('');
    } catch (e: any) {
      console.error(e);
      Alert.alert("Error", "Process failed: " + e.message);
    } finally {
      setIsFinalizing(false);
    }
  };

  const handleViewReceipt = async () => {
    try {
      const uri = await ReportEngine.generateReceiptPDF(labProfile || {}, completedInvoice.patient, completedInvoice, currencySymbol);
      await Print.printAsync({ uri });
    } catch(e) { Alert.alert("Error", "Could not load report"); }
  };

  const handleShareReceipt = async () => {
    try {
      setIsFinalizing(true);
      const uri = await ReportEngine.generateReceiptPDF(labProfile || {}, completedInvoice.patient, completedInvoice, currencySymbol);
      
      // Build the WhatsApp message
      let text = `Hello ${completedInvoice.patient.name},\nThank you for your visit to ${labProfile?.name || 'our laboratory'}. Attached is your payment receipt showing a processed amount of ${currencySymbol}${completedInvoice.paid}.\n\nRegards.`;

      // Copy message to clipboard
      await Clipboard.setStringAsync(text);

      // Use native share sheet to send the PDF directly
      const isAvailable = await Sharing.isAvailableAsync();
      if (isAvailable) {
        Alert.alert(
          "Message Copied ✅",
          "Your receipt message has been copied to clipboard. Select WhatsApp in the share dialog, then paste the message along with the PDF.",
          [{ text: "Share Receipt", onPress: async () => {
            await Sharing.shareAsync(uri, {
              UTI: '.pdf',
              mimeType: 'application/pdf',
              dialogTitle: 'Send Receipt via WhatsApp'
            });
          }}]
        );
      } else {
        Alert.alert("Sharing Unavailable", "Sharing is not available on this device.");
      }
    } catch(e: any) {
      console.error("Share Receipt Error:", e);
      Alert.alert("Error", "Could not share receipt: " + (e.message || "Unknown error"));
    }
    finally { setIsFinalizing(false); }
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <ScrollView contentContainerStyle={styles.scrollContent} keyboardShouldPersistTaps="handled">
        <View style={styles.header}>
          <AppText variant="title1" style={styles.title}>New Visit & Billing</AppText>
          <AppText variant="caption1" color={Colors.grayscale.darkGray}>Cloud-Synced Finance Hub</AppText>
        </View>

        <View style={styles.card}>
          <View style={styles.cardHeader}>
             <AppText variant="title3" color={Colors.primary.navy}>1. Patient Details</AppText>
             {!selectedPatient && (
               <TouchableOpacity style={styles.registerLink} onPress={() => setIsRegisterOpen(true)}>
                 <UserPlus size={16} color={Colors.primary.skyBlue} />
                 <AppText variant="caption1" fontFamily="Onest-Bold" color={Colors.primary.skyBlue}>NEW PATIENT</AppText>
               </TouchableOpacity>
             )}
          </View>

          {!selectedPatient ? (
            <View style={styles.searchSection}>
              <View style={styles.searchBar}>
                <Search size={20} color={Colors.grayscale.silver} />
                <TextInput 
                  placeholder="Search existing patient..."
                  style={styles.searchInput}
                  value={searchQuery}
                  onChangeText={setSearchQuery}
                />
              </View>
              {patients.length > 0 && (
                <View style={styles.resultsList}>
                  {patients.map(p => (
                    <TouchableOpacity key={p.id} style={styles.resultItem} onPress={() => setSelectedPatient(p)}>
                      <User size={16} color={Colors.grayscale.darkGray} />
                      <View style={{ marginLeft: 12 }}>
                        <AppText variant="body" fontFamily="Onest-SemiBold">{p.name}</AppText>
                        <AppText variant="caption1" color={Colors.grayscale.darkGray}>{p.mrNumber} • {p.phone}</AppText>
                      </View>
                    </TouchableOpacity>
                  ))}
                </View>
              )}
            </View>
          ) : (
            <View style={styles.selectedPatientCard}>
               <View style={styles.patientBadge}>
                 <AppText variant="title2" color={Colors.primary.navy}>{selectedPatient.name[0]}</AppText>
               </View>
               <View style={{ flex: 1, marginLeft: 16 }}>
                 <AppText variant="body" fontFamily="Onest-Bold">{selectedPatient.name}</AppText>
                 <AppText variant="caption1" color={Colors.grayscale.darkGray}>{selectedPatient.mrNumber} • {selectedPatient.phone}</AppText>
               </View>
               <TouchableOpacity onPress={() => setSelectedPatient(null)}><X size={20} color={Colors.grayscale.darkGray} /></TouchableOpacity>
            </View>
          )}
        </View>

        <View style={styles.card}>
          <AppText variant="title3" color={Colors.primary.navy} style={{ marginBottom: 16 }}>2. Add Diagnostics</AppText>
          <View style={styles.testGrid}>
            {testCatalog.length > 0 ? testCatalog.map(test => (
              <TouchableOpacity 
                key={test.id} 
                style={[styles.testTag, selectedTests.find(t => t.id === test.id) && styles.testTagActive]}
                onPress={() => handleAddTest(test)}
              >
                <AppText variant="caption1" fontFamily="Onest-Bold" color={selectedTests.find(t => t.id === test.id) ? Colors.grayscale.white : Colors.grayscale.darkGray}>
                  {test.name} ({currencySymbol}{test.price})
                </AppText>
                {selectedTests.find(t => t.id === test.id) && <Check size={12} color={Colors.grayscale.white} style={{ marginLeft: 6 }} />}
              </TouchableOpacity>
            )) : (
              isCatalogLoading ? 
                <AppText variant="caption1" color={Colors.grayscale.silver}>Loading repository...</AppText> :
                <AppText variant="caption1" color={Colors.grayscale.silver}>Repository empty. Add tests in Settings.</AppText>
            )}
          </View>
        </View>

        <View style={styles.card}>
           <AppText variant="title3" color={Colors.primary.navy} style={{ marginBottom: 20 }}>3. Financial Summary</AppText>
           
           <View style={styles.financeRow}>
             <View style={styles.financeIcon}><Landmark size={20} color={Colors.primary.navy} /></View>
             <View style={{ flex: 1, marginLeft: 12 }}>
                <AppText variant="caption1" color={Colors.grayscale.darkGray}>Total Gross Price</AppText>
                <AppText variant="title2" color={Colors.primary.navy}>{currencySymbol} {totalPrice}</AppText>
             </View>
           </View>

           <View style={styles.inputGrid}>
             <View style={styles.financialInputGroup}>
               <AppText variant="caption1" fontFamily="Onest-Bold" style={styles.inputLabel}>Apply Discount ({currencySymbol})</AppText>
               <View style={styles.moneyInput}>
                 <Tag size={16} color={Colors.message.success} />
                 <TextInput 
                   keyboardType="numeric" 
                   value={discount} 
                   onChangeText={setDiscount}
                   style={styles.innerInput}
                 />
               </View>
             </View>

             <View style={styles.financialInputGroup}>
               <AppText variant="caption1" fontFamily="Onest-Bold" style={styles.inputLabel}>Paid Amount ({currencySymbol})</AppText>
               <View style={styles.moneyInput}>
                 <Banknote size={16} color={Colors.primary.skyBlue} />
                 <TextInput 
                   keyboardType="numeric" 
                   value={paidAmount} 
                   onChangeText={setPaidAmount}
                   style={styles.innerInput}
                 />
               </View>
             </View>
           </View>

           <View style={[styles.balanceBar, balance > 0 ? { backgroundColor: '#FFEBEE' } : { backgroundColor: '#E8F5E9' }]}>
             <AppText variant="body" fontFamily="Onest-Bold" color={balance > 0 ? '#C62828' : '#2E7D32'}>
               {balance > 0 ? `Remaining Balance: ${currencySymbol}${balance}` : 'FULLY PAID ✅'}
             </AppText>
           </View>
        </View>

        <AppButton 
          title={isFinalizing ? "Finalizing Payment..." : "Confirm & Process Tests"}
          disabled={isFinalizing || selectedTests.length === 0 || !selectedPatient}
          onPress={finalizeBill}
          buttonStyle={{ marginTop: 10, marginHorizontal: 24, height: 64 }}
        />
        <View style={{ height: 100 }} />
      </ScrollView>

      <Modal visible={isRegisterOpen} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
             <View style={styles.modalHeader}>
                <AppText variant="title2">Quick Registration</AppText>
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
                <AppButton title={loading ? "Registering..." : "Confirm Registration"} disabled={loading} onPress={handleRegisterPatient} buttonStyle={{ marginTop: 24 }} />
             </ScrollView>
          </View>
        </View>
      </Modal>

      {/* Completion Modal */}
      <Modal visible={!!completedInvoice} animationType="fade" transparent>
        <View style={[styles.modalOverlay, { justifyContent: 'center', backgroundColor: 'rgba(0,0,0,0.8)' }]}>
           <View style={[styles.modalContent, { height: 'auto', padding: 32, marginHorizontal: 20, borderRadius: 24, alignItems: 'center' }]}>
              <View style={{ width: 80, height: 80, borderRadius: 40, backgroundColor: '#E8F5E9', justifyContent: 'center', alignItems: 'center', marginBottom: 20 }}>
                 <Check size={40} color="#2E7D32" />
              </View>
              <AppText variant="title2" color="#2E7D32" style={{ marginBottom: 8 }}>Payment Received!</AppText>
              <AppText variant="body" color={Colors.grayscale.darkGray} style={{ textAlign: 'center', marginBottom: 24 }}>
                The tests have been dispatched to the laboratory workflow. Total Paid: {currencySymbol}{completedInvoice?.paid}.
              </AppText>

              <View style={{ width: '100%', gap: 12 }}>
                <AppButton title="View PDF Receipt" onPress={handleViewReceipt} buttonStyle={{ backgroundColor: Colors.primary.navy }} />
                <AppButton title="Send via WhatsApp" onPress={handleShareReceipt} buttonStyle={{ backgroundColor: '#25D366' }} />
                <TouchableOpacity onPress={() => setCompletedInvoice(null)} style={{ padding: 16, alignItems: 'center', marginTop: 10 }}>
                   <AppText variant="body" color={Colors.grayscale.silver} fontFamily="Onest-Bold">Close & Continue</AppText>
                </TouchableOpacity>
              </View>
           </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.grayscale.white },
  scrollContent: { paddingBottom: 40 },
  header: { paddingHorizontal: 24, paddingTop: 10, marginBottom: 20 },
  title: { color: Colors.primary.navy, marginBottom: 4 },
  card: { backgroundColor: Colors.grayscale.white, borderRadius: 24, padding: 20, marginHorizontal: 24, marginBottom: 16, borderWidth: 1, borderColor: Colors.grayscale.offWhite, elevation: 3 },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
  registerLink: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: '#E3F2FD', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 12 },
  searchSection: { position: 'relative', zIndex: 10 },
  searchBar: { flexDirection: 'row', alignItems: 'center', backgroundColor: Colors.grayscale.offWhite, borderRadius: 16, height: 50, paddingHorizontal: 16 },
  searchInput: { flex: 1, marginLeft: 12, fontFamily: 'Onest-Medium', fontSize: 14, color: Colors.primary.navy },
  resultsList: { position: 'absolute', top: 56, left: 0, right: 0, backgroundColor: 'white', borderRadius: 16, elevation: 10, zIndex: 20, borderWidth: 1, borderColor: Colors.grayscale.offWhite },
  resultItem: { flexDirection: 'row', alignItems: 'center', padding: 12, borderBottomWidth: 1, borderBottomColor: Colors.grayscale.offWhite },
  selectedPatientCard: { flexDirection: 'row', alignItems: 'center', backgroundColor: Colors.grayscale.offWhite, padding: 16, borderRadius: 16 },
  patientBadge: { width: 44, height: 44, borderRadius: 22, backgroundColor: Colors.grayscale.lightGray, justifyContent: 'center', alignItems: 'center' },
  testGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  testTag: { flexDirection: 'row', alignItems: 'center', backgroundColor: Colors.grayscale.offWhite, paddingHorizontal: 16, paddingVertical: 10, borderRadius: 16, borderWidth: 1, borderColor: Colors.grayscale.lightGray },
  testTagActive: { backgroundColor: Colors.primary.navy, borderColor: Colors.primary.navy },
  financeRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 20 },
  financeIcon: { width: 44, height: 44, borderRadius: 12, backgroundColor: Colors.grayscale.offWhite, justifyContent: 'center', alignItems: 'center' },
  inputGrid: { flexDirection: 'row', gap: 16, marginBottom: 20 },
  financialInputGroup: { flex: 1 },
  inputLabel: { marginBottom: 8, color: Colors.grayscale.darkGray },
  moneyInput: { flexDirection: 'row', alignItems: 'center', backgroundColor: Colors.grayscale.offWhite, borderRadius: 12, height: 50, paddingHorizontal: 12 },
  innerInput: { flex: 1, marginLeft: 8, fontFamily: 'Onest-Bold', fontSize: 16, color: Colors.primary.navy },
  balanceBar: { padding: 16, borderRadius: 12, alignItems: 'center' },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  modalContent: { backgroundColor: 'white', borderTopLeftRadius: 32, borderTopRightRadius: 32, height: '70%' },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 24, borderBottomWidth: 1, borderBottomColor: Colors.grayscale.offWhite },
  formGroup: { marginBottom: 16 },
  label: { marginBottom: 8, color: Colors.grayscale.black, marginLeft: 4 },
  input: { backgroundColor: Colors.grayscale.offWhite, borderRadius: 12, height: 50, paddingHorizontal: 16, fontSize: 14, fontFamily: 'Onest-Medium' },
  genderRow: { flexDirection: 'row', gap: 8 },
  genderBtn: { flex: 1, height: 40, borderRadius: 10, backgroundColor: Colors.grayscale.offWhite, justifyContent: 'center', alignItems: 'center' },
  genderBtnActive: { backgroundColor: Colors.primary.navy },
});
