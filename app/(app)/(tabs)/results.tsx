import React, { useState, useEffect, useMemo } from 'react';
import { View, StyleSheet, TouchableOpacity, TextInput, FlatList, Modal, ActivityIndicator, ScrollView, RefreshControl, KeyboardAvoidingView, Platform, Dimensions, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Search, ClipboardList, Clock, CheckCircle2, ChevronRight, X, Sparkles, AlertCircle, Save, SlidersHorizontal, Share2, FileText } from 'lucide-react-native';
import { useRouter } from 'expo-router';
import { collection, query, onSnapshot, doc, updateDoc, Timestamp, getDoc, where, getDocs } from 'firebase/firestore';
import { db, storage } from '../../../config/firebase';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { useUser } from '@clerk/clerk-expo';
import { Colors } from '../../../constants/Colors';
import AppText from '../../../components/AppText';
import AppButton from '../../../components/AppButton';
import { AIService, LabParameter } from '../../../services/AIService';
import { useSubscription } from '../../../hooks/useSubscription';
import { ReportEngine } from '../../../utils/reportEngine';
import * as Sharing from 'expo-sharing';
import * as Clipboard from 'expo-clipboard';
import * as Print from 'expo-print';
import * as Linking from 'expo-linking';

interface TestRecord {
  id: string;
  patientId: string;
  patientName: string;
  testName: string;
  testId?: string; // New: linking to the catalog
  reportStatus: 'pending' | 'reviewing' | 'completed';
  paymentStatus: 'paid' | 'pending';
  createdAt: any;
  completedAt?: any;
  results?: Record<string, string>;
}

export default function ResultsScreen() {
  const { user } = useUser();
  const router = useRouter();
  const { isPro } = useSubscription();

  const [activeTab, setActiveTab] = useState<'pending' | 'reviewing' | 'completed'>('pending');
  const [tests, setTests] = useState<TestRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  
  // Worksheet Modal States
  const [selectedTest, setSelectedTest] = useState<TestRecord | null>(null);
  const [currentParameters, setCurrentParameters] = useState<LabParameter[]>([]);
  const [formValues, setFormValues] = useState<Record<string, string>>({});
  const [isAILoading, setIsAILoading] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // WhatsApp & Report States
  const [labProfile, setLabProfile] = useState<any>(null);
  const [patientData, setPatientData] = useState<any>(null);

  // Real-time listener
  useEffect(() => {
    if (!user?.id) return;

    const fetchTests = async () => {
      try {
        const userRef = doc(db, 'users', user.id);
        const userSnap = await getDoc(userRef);
        
        if (userSnap.exists()) {
          const labId = userSnap.data().laboratoryId;
          if (!labId) {
            setLoading(false);
            return;
          }

          const labRef = doc(db, 'laboratories', labId);
          onSnapshot(labRef, snap => {
             if (snap.exists()) setLabProfile(snap.data());
          });

          const testsRef = collection(db, 'laboratories', labId, 'tests');
          const unsubscribe = onSnapshot(testsRef, (snapshot) => {
            const allTests = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })) as TestRecord[];
            
            const dayAgo = Date.now() - 24 * 60 * 60 * 1000;
            const filtered = allTests.filter(t => {
              if (t.reportStatus === 'completed') {
                 const completedAt = t.completedAt?.toDate?.()?.getTime() || 0;
                 return completedAt > dayAgo;
              }
              return true;
            });

            setTests(filtered);
            setLoading(false);
          });

          return unsubscribe;
        }
      } catch (error) {
        console.error("Error fetching results:", error);
        setLoading(false);
      }
    };

    let unsubscribe: any;
    fetchTests().then(unsub => unsubscribe = unsub);

    return () => {
      if (unsubscribe) unsubscribe();
    };
  }, [user]);

  const filteredData = useMemo(() => {
    let base = tests.filter(t => t.reportStatus === activeTab);
    
    if (searchQuery) {
      const lowerQuery = searchQuery.toLowerCase();
      base = base.filter(t => 
        t.patientName.toLowerCase().includes(lowerQuery) || 
        t.testName.toLowerCase().includes(lowerQuery)
      );
    }

    return base.sort((a, b) => (b.createdAt?.seconds || 0) - (a.createdAt?.seconds || 0));
  }, [tests, activeTab, searchQuery]);

  // Load Parameters from Repository or AI
  const loadParameters = async (testRequest: TestRecord) => {
    setSelectedTest(testRequest);
    setFormValues(testRequest.results || {});
    setIsAILoading(true);
    setCurrentParameters([]); // Clear old params while loading
    
    try {
      const userRef = doc(db, 'users', user?.id || '');
      const userSnap = await getDoc(userRef);
      const labId = userSnap.data()?.laboratoryId;
      if (!labId) throw new Error("Lab ID not found");
      
      const patRef = doc(db, 'laboratories', labId, 'patients', testRequest.patientId);
      const patSnap = await getDoc(patRef);
      if (patSnap.exists()) setPatientData(patSnap.data());

      // 1. Try fetching from Cloud Repository (Direct link via Test ID)
      if (testRequest.testId) {
        const catalogRef = doc(db, 'laboratories', labId, 'test_catalog', testRequest.testId);
        const catalogSnap = await getDoc(catalogRef);
        
        if (catalogSnap.exists()) {
          const data = catalogSnap.data();
          if (data.parameters && data.parameters.length > 0) {
            setCurrentParameters(data.parameters);
            setIsAILoading(false);
            return;
          }
        }
      }

      // 2. Fallback: Search Repository by Name (For old records or name matches)
      const catalogQuery = query(
        collection(db, 'laboratories', labId, 'test_catalog'),
        where('name', '==', testRequest.testName)
      );
      const catalogSnap = await getDocs(catalogQuery);
      if (!catalogSnap.empty) {
        const data = catalogSnap.docs[0].data();
        if (data.parameters && data.parameters.length > 0) {
          setCurrentParameters(data.parameters);
          setIsAILoading(false);
          return;
        }
      }

      // 3. Last Resort: Improved AI Fallback
      if (isPro) {
        const aiParams = await AIService.fetchTestParameters(testRequest.testName);
        setCurrentParameters(aiParams);
      } else {
        setIsAILoading(false);
      }
    } catch (e) {
      console.error('Error hydrating parameters:', e);
      Alert.alert("Connectivity Error", "Could not load test definitions. Please try again.");
    } finally {
      setIsAILoading(false);
    }
  };

  const handleSubmitResults = async () => {
    if (!selectedTest || !user?.id) return;
    setIsSubmitting(true);
    
    try {
      const userRef = doc(db, 'users', user.id);
      const userSnap = await getDoc(userRef);
      const labId = userSnap.data()?.laboratoryId;
      if (!labId) throw new Error("Lab ID not found");

      const docRef = doc(db, 'laboratories', labId, 'tests', selectedTest.id);
      
      const nextStatus = selectedTest.reportStatus === 'pending' ? 'reviewing' : 'completed';
      const updates: any = {
        results: formValues,
        reportStatus: nextStatus,
      };

      if (nextStatus === 'completed') {
        const statsRef = doc(db, 'laboratories', labId, 'stats', 'summary');
        updates.completedAt = Timestamp.now();
        // Atomic stats increment logic could go here
      }

      await updateDoc(docRef, updates);
      setSelectedTest(null);
      Alert.alert("Success", nextStatus === 'completed' ? "Report Verified & Finalized" : "Results sent for Review");
    } catch (e) {
      console.error(e);
      Alert.alert("Error", "Could not save results.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleViewReport = async () => {
    try {
      setIsSubmitting(true);
      const uri = await ReportEngine.generatePDF(labProfile || {}, patientData || { name: selectedTest?.patientName }, selectedTest || {} as any, currentParameters);
      await Print.printAsync({ uri });
    } catch(e) {
      console.error(e);
      Alert.alert("Error", "Could not generate report.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleWhatsAppSend = async () => {
    try {
      setIsSubmitting(true);
      let text = labProfile?.whatsappTemplate || "Hello {PatientName}, your {TestName} report is ready.";
      text = text.replace(/{PatientName}/g, patientData?.name || selectedTest?.patientName || '');
      text = text.replace(/{TestName}/g, selectedTest?.testName || '');
      text = text.replace(/{LabName}/g, labProfile?.name || 'our laboratory');
      
      const uri = await ReportEngine.generatePDF(labProfile || {}, patientData || { name: selectedTest?.patientName }, selectedTest || {} as any, currentParameters);

      // Copy the message text to clipboard so user can paste it in WhatsApp
      await Clipboard.setStringAsync(text);

      // Use native share sheet to send the PDF directly to WhatsApp
      const isAvailable = await Sharing.isAvailableAsync();
      if (isAvailable) {
        Alert.alert(
          "Message Copied ✅", 
          "Your WhatsApp message has been copied to clipboard. The share dialog will open now — select WhatsApp, then paste the message along with the PDF.",
          [{ text: "Share PDF", onPress: async () => {
            await Sharing.shareAsync(uri, { 
              UTI: '.pdf', 
              mimeType: 'application/pdf', 
              dialogTitle: 'Send Report via WhatsApp' 
            });
          }}]
        );
      } else {
        Alert.alert("Sharing Unavailable", "Sharing is not available on this device.");
      }
    } catch(e: any) {
      console.error("WhatsApp Send Error:", e);
      Alert.alert("Error", "Could not share report: " + (e.message || "Unknown error"));
    } finally {
      setIsSubmitting(false);
    }
  };

  const TabButton = ({ id, label, icon: Icon }: any) => (
    <TouchableOpacity 
      style={[styles.tab, activeTab === id && styles.activeTab]}
      onPress={() => setActiveTab(id)}
    >
      <Icon size={18} color={activeTab === id ? Colors.primary.navy : Colors.grayscale.silver} />
      <AppText 
        variant="caption1" 
        fontFamily="Onest-Bold" 
        style={[styles.tabLabel, activeTab === id && { color: Colors.primary.navy }]}
      >
        {label}
      </AppText>
      {activeTab === id && <View style={styles.tabIndicator} />}
    </TouchableOpacity>
  );

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <AppText variant="title1" style={styles.pageTitle}>Diagnostics</AppText>
        
        {/* New Search Bar */}
        <View style={styles.searchBarContainer}>
           <View style={styles.searchBar}>
              <Search size={20} color={Colors.grayscale.silver} />
              <TextInput 
                placeholder="Search patient or test..." 
                style={styles.searchInput}
                value={searchQuery}
                onChangeText={setSearchQuery}
                placeholderTextColor={Colors.grayscale.silver}
              />
              {searchQuery !== '' && (
                <TouchableOpacity onPress={() => setSearchQuery('')}>
                  <X size={18} color={Colors.grayscale.silver} />
                </TouchableOpacity>
              )}
           </View>
        </View>

        <View style={styles.tabBar}>
          <TabButton id="pending" label="Pending" icon={Clock} />
          <TabButton id="reviewing" label="Review" icon={SlidersHorizontal} />
          <TabButton id="completed" label="Verified Today" icon={CheckCircle2} />
        </View>
      </View>

      <FlatList
        data={filteredData}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.listContent}
        renderItem={({ item }) => (
          <TouchableOpacity 
            style={styles.testCard}
            onPress={() => loadParameters(item)}
          >
            <View style={styles.cardMain}>
              <View style={styles.avatarContainer}>
                <AppText variant="title3" color={Colors.primary.navy}>{item.patientName[0]}</AppText>
              </View>
              <View style={{ flex: 1, marginLeft: 16 }}>
                <AppText variant="body" fontFamily="Onest-Bold">{item.testName}</AppText>
                <AppText variant="caption1" color={Colors.grayscale.darkGray}>{item.patientName}</AppText>
              </View>
              <ChevronRight size={20} color={Colors.grayscale.lightGray} />
            </View>
          </TouchableOpacity>
        )}
        ListEmptyComponent={
          !loading ? (
            <View style={styles.emptyContainer}>
               <ClipboardList size={64} color={Colors.grayscale.lightGray} />
               <AppText variant="title2" style={{ marginTop: 16 }}>No {activeTab} reports</AppText>
               <AppText variant="body" color={Colors.grayscale.darkGray}>The worksheet is clear.</AppText>
            </View>
          ) : <ActivityIndicator style={{ marginTop: 50 }} color={Colors.primary.navy} />
        }
      />

      {/* Results Entry Modal */}
      <Modal visible={!!selectedTest} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <View style={{ flex: 1 }}>
                <AppText variant="title3">{selectedTest?.testName}</AppText>
                <AppText variant="caption1" color={Colors.grayscale.darkGray}>{selectedTest?.patientName} • {selectedTest?.reportStatus.toUpperCase()}</AppText>
              </View>
              
              {selectedTest?.reportStatus !== 'completed' && (
                <TouchableOpacity 
                   onPress={() => {
                     if (!isPro) {
                        Alert.alert("Pro Feature", "AI Intelligence is only available for professional labs. Upgrade now to unlock it!", [
                          { text: "Cancel", style: "cancel" },
                          { text: "View Plans", onPress: () => router.push('/plans') }
                        ]);
                     } else {
                        selectedTest && loadParameters(selectedTest)
                     }
                   }}
                   style={styles.aiRefreshButton}
                   disabled={isAILoading}
                >
                  <Sparkles size={18} color="#7E57C2" />
                  <AppText variant="caption1" fontFamily="Onest-Bold" color="#7E57C2">Refresh ✨</AppText>
                </TouchableOpacity>
              )}

              <TouchableOpacity onPress={() => setSelectedTest(null)} style={styles.closeButton}>
                <X size={24} color="black" />
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.formScroll} showsVerticalScrollIndicator={false}>
              {isAILoading ? (
                <View style={styles.aiLoadingContainer}>
                   <ActivityIndicator size="large" color="#7E57C2" />
                   <AppText style={{ marginTop: 16 }} color="#7E57C2" fontFamily="Onest-Bold">Loading definitions...</AppText>
                </View>
              ) : currentParameters.map((param, idx) => (
                <View key={idx} style={styles.inputGroup}>
                   <View style={styles.labelRow}>
                      <AppText variant="caption1" fontFamily="Onest-Bold">{param.name}</AppText>
                      <View style={styles.rangeBadge}><AppText variant="caption1" style={styles.rangeText}>{param.range} {param.unit}</AppText></View>
                   </View>
                   <View style={[styles.inputWrapper, selectedTest?.reportStatus === 'completed' && { opacity: 0.6 }]}>
                      <TextInput 
                        style={styles.numericInput}
                        placeholder="0.00"
                        keyboardType="numeric"
                        value={formValues[param.name] || ''}
                        onChangeText={v => setFormValues({...formValues, [param.name]: v})}
                        editable={selectedTest?.reportStatus !== 'completed'}
                      />
                      <AppText variant="caption1" color={Colors.primary.navy}>{param.unit}</AppText>
                   </View>
                </View>
              ))}
              <View style={{ height: 40 }} />
            </ScrollView>

            <View style={styles.footer}>
               {selectedTest?.reportStatus === 'completed' ? (
                 <View style={{ flexDirection: 'row', gap: 12 }}>
                   <AppButton title="View PDF" onPress={handleViewReport} disabled={isSubmitting} buttonStyle={{ flex: 1, backgroundColor: Colors.primary.navy }} />
                   <AppButton title="Send WhatsApp" onPress={handleWhatsAppSend} disabled={isSubmitting} buttonStyle={{ flex: 1.2, backgroundColor: '#25D366' }} />
                 </View>
               ) : (
                 <AppButton 
                    title={isSubmitting ? "Saving..." : selectedTest?.reportStatus === 'pending' ? "Confirm Results" : "Verify & Finalize"}
                    onPress={handleSubmitResults}
                    disabled={isSubmitting || isAILoading}
                 />
               )}
            </View>
          </KeyboardAvoidingView>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.grayscale.white },
  header: { paddingHorizontal: 24, paddingTop: 10 },
  pageTitle: { color: Colors.primary.navy, marginBottom: 12 },
  searchBarContainer: { marginBottom: 16 },
  searchBar: { flexDirection: 'row', alignItems: 'center', backgroundColor: Colors.grayscale.offWhite, borderRadius: 16, height: 50, paddingHorizontal: 16, gap: 12 },
  searchInput: { flex: 1, fontFamily: 'Onest-Medium', fontSize: 14, color: Colors.primary.navy },
  tabBar: { flexDirection: 'row', gap: 16, marginBottom: 10 },
  tab: { flex: 1, alignItems: 'center', paddingVertical: 12, position: 'relative' },
  activeTab: { backgroundColor: 'rgba(232, 245, 233, 0.4)', borderRadius: 16 },
  tabLabel: { marginTop: 4, color: Colors.grayscale.silver, fontSize: 11 },
  tabIndicator: { position: 'absolute', bottom: 0, width: 24, height: 3, backgroundColor: Colors.primary.navy, borderRadius: 2 },
  listContent: { padding: 24, paddingBottom: 100 },
  testCard: { backgroundColor: 'white', borderRadius: 24, padding: 18, marginBottom: 16, borderWidth: 1, borderColor: Colors.grayscale.offWhite, elevation: 2 },
  cardMain: { flexDirection: 'row', alignItems: 'center' },
  avatarContainer: { width: 50, height: 50, borderRadius: 16, backgroundColor: Colors.grayscale.lightGray, justifyContent: 'center', alignItems: 'center' },
  emptyContainer: { alignItems: 'center', marginTop: 100 },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  modalContent: { backgroundColor: 'white', borderTopLeftRadius: 32, borderTopRightRadius: 32, height: '85%' },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 24, borderBottomWidth: 1, borderBottomColor: Colors.grayscale.offWhite },
  aiRefreshButton: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: '#F3E5F5', paddingHorizontal: 12, paddingVertical: 8, borderRadius: 12, marginRight: 12 },
  closeButton: { padding: 8, backgroundColor: Colors.grayscale.lightGray, borderRadius: 12 },
  formScroll: { padding: 24 },
  aiLoadingContainer: { alignItems: 'center', paddingTop: 60 },
  inputGroup: { marginBottom: 20 },
  labelRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8 },
  rangeBadge: { backgroundColor: Colors.grayscale.offWhite, paddingHorizontal: 8, paddingVertical: 2, borderRadius: 8 },
  rangeText: { fontSize: 10, color: Colors.grayscale.darkGray },
  inputWrapper: { flexDirection: 'row', alignItems: 'center', backgroundColor: Colors.grayscale.offWhite, borderRadius: 16, paddingHorizontal: 16, height: 56 },
  numericInput: { flex: 1, fontFamily: 'Onest-Bold', fontSize: 16, color: Colors.primary.navy },
  footer: { padding: 24, borderTopWidth: 1, borderTopColor: Colors.grayscale.offWhite },
});
