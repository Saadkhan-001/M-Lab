import React, { useState, useEffect } from 'react';
import { View, StyleSheet, ScrollView, TouchableOpacity, Modal, TextInput, Alert, ActivityIndicator, Image } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Settings, LogOut, Shield, Bell, ChevronRight, FlaskConical, Plus, X, Sparkles, Trash2, CreditCard, User as UserIcon, Crown } from 'lucide-react-native';
import { useAuth, useUser } from '@clerk/clerk-expo';
import { collection, query, onSnapshot, doc, setDoc, addDoc, deleteDoc, updateDoc, getDoc } from 'firebase/firestore';
import { useRouter } from 'expo-router';
import { db } from '../../../config/firebase';
import { Colors } from '../../../constants/Colors';
import AppText from '../../../components/AppText';
import AppButton from '../../../components/AppButton';
import { AIService, LabParameter } from '../../../services/AIService';
import { useSubscription } from '../../../hooks/useSubscription';

interface TestCatalogItem {
  id: string;
  name: string;
  price: number;
  tat: string;
  parameters: LabParameter[];
}

export default function SettingsScreen() {
  const { signOut } = useAuth();
  const { user } = useUser();
  const router = useRouter();
  const { isPro, planName, loading: subLoading } = useSubscription();
  
  // Repository States
  const [catalog, setCatalog] = useState<TestCatalogItem[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingTest, setEditingTest] = useState<Partial<TestCatalogItem> | null>(null);
  const [isAILoading, setIsAILoading] = useState(false);

  // Real-time Catalog Listener
  useEffect(() => {
    const fetchCatalog = async () => {
      try {
        const userRef = doc(db, 'users', user?.id || '');
        const userSnap = await getDoc(userRef);
        const labId = userSnap.data()?.laboratoryId;
        if (!labId) return;

        const catalogRef = collection(db, 'laboratories', labId, 'test_catalog');
        const unsubscribe = onSnapshot(catalogRef, (snapshot) => {
          setCatalog(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })) as TestCatalogItem[]);
        });

        return unsubscribe;
      } catch (e) {
        console.error("Catalog Error:", e);
      }
    };

    let unsubscribe: any;
    fetchCatalog().then(unsub => unsubscribe = unsub);

    return () => {
      if (unsubscribe) unsubscribe();
    };
  }, [user]);

  const handleSaveTest = async () => {
    if (!editingTest?.name || !editingTest?.price) {
      Alert.alert("Error", "Name and Price are required.");
      return;
    }

    try {
      const userRef = doc(db, 'users', user?.id || '');
      const userSnap = await getDoc(userRef);
      const labId = userSnap.data()?.laboratoryId;
      if (!labId) throw new Error("Lab ID not found");

      const payload = {
        name: editingTest.name,
        price: parseFloat(editingTest.price as any),
        tat: editingTest.tat || 'N/A',
        parameters: editingTest.parameters || []
      };

      if (editingTest.id) {
        await updateDoc(doc(db, 'laboratories', labId, 'test_catalog', editingTest.id), payload);
      } else {
        await addDoc(collection(db, 'laboratories', labId, 'test_catalog'), payload);
      }
      
      setIsModalOpen(false);
      setEditingTest(null);
    } catch (e) {
      console.error(e);
    }
  };

  const autoGenerateWithAI = async () => {
    if (!isPro) {
      Alert.alert("Upgrade Required", "AI Auto-Generation is a Pro feature. Level up your lab to unlock it!", [
        { text: "Cancel", style: "cancel" },
        { text: "View Plans", onPress: () => router.push('/plans') }
      ]);
      return;
    }

    if (!editingTest?.name) {
      Alert.alert("Missing Name", "Please enter the test name first.");
      return;
    }
    
    setIsAILoading(true);
    try {
      const params = await AIService.fetchTestParameters(editingTest.name);
      if (params && params.length > 0) {
        setEditingTest(prev => ({ ...prev, parameters: params }));
      }
    } catch (e) {
      Alert.alert("AI Error", "Could not connect to medical intelligence.");
    } finally {
      setIsAILoading(false);
    }
  };

  const SettingItem = ({ icon: Icon, label, onPress, color = Colors.primary.navy, rightText }: any) => (
    <TouchableOpacity style={styles.settingItem} onPress={onPress}>
      <View style={styles.settingLeft}>
        <View style={[styles.iconContainer, { backgroundColor: color === Colors.primary.navy ? Colors.grayscale.lightGray : `${color}15` }]}>
          <Icon size={20} color={color} />
        </View>
        <AppText variant="body" fontFamily="Onest-Medium" style={[styles.settingLabel, color !== Colors.primary.navy && { color }]}>{label}</AppText>
      </View>
      <View style={{ flexDirection: 'row', alignItems: 'center' }}>
        {rightText && <AppText variant="caption1" color={Colors.grayscale.darkGray} style={{ marginRight: 8 }}>{rightText}</AppText>}
        <ChevronRight size={20} color={Colors.grayscale.silver} />
      </View>
    </TouchableOpacity>
  );

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        <View style={styles.header}>
          <AppText variant="title1" style={styles.title}>Settings</AppText>
        </View>

        {/* User Profile Card */}
        <View style={styles.profileCard}>
          <View style={styles.profileInfo}>
            {user?.imageUrl ? (
              <Image source={{ uri: user.imageUrl }} style={styles.avatar} />
            ) : (
              <View style={[styles.avatar, { backgroundColor: Colors.grayscale.lightGray, justifyContent: 'center', alignItems: 'center' }]}>
                <UserIcon size={32} color={Colors.primary.navy} />
              </View>
            )}
            <View style={styles.profileMeta}>
              <AppText variant="title2" numberOfLines={1}>{user?.fullName || 'Lab Admin'}</AppText>
              <AppText variant="caption1" color={Colors.grayscale.darkGray}>{user?.primaryEmailAddress?.emailAddress}</AppText>
            </View>
          </View>
          
          <View style={styles.planBadgeContainer}>
            <View style={[styles.planBadge, { backgroundColor: isPro ? '#FFD700' : Colors.grayscale.lightGray }]}>
              {isPro && <Crown size={12} color={Colors.primary.navy} style={{ marginRight: 4 }} />}
              <AppText variant="caption1" fontFamily="Onest-Bold" color={Colors.primary.navy}>
                {isPro ? (planName || 'PRO MEMBER').toUpperCase() : 'FREE PLAN'}
              </AppText>
            </View>
          </View>
        </View>

        <View style={styles.section}>
          <AppText variant="caption1" fontFamily="Onest-Bold" style={styles.sectionTitle}>Lab Management</AppText>
          <SettingItem 
            icon={FlaskConical} 
            label="Manage Test Repository" 
            onPress={() => {
              setEditingTest({ name: '', price: 0, tat: '', parameters: [] });
              setIsModalOpen(true);
            }} 
          />
          <SettingItem 
            icon={CreditCard} 
            label="Subscription Plans" 
            rightText={isPro ? "Manage" : "Upgrade"}
            onPress={() => router.push('/plans')} 
            color={!isPro ? Colors.primary.orange : Colors.primary.navy}
          />
        </View>

        <View style={[styles.section, { marginTop: 32 }]}>
          <AppText variant="caption1" fontFamily="Onest-Bold" style={styles.sectionTitle}>Accounts & Safety</AppText>
          <SettingItem icon={Shield} label="Account Security" />
          <SettingItem icon={Bell} label="Notifications" />
          <SettingItem icon={LogOut} label="Sign Out" color={Colors.message.error} onPress={() => signOut()} />
        </View>
      </ScrollView>

      {/* Test Manager Modal */}
      <Modal visible={isModalOpen} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
           <View style={styles.modalContent}>
              <View style={styles.modalHeader}>
                 <AppText variant="title2">{editingTest?.id ? 'Edit Test' : 'New Catalog Entry'}</AppText>
                 <TouchableOpacity onPress={() => setIsModalOpen(false)}><X size={24} color="black" /></TouchableOpacity>
              </View>

              <ScrollView style={{ padding: 24 }}>
                 <View style={styles.formGroup}>
                    <AppText variant="caption1" style={styles.label}>Diagnostic Test Name</AppText>
                    <View style={styles.aiInputRow}>
                      <TextInput 
                        style={[styles.input, { flex: 1 }]} 
                        placeholder="e.g. Lipid Profile" 
                        value={editingTest?.name} 
                        onChangeText={v => setEditingTest({...editingTest, name: v})} 
                      />
                      <TouchableOpacity 
                        style={[styles.aiButton, !editingTest?.name && { opacity: 0.5 }, !isPro && { backgroundColor: Colors.grayscale.silver }]} 
                        onPress={autoGenerateWithAI}
                        disabled={!editingTest?.name || isAILoading}
                      >
                         {isAILoading ? <ActivityIndicator size="small" color="white" /> : <Sparkles size={18} color="white" />}
                      </TouchableOpacity>
                    </View>
                    {!isPro && <AppText variant="caption1" color={Colors.primary.orange} style={{ marginTop: 6 }}>Upgrade to Pro for AI intelligence ✨</AppText>}
                 </View>

                 <View style={{ flexDirection: 'row', gap: 16 }}>
                    <View style={[styles.formGroup, { flex: 1 }]}>
                      <AppText variant="caption1" style={styles.label}>Price</AppText>
                      <TextInput style={styles.input} placeholder="0.00" keyboardType="numeric" value={editingTest?.price?.toString()} onChangeText={v => setEditingTest({...editingTest, price: parseFloat(v)})} />
                    </View>
                    <View style={[styles.formGroup, { flex: 1 }]}>
                      <AppText variant="caption1" style={styles.label}>Report TAT</AppText>
                      <TextInput style={styles.input} placeholder="e.g. 4 Hours" value={editingTest?.tat} onChangeText={v => setEditingTest({...editingTest, tat: v})} />
                    </View>
                 </View>

                 <View style={styles.paramsHeader}>
                    <AppText variant="body" fontFamily="Onest-Bold">Parameters ({editingTest?.parameters?.length || 0})</AppText>
                    <TouchableOpacity onPress={() => {
                        const newParams = [...(editingTest?.parameters || []), { name: '', unit: '', range: '' }];
                        setEditingTest({...editingTest, parameters: newParams as any});
                    }}>
                      <Plus size={20} color={Colors.primary.skyBlue} />
                    </TouchableOpacity>
                 </View>

                 {editingTest?.parameters?.map((p, idx) => (
                   <View key={idx} style={styles.paramItem}>
                      <View style={{ flex: 1 }}>
                        <TextInput style={styles.paramInput} placeholder="Name (e.g. TSH)" value={p.name} onChangeText={v => {
                            const updated = [...(editingTest.parameters || [])];
                            updated[idx].name = v;
                            setEditingTest({...editingTest, parameters: updated});
                        }} />
                        <View style={{ flexDirection: 'row', gap: 8, marginTop: 8 }}>
                          <TextInput style={[styles.paramInput, { flex: 1 }]} placeholder="Unit" value={p.unit} onChangeText={v => {
                              const updated = [...(editingTest.parameters || [])];
                              updated[idx].unit = v;
                              setEditingTest({...editingTest, parameters: updated});
                          }} />
                          <TextInput style={[styles.paramInput, { flex: 1 }]} placeholder="Range" value={p.range} onChangeText={v => {
                              const updated = [...(editingTest.parameters || [])];
                              updated[idx].range = v;
                              setEditingTest({...editingTest, parameters: updated});
                          }} />
                        </View>
                      </View>
                      <TouchableOpacity onPress={() => {
                        const updated = editingTest.parameters?.filter((_, i) => i !== idx);
                        setEditingTest({...editingTest, parameters: updated});
                      }}><Trash2 size={18} color={Colors.message.error} /></TouchableOpacity>
                   </View>
                 ))}

                 <AppButton title={editingTest?.id ? "Update Test" : "Save to Repository"} onPress={handleSaveTest} buttonStyle={{ marginTop: 24 }} />
                 <View style={{ height: 100 }} />
              </ScrollView>
           </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.grayscale.white },
  scrollContent: { paddingBottom: 40 },
  header: { paddingHorizontal: 24, paddingTop: 20, marginBottom: 10 },
  title: { color: Colors.primary.navy },
  profileCard: { marginHorizontal: 24, backgroundColor: Colors.grayscale.offWhite, borderRadius: 28, padding: 24, marginTop: 10, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', borderWidth: 1, borderColor: Colors.grayscale.lightGray },
  profileInfo: { flexDirection: 'row', alignItems: 'center', flex: 1 },
  avatar: { width: 64, height: 64, borderRadius: 22, backgroundColor: 'white', borderWidth: 2, borderColor: 'white' },
  profileMeta: { marginLeft: 16, flex: 1 },
  planBadgeContainer: { alignItems: 'flex-end' },
  planBadge: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 10, paddingVertical: 6, borderRadius: 12 },
  section: { marginTop: 24, paddingHorizontal: 24 },
  sectionTitle: { color: Colors.grayscale.silver, textTransform: 'uppercase', fontSize: 10, marginBottom: 12, marginLeft: 4 },
  settingItem: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: Colors.grayscale.lightGray },
  settingLeft: { flexDirection: 'row', alignItems: 'center' },
  iconContainer: { width: 44, height: 44, borderRadius: 12, justifyContent: 'center', alignItems: 'center' },
  settingLabel: { marginLeft: 12, color: Colors.grayscale.black },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  modalContent: { backgroundColor: 'white', borderTopLeftRadius: 32, borderTopRightRadius: 32, height: '90%' },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 24, borderBottomWidth: 1, borderBottomColor: Colors.grayscale.offWhite },
  formGroup: { marginBottom: 16 },
  label: { fontSize: 12, fontFamily: 'Onest-Bold', marginBottom: 8, color: Colors.grayscale.darkGray },
  input: { backgroundColor: Colors.grayscale.offWhite, borderRadius: 12, height: 50, paddingHorizontal: 16, fontSize: 14, fontFamily: 'Onest-Medium' },
  aiInputRow: { flexDirection: 'row', gap: 8 },
  aiButton: { width: 50, height: 50, borderRadius: 12, backgroundColor: '#7E57C2', justifyContent: 'center', alignItems: 'center' },
  paramsHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 24, marginBottom: 16 },
  paramItem: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 16, backgroundColor: Colors.grayscale.offWhite, borderRadius: 16, marginBottom: 12 },
  paramInput: { borderBottomWidth: 1, borderBottomColor: Colors.grayscale.silver, fontSize: 13, paddingVertical: 4, fontFamily: 'Onest-Medium' }
});
