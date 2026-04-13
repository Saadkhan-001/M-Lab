import React, { useEffect, useState } from 'react';
import { View, StyleSheet, TouchableOpacity, TextInput, ScrollView, RefreshControl, Dimensions } from 'react-native';
import { useUser } from '@clerk/clerk-expo';
import { SafeAreaView } from 'react-native-safe-area-context';
import { doc, getDoc, setDoc, collection, query, where, limit, onSnapshot } from 'firebase/firestore';
import { db } from '../../../config/firebase';
import { useRouter } from 'expo-router';
import { Alert } from 'react-native';
import { Search, Bell, Menu, FlaskConical, LayoutGrid, UserPlus, FileText, PlusCircle, Clock, ChevronRight } from 'lucide-react-native';
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
  const [stats, setStats] = useState<any>(null);
  const [pendingReports, setPendingReports] = useState<any[]>([]);

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

          // 1. Listen to Tests Collection
          const testsRef = collection(db, 'laboratories', labId, 'tests');
          const unsubscribeTests = onSnapshot(testsRef, (snapshot) => {
            const allTests = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() as any }));
            
            const pending = allTests.filter(t => t.reportStatus === 'pending' || t.reportStatus === 'reviewing');
            const completed = allTests.filter(t => t.reportStatus === 'completed');
            
            // Show recent pending tests in the list
            const sortedPending = [...pending].sort((a,b) => (b.createdAt?.seconds || 0) - (a.createdAt?.seconds || 0));
            setPendingReports(sortedPending.slice(0, 5));

            setStats((prev: any) => ({
              ...prev,
              pendingTests: pending.length,
              doneTests: completed.length,
              accounting: prev?.accounting || { paid: 0, remaining: 0, discounted: 0 }
            }));
          });

          // 2. Listen to Invoices for Financial Summary
          const invoicesRef = collection(db, 'laboratories', labId, 'invoices');
          const unsubscribeInvoices = onSnapshot(invoicesRef, (snapshot) => {
            const allInvoices = snapshot.docs.map(doc => doc.data());
            
            const paid = allInvoices.reduce((sum, inv) => sum + (inv.paid || 0), 0);
            const remaining = allInvoices.reduce((sum, inv) => sum + (inv.balance || 0), 0);
            const discounted = allInvoices.reduce((sum, inv) => sum + (inv.discount || 0), 0);

            setStats((prev: any) => ({
              pendingTests: prev?.pendingTests || 0,
              doneTests: prev?.doneTests || 0,
              accounting: { paid, remaining, discounted }
            }));
          });

          return () => {
            unsubscribeTests();
            unsubscribeInvoices();
          };
        }
      } catch (error) {
        console.error("Dashboard Listener Error: ", error);
      }
    };

    let cleanup: any;
    fetchDashboardData().then(fn => cleanup = fn);

    return () => {
      if (cleanup) cleanup();
    };
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
              <TouchableOpacity style={styles.iconButton}>
                <Search size={22} color={Colors.primary.navy} strokeWidth={2.5} />
              </TouchableOpacity>
              <TouchableOpacity style={styles.iconButton}>
                <Bell size={22} color={Colors.primary.navy} strokeWidth={2.5} />
                <View style={styles.notificationBadge} />
              </TouchableOpacity>
            </View>
          </View>

          {/* Search Bar */}
          <View style={styles.searchContainer}>
            <View style={styles.searchBar}>
              <Search size={20} color={Colors.grayscale.silver} style={styles.searchIcon} />
              <TextInput 
                placeholder="Search patients or tests..."
                placeholderTextColor={Colors.grayscale.silver}
                style={styles.searchInput}
              />
              <TouchableOpacity style={styles.filterButton}>
                <LayoutGrid size={18} color={Colors.primary.navy} />
              </TouchableOpacity>
            </View>
          </View>
        </View>

        {/* Real-time Stats Carousel */}
        {stats && <StatCarousel data={stats} />}

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
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.grayscale.white,
  },
  scrollContent: {
    paddingBottom: 40,
  },
  header: {
    paddingHorizontal: 24,
    paddingTop: 10,
    paddingBottom: 20,
    backgroundColor: Colors.grayscale.white,
  },
  headerTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  userName: {
    color: Colors.primary.navy,
  },
  headerIcons: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  iconButton: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: Colors.grayscale.lightGray,
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 12,
  },
  notificationBadge: {
    position: 'absolute',
    top: 12,
    right: 12,
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: Colors.message.error,
    borderWidth: 1.5,
    borderColor: Colors.grayscale.white,
  },
  searchContainer: {
    marginTop: 20,
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.grayscale.lightGray,
    borderRadius: 16,
    height: 54,
    paddingHorizontal: 16,
  },
  searchIcon: {
    marginRight: 12,
  },
  searchInput: {
    flex: 1,
    height: '100%',
    fontFamily: 'Onest-Medium',
    fontSize: 15,
    color: Colors.primary.navy,
  },
  filterButton: {
    width: 32,
    height: 32,
    borderRadius: 8,
    backgroundColor: Colors.grayscale.white,
    justifyContent: 'center',
    alignItems: 'center',
  },
  actionsSection: {
    marginTop: 24,
    paddingHorizontal: 24,
  },
  sectionHeading: {
    color: Colors.grayscale.silver,
    textTransform: 'uppercase',
    marginBottom: 16,
    letterSpacing: 0.5,
  },
  actionsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  actionButton: {
    alignItems: 'center',
    width: (width - 48 - 32) / 3, // Screen width minus padding minus gaps
  },
  actionIconContainer: {
    width: 60,
    height: 60,
    borderRadius: 18,
    backgroundColor: Colors.grayscale.lightGray,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.5)',
  },
  actionLabel: {
    color: Colors.primary.navy,
    textAlign: 'center',
    fontSize: 11,
  },
  pendingSection: {
    marginTop: 32,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 24,
    marginBottom: 16,
  },
  pendingList: {
    paddingHorizontal: 24,
    paddingBottom: 10,
  },
  pendingCard: {
    backgroundColor: Colors.grayscale.white,
    borderRadius: 20,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: Colors.grayscale.lightGray,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 10,
    elevation: 2,
  },
  pendingCardTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  pendingBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(243, 137, 29, 0.1)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  cardFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: Colors.grayscale.offWhite,
  },
  footer: {
    alignItems: 'center',
    marginTop: 20,
  }
});
