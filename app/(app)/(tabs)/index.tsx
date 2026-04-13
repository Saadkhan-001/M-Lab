import React, { useEffect, useState } from 'react';
import { View, StyleSheet, TouchableOpacity, TextInput, ScrollView, RefreshControl, Dimensions, Modal } from 'react-native';
import { useUser } from '@clerk/clerk-expo';
import { SafeAreaView } from 'react-native-safe-area-context';
import { doc, getDoc, setDoc, collection, query, where, limit, onSnapshot } from 'firebase/firestore';
import { db } from '../../../config/firebase';
import { useRouter } from 'expo-router';
import { Alert } from 'react-native';
import { Search, Bell, Menu, FlaskConical, LayoutGrid, UserPlus, FileText, PlusCircle, Clock, ChevronRight, X, CheckCircle2 } from 'lucide-react-native';
import { Colors } from '../../../constants/Colors';
import AppButton from '../../../components/AppButton';
import StatCarousel from '../../../components/StatCarousel';
import AppText from '../../../components/AppText';
import { useSubscription } from '../../../hooks/useSubscription';


const { width } = Dimensions.get('window');

export default function DashboardScreen() {
  const router = useRouter();
  const { isPro, loading: subLoading } = useSubscription();

  const { user } = useUser();
  const [greeting, setGreeting] = useState('');
  const [refreshing, setRefreshing] = useState(false);
  const [stats, setStats] = useState<any>({
    pendingTests: 0,
    doneTests: 0,
    accounting: { paid: 0, remaining: 0, discounted: 0 }
  });
  const [pendingReports, setPendingReports] = useState<any[]>([]);
  const [dashboardSearch, setDashboardSearch] = useState('');
  const [isNotificationsOpen, setIsNotificationsOpen] = useState(false);
  const [activities, setActivities] = useState<any[]>([]);

  // Greeting logic based on current hour
  useEffect(() => {
    const hour = new Date().getHours();
    if (hour >= 5 && hour < 12) setGreeting('Good Morning');
    else if (hour >= 12 && hour < 17) setGreeting('Good Afternoon');
    else setGreeting('Good Evening');
  }, []);

  // Sync user and check onboarding
  useEffect(() => {
    if (user?.id) {
      const syncUser = async () => {
        try {
          const userRef = doc(db, 'users', user.id);
          const userSnap = await getDoc(userRef);
          
          if (!userSnap.exists()) {
            await setDoc(userRef, {
              uid: user.id,
              email: user.primaryEmailAddress?.emailAddress || '',
              firstName: user.firstName || '',
              lastName: user.lastName || '',
              role: 'user',
              isOnboarded: false,
              hasSeenPaywall: false,
              createdAt: new Date()
            });
            router.replace('/(app)/onboarding');
          } else {
            const data = userSnap.data();
            if (data.isOnboarded !== true) {
              router.replace('/(app)/onboarding');
            } else if (!isPro && !data.hasSeenPaywall) {
              // Mark paywall as seen and redirect
              await setDoc(userRef, { hasSeenPaywall: true }, { merge: true });
              router.replace('/plans');
            }
          }
        } catch (error: any) {
           console.error("Firebase Sync Error: ", error);
        }
      };
      syncUser();
    }
  }, [user]);

  // Unified Real-time Listener for Dashboard
  useEffect(() => {
    if (!user?.id) return;

    const fetchDashboardData = async () => {
      try {
        const userRef = doc(db, 'users', user.id);
        const userSnap = await getDoc(userRef);
        
        if (userSnap.exists()) {
          const labId = userSnap.data().laboratoryId;
          if (!labId) return;

          // 1. Listen to Tests and Invoices in a combined manner if possible, or handle state updates carefully
          const testsRef = collection(db, 'laboratories', labId, 'tests');
          const invoicesRef = collection(db, 'laboratories', labId, 'invoices');

          const unsubTests = onSnapshot(testsRef, (snapshot) => {
            const allTests = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() as any }));
            const pending = allTests.filter(t => t.reportStatus === 'pending' || t.reportStatus === 'reviewing');
            const completed = allTests.filter(t => t.reportStatus === 'completed');
            
            const sortedPending = [...pending].sort((a,b) => (b.createdAt?.seconds || 0) - (a.createdAt?.seconds || 0));
            setPendingReports(sortedPending.slice(0, 5));

            setStats((prev: any) => ({
              ...prev,
              pendingTests: pending.length,
              doneTests: completed.length,
            }));
          });

          const unsubInvoices = onSnapshot(invoicesRef, (snapshot) => {
            const allInvoices = snapshot.docs.map(doc => doc.data());
            const paid = allInvoices.reduce((sum, inv) => sum + (inv.paid || 0), 0);
            const remaining = allInvoices.reduce((sum, inv) => sum + (inv.balance || 0), 0);
            const discounted = allInvoices.reduce((sum, inv) => sum + (inv.discount || 0), 0);

            setStats((prev: any) => ({
              ...prev,
              accounting: { paid, remaining, discounted }
            }));
          });

          // 3. Listen to Recent Activities (Last 10 activities)
          const activityRef = collection(db, 'laboratories', labId, 'tests');
          const unsubActivity = onSnapshot(activityRef, (snapshot) => {
            const logs = snapshot.docs.map(doc => {
              const d = doc.data();
              return {
                id: doc.id,
                title: d.reportStatus === 'completed' ? 'Test Verified' : 'New Test Registered',
                description: `${d.patientName} - ${d.testName}`,
                time: d.completedAt || d.createdAt,
                type: d.reportStatus
              };
            });
            setActivities(logs.sort((a,b) => (b.time?.seconds || 0) - (a.time?.seconds || 0)).slice(0, 10));
          });

          return () => {
             unsubTests();
             unsubInvoices();
             unsubActivity();
          };
        }
      } catch (error) {
        console.error("Dashboard Listener Error: ", error);
      }
    };

    fetchDashboardData();
  }, [user]);

  const onRefresh = React.useCallback(() => {
    setRefreshing(true);
    setTimeout(() => setRefreshing(false), 2000);
  }, []);

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <ScrollView 
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={Colors.primary.navy} />
        }
      >
        {/* Header Section */}
        <View style={styles.header}>
          <View style={styles.headerTopRow}>
            <View>
              <AppText variant="caption1" color={Colors.grayscale.darkGray} fontFamily="Onest-SemiBold">
                {greeting}
              </AppText>
              <AppText variant="title1" style={styles.userName}>
                {user?.firstName || 'User'}
              </AppText>
            </View>
            <View style={styles.headerIcons}>
              <TouchableOpacity style={styles.iconButton} onPress={() => setIsNotificationsOpen(true)}>
                <Bell size={22} color={Colors.primary.navy} strokeWidth={2.5} />
                {activities.length > 0 && <View style={styles.notificationBadge} />}
              </TouchableOpacity>
              <TouchableOpacity style={styles.iconButton} onPress={() => router.push('/(app)/(tabs)/settings')}>
                 <LayoutGrid size={22} color={Colors.primary.navy} strokeWidth={2.5} />
              </TouchableOpacity>
            </View>
          </View>

          {/* Search Bar */}
          <View style={styles.searchContainer}>
            <View style={styles.searchBar}>
              <Search size={22} color={Colors.grayscale.silver} style={styles.searchIcon} />
              <TextInput 
                placeholder="Search patients or tests..."
                placeholderTextColor={Colors.grayscale.silver}
                style={styles.searchInput}
                value={dashboardSearch}
                onChangeText={setDashboardSearch}
                onSubmitEditing={() => router.push({ pathname: '/(app)/(tabs)/patients', params: { q: dashboardSearch } })}
              />
            </View>
          </View>
        </View>

        {/* Real-time Stats Carousel */}
        <StatCarousel data={stats} />

        {/* Quick Actions Section */}
        <View style={styles.actionsSection}>
          <AppText variant="caption1" fontFamily="Onest-Bold" style={styles.sectionHeading}>Quick Actions</AppText>
          <View style={styles.actionsRow}>
            <TouchableOpacity 
              style={styles.actionButton}
              onPress={() => router.push('/(app)/(tabs)/billing')}
            >
              <View style={styles.actionIconContainer}>
                <UserPlus size={24} color={Colors.primary.navy} strokeWidth={2.5} />
              </View>
              <AppText variant="caption1" fontFamily="Onest-SemiBold" style={styles.actionLabel}>Register Patient</AppText>
            </TouchableOpacity>

            <TouchableOpacity 
              style={styles.actionButton}
              onPress={() => router.push('/(app)/(tabs)/results')}
            >
              <View style={styles.actionIconContainer}>
                <FileText size={24} color={Colors.primary.navy} strokeWidth={2.5} />
              </View>
              <AppText variant="caption1" fontFamily="Onest-SemiBold" style={styles.actionLabel}>Enter Result</AppText>
            </TouchableOpacity>

            <TouchableOpacity 
              style={styles.actionButton}
              onPress={() => router.push('/(app)/(tabs)/billing')}
            >
              <View style={styles.actionIconContainer}>
                <PlusCircle size={24} color={Colors.primary.navy} strokeWidth={2.5} />
              </View>
              <AppText variant="caption1" fontFamily="Onest-SemiBold" style={styles.actionLabel}>New Test</AppText>
            </TouchableOpacity>
          </View>
        </View>

        {/* Pending Reports Section */}
        <View style={styles.pendingSection}>
          <View style={styles.sectionHeader}>
            <AppText variant="caption1" fontFamily="Onest-Bold" style={styles.sectionHeading}>Pending Reports</AppText>
            <TouchableOpacity onPress={() => router.push('/(app)/(tabs)/results')}>
              <AppText variant="caption1" color={Colors.primary.skyBlue} fontFamily="Onest-SemiBold">View All</AppText>
            </TouchableOpacity>
          </View>
          
          <View style={styles.pendingList}>
            {pendingReports.map((report) => (
              <TouchableOpacity 
                key={report.id} 
                style={styles.pendingCard}
                onPress={() => router.push('/(app)/(tabs)/results')}
              >
                <View style={styles.pendingCardTop}>
                  <AppText variant="body" fontFamily="Onest-SemiBold" numberOfLines={1}>{report.patientName}</AppText>
                  <View style={styles.pendingBadge}>
                    <Clock size={12} color={Colors.primary.orange} />
                    <AppText variant="caption1" style={{ fontSize: 10, color: Colors.primary.orange, marginLeft: 4 }}>{report.time || 'Pending'}</AppText>
                  </View>
                </View>
                <AppText variant="caption1" color={Colors.grayscale.darkGray} style={{ marginTop: 4 }}>{report.testName}</AppText>
                <View style={styles.cardFooter}>
                  <AppText variant="caption1" color={Colors.message.success}>Payment Verified</AppText>
                  <ChevronRight size={16} color={Colors.grayscale.silver} />
                </View>
              </TouchableOpacity>
            ))}
          </View>
        </View>


      </ScrollView>

      {/* Notification Center Modal */}
      <Modal visible={isNotificationsOpen} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
               <AppText variant="title2">Notification Center</AppText>
               <TouchableOpacity onPress={() => setIsNotificationsOpen(false)}>
                  <X size={24} color="black" />
               </TouchableOpacity>
            </View>
            <ScrollView style={{ padding: 24 }}>
               {activities.length > 0 ? activities.map((act) => (
                 <View key={act.id} style={styles.activityItem}>
                    <View style={[styles.activityIcon, { backgroundColor: act.type === 'completed' ? '#E8F5E9' : '#E3F2FD' }]}>
                        {act.type === 'completed' ? <CheckCircle2 size={18} color="#2E7D32" /> : <Clock size={18} color="#1976D2" />}
                    </View>
                    <View style={{ flex: 1, marginLeft: 16 }}>
                       <AppText variant="body" fontFamily="Onest-Bold">{act.title}</AppText>
                       <AppText variant="caption1" color={Colors.grayscale.darkGray}>{act.description}</AppText>
                    </View>
                 </View>
               )) : (
                 <View style={{ alignItems: 'center', marginTop: 40 }}>
                    <Bell size={48} color={Colors.grayscale.lightGray} />
                    <AppText style={{ marginTop: 12 }} color={Colors.grayscale.darkGray}>No new notifications</AppText>
                 </View>
               )}
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
  header: { paddingHorizontal: 24, paddingTop: 10, marginBottom: 20 },
  headerTopRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 },
  userName: { color: Colors.primary.navy, fontSize: 24, fontFamily: 'Onest-Bold' },
  headerIcons: { flexDirection: 'row', gap: 12 },
  iconButton: { width: 44, height: 44, borderRadius: 12, backgroundColor: Colors.grayscale.offWhite, justifyContent: 'center', alignItems: 'center' },
  notificationBadge: { position: 'absolute', top: 12, right: 12, width: 8, height: 8, borderRadius: 4, backgroundColor: Colors.message.error, borderWidth: 1.5, borderColor: 'white' },
  searchContainer: { marginTop: 8 },
  searchBar: { flexDirection: 'row', alignItems: 'center', backgroundColor: Colors.grayscale.offWhite, borderRadius: 16, height: 56, paddingHorizontal: 16 },
  searchIcon: { marginRight: 12 },
  searchInput: { flex: 1, height: '100%', fontFamily: 'Onest-Medium', fontSize: 16, color: Colors.primary.navy },
  actionsSection: { paddingHorizontal: 24, marginTop: 10, marginBottom: 24 },
  sectionHeading: { color: Colors.grayscale.silver, textTransform: 'uppercase', letterSpacing: 1.5, marginBottom: 16, fontSize: 12, fontFamily: 'Onest-Bold' },
  actionsRow: { flexDirection: 'row', justifyContent: 'space-between' },
  actionButton: { width: (width - 64) / 3, alignItems: 'center' },
  actionIconContainer: { width: 64, height: 64, borderRadius: 24, backgroundColor: Colors.grayscale.offWhite, justifyContent: 'center', alignItems: 'center', marginBottom: 8 },
  actionLabel: { color: Colors.primary.navy, textAlign: 'center', fontSize: 12 },
  pendingSection: { paddingHorizontal: 24 },
  sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
  pendingList: { gap: 12 },
  pendingCard: { backgroundColor: Colors.grayscale.white, borderRadius: 24, padding: 16, borderWidth: 1, borderColor: Colors.grayscale.offWhite },
  pendingCardTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  statusBadge: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8, backgroundColor: '#FFF3E0', flexDirection: 'row', alignItems: 'center' },
  statusText: { color: '#EF6C00', fontSize: 10, fontFamily: 'Onest-Bold', marginLeft: 4 },
  pendingCardBottom: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 12, paddingTop: 12, borderTopWidth: 1, borderTopColor: Colors.grayscale.offWhite },
  testNameText: { color: Colors.primary.navy, fontSize: 14, fontFamily: 'Onest-SemiBold' },
  timeInfo: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  pendingBadge: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#FFF3E0', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8 },
  cardFooter: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 12, paddingTop: 12, borderTopWidth: 1, borderTopColor: Colors.grayscale.offWhite },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  modalContent: { backgroundColor: 'white', borderTopLeftRadius: 32, borderTopRightRadius: 32, height: '70%' },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 24, borderBottomWidth: 1, borderBottomColor: Colors.grayscale.offWhite },
  activityItem: { flexDirection: 'row', alignItems: 'center', marginBottom: 20, paddingBottom: 16, borderBottomWidth: 1, borderBottomColor: Colors.grayscale.offWhite },
  activityIcon: { width: 44, height: 44, borderRadius: 14, justifyContent: 'center', alignItems: 'center' },
});
