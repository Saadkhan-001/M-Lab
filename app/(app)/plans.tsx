import React, { useState, useEffect } from 'react';
import { View, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator, Alert, Dimensions, Platform, Animated } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Check, X, Crown, Sparkles, ReceiptText, ShieldCheck, ArrowLeft, Zap, Star, Shield, Gem } from 'lucide-react-native';
import Purchases, { PurchasesPackage } from 'react-native-purchases';
import { useRouter } from 'expo-router';
import { Colors } from '../../constants/Colors';
import AppText from '../../components/AppText';
import AppButton from '../../components/AppButton';
import { useSubscription } from '../../hooks/useSubscription';
import { useUser } from '@clerk/clerk-expo';
import { doc, getDoc, updateDoc } from 'firebase/firestore';
import { db } from '../../config/firebase';
import { REVENUECAT_CONFIG } from '../../config/RevenueCatConfig';

const { width } = Dimensions.get('window');

const PLAN_LEVELS = [
  {
    id: 'starter',
    name: 'Starter',
    icon: Zap,
    color: '#4FC3F7',
    tagline: 'For Small clinics',
    features: ['Unlimited Patients', '100 Tests/Month', 'Basic Invoicing', 'Cloud Backup'],
    monthlyPrice: '£15',
    yearlyPrice: '£150',
  },
  {
    id: 'professional',
    name: 'Professional',
    icon: Sparkles,
    color: Colors.primary.navy,
    tagline: 'Most Popular Choice',
    features: ['AI Parameter Discovery', 'Custom Lab Branding', 'Financial Analytics', 'WhatsApp Automation'],
    monthlyPrice: '£45',
    yearlyPrice: '£450',
    highlight: true,
  },
  {
    id: 'elite',
    name: 'Elite',
    icon: Gem,
    color: '#FFD700',
    tagline: 'Multi-branch Lab',
    features: ['Priority Support', 'Multi-User Access', 'Custom Domain Links', 'Advanced Security'],
    monthlyPrice: '£95',
    yearlyPrice: '£950',
  }
];

export default function PlansScreen() {
  const router = useRouter();
  const { isPro } = useSubscription();
  const { user } = useUser();
  const [offerings, setOfferings] = useState<PurchasesPackage[]>([]);
  const [loading, setLoading] = useState(true);
  const [purchasingId, setPurchasingId] = useState<string | null>(null);
  const [billingCycle, setBillingCycle] = useState<'monthly' | 'yearly'>('yearly');

  const syncSubscriptionToDatabase = async (customerInfo: any) => {
    if (!user?.id) return;
    try {
      const activeEntitlement = customerInfo.entitlements.active[REVENUECAT_CONFIG.ENTITLEMENT_ID];
      const isCurrentlyPro = !!activeEntitlement;
      
      let planDisplayName = 'FREE PLAN';
      if (activeEntitlement) {
         const productId = activeEntitlement.productIdentifier;
         if (productId.includes('starter')) planDisplayName = 'Starter Pro';
         else if (productId.includes('elite')) planDisplayName = 'Elite Pro';
         else planDisplayName = 'Professional Pro';
      }

      const userRef = doc(db, 'users', user.id);
      await updateDoc(userRef, {
        isPro: isCurrentlyPro,
        planName: planDisplayName,
        subscriptionUpdatedAt: new Date().toISOString()
      });

      const userSnap = await getDoc(userRef);
      const labId = userSnap.data()?.laboratoryId;
      if (labId) {
        await updateDoc(doc(db, 'laboratories', labId), {
           isPro: isCurrentlyPro,
           planName: planDisplayName,
        });
      }
    } catch(e) { console.error(e); }
  };

  useEffect(() => {
    const fetchOfferings = async () => {
      try {
        const offerings = await Purchases.getOfferings();
        if (offerings.current && offerings.current.availablePackages.length > 0) {
          setOfferings(offerings.current.availablePackages);
        }
      } catch (e) {
        console.error('Fetch Offerings Error:', e);
      } finally {
        setLoading(false);
      }
    };
    fetchOfferings();
  }, []);

  const handlePurchase = async (pkg: PurchasesPackage) => {
    setPurchasingId(pkg.identifier);
    try {
      const { customerInfo } = await Purchases.purchasePackage(pkg);
      if (customerInfo.entitlements.active[REVENUECAT_CONFIG.ENTITLEMENT_ID]) {
        await syncSubscriptionToDatabase(customerInfo);
        Alert.alert("Success!", "You are now a PRO member!");
        router.replace('/(app)/(tabs)');
      }
    } catch (e: any) {
      if (!e.userCancelled) {
        Alert.alert("Payment Failed", "Could not process transaction.");
      }
    } finally {
      setPurchasingId(null);
    }
  };

  const FeatureRow = ({ text, color }: { text: string, color: string }) => (
    <View style={styles.featureRow}>
      <Check size={16} color={color} strokeWidth={3} />
      <AppText variant="caption1" fontFamily="Onest-Medium" style={{ marginLeft: 10, color: Colors.grayscale.black }}>{text}</AppText>
    </View>
  );

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <ArrowLeft size={24} color={Colors.primary.navy} />
        </TouchableOpacity>
        <AppText variant="title3">Lab Membership</AppText>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        <View style={styles.hero}>
          <AppText variant="title1" style={styles.heroTitle}>Choose Your Plan</AppText>
          <AppText variant="body" color={Colors.grayscale.darkGray} style={styles.heroSub}>Unlock professional lab automation tools.</AppText>
        </View>

        {/* Billing Toggle */}
        <View style={styles.toggleWrapper}>
          <TouchableOpacity 
            style={[styles.toggleBtn, billingCycle === 'monthly' && styles.toggleBtnActive]} 
            onPress={() => setBillingCycle('monthly')}
          >
            <AppText variant="caption1" fontFamily="Onest-Bold" color={billingCycle === 'monthly' ? 'white' : Colors.grayscale.darkGray}>Monthly</AppText>
          </TouchableOpacity>
          <TouchableOpacity 
            style={[styles.toggleBtn, billingCycle === 'yearly' && styles.toggleBtnActive]} 
            onPress={() => setBillingCycle('yearly')}
          >
            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
              <AppText variant="caption1" fontFamily="Onest-Bold" color={billingCycle === 'yearly' ? 'white' : Colors.grayscale.darkGray}>Yearly</AppText>
              <View style={styles.saveBadge}>
                <AppText variant="caption1" style={{ fontSize: 8, color: 'white' }}>SAVE 20%</AppText>
              </View>
            </View>
          </TouchableOpacity>
        </View>

        {loading ? (
          <ActivityIndicator size="large" color={Colors.primary.navy} style={{ marginTop: 40 }} />
        ) : (
          <View style={styles.plansList}>
            {PLAN_LEVELS.map((plan) => {
              // Try to find the matching RevenueCat package
              const matchedPkg = offerings.find(p => 
                p.identifier.toLowerCase().includes(plan.id) && 
                p.identifier.toLowerCase().includes(billingCycle)
              ) || (offerings.length > 0 ? (billingCycle === 'monthly' ? offerings[0] : offerings[1] || offerings[0]) : null);

              const isCurrentLevel = false; // logic for current subscription level if needed

              return (
                <View key={plan.id} style={[styles.planCard, plan.highlight && styles.highlightedCard]}>
                  {plan.highlight && (
                    <View style={styles.bestValueBadge}>
                      <Star size={12} color="white" />
                      <AppText variant="caption1" fontFamily="Onest-Bold" color="white" style={{ marginLeft: 4 }}>RECOMMENDED</AppText>
                    </View>
                  )}
                  
                  <View style={styles.planCardHeader}>
                    <View style={[styles.planIcon, { backgroundColor: `${plan.color}20` }]}>
                      <plan.icon size={24} color={plan.color} />
                    </View>
                    <View>
                      <AppText variant="title2">{plan.name}</AppText>
                      <AppText variant="caption1" color={Colors.grayscale.darkGray}>{plan.tagline}</AppText>
                    </View>
                  </View>

                  <View style={styles.priceContainer}>
                    <AppText variant="title1" color={Colors.primary.navy}>
                      {matchedPkg ? matchedPkg.product.priceString : (billingCycle === 'monthly' ? plan.monthlyPrice : plan.yearlyPrice)}
                    </AppText>
                    <AppText variant="caption1" color={Colors.grayscale.silver} style={{ marginLeft: 6 }}>
                      / {billingCycle === 'monthly' ? 'mo' : 'yr'}
                    </AppText>
                  </View>

                  <View style={styles.featureList}>
                    {plan.features.map((f, i) => <FeatureRow key={i} text={f} color={plan.color} />)}
                  </View>

                  <AppButton 
                    title={isPro ? "ALREADY ACTIVE" : (purchasingId === matchedPkg?.identifier ? "Processing..." : "Select Plan")} 
                    onPress={() => matchedPkg && handlePurchase(matchedPkg)}
                    disabled={!!purchasingId || isPro || !matchedPkg}
                    buttonStyle={[styles.planBtn, plan.highlight && { backgroundColor: Colors.primary.navy }]}
                    textStyle={plan.highlight ? { color: 'white' } : { color: Colors.primary.navy }}
                  />
                </View>
              );
            })}
          </View>
        )}

        <TouchableOpacity 
          style={styles.restoreBtn} 
          onPress={async () => {
            try { 
              const customerInfo = await Purchases.restorePurchases(); 
              await syncSubscriptionToDatabase(customerInfo);
              Alert.alert("Restored", "Your subscription is now active!"); 
            } catch(e) {}
          }}
        >
          <AppText variant="caption1" color={Colors.grayscale.silver}>Have a subscription? Restore here</AppText>
        </TouchableOpacity>
        
        <View style={{ height: 60 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.grayscale.white },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 24, paddingVertical: 16 },
  backButton: { width: 40, height: 40, borderRadius: 12, backgroundColor: Colors.grayscale.offWhite, justifyContent: 'center', alignItems: 'center' },
  scrollContent: { paddingHorizontal: 24, paddingBottom: 40 },
  hero: { alignItems: 'center', marginTop: 10, marginBottom: 24 },
  heroTitle: { textAlign: 'center', color: Colors.primary.navy },
  heroSub: { textAlign: 'center', marginTop: 4, paddingHorizontal: 20 },
  toggleWrapper: { flexDirection: 'row', alignSelf: 'center', backgroundColor: Colors.grayscale.offWhite, borderRadius: 20, padding: 4, marginBottom: 32 },
  toggleBtn: { paddingHorizontal: 20, paddingVertical: 10, borderRadius: 16 },
  toggleBtnActive: { backgroundColor: Colors.primary.navy },
  saveBadge: { backgroundColor: Colors.primary.orange, paddingHorizontal: 6, paddingVertical: 2, borderRadius: 6, marginLeft: 6 },
  plansList: { gap: 20 },
  planCard: { backgroundColor: 'white', borderRadius: 28, padding: 24, borderWidth: 1, borderColor: Colors.grayscale.lightGray, position: 'relative' },
  highlightedCard: { borderColor: Colors.primary.navy, borderWidth: 2, shadowColor: Colors.primary.navy, shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.1, shadowRadius: 15, elevation: 5 },
  bestValueBadge: { position: 'absolute', top: -14, alignSelf: 'center', backgroundColor: Colors.primary.navy, paddingHorizontal: 12, paddingVertical: 6, borderRadius: 12, flexDirection: 'row', alignItems: 'center' },
  planCardHeader: { flexDirection: 'row', alignItems: 'center', gap: 16, marginBottom: 20 },
  planIcon: { width: 56, height: 56, borderRadius: 18, justifyContent: 'center', alignItems: 'center' },
  priceContainer: { flexDirection: 'row', alignItems: 'baseline', marginBottom: 24 },
  featureList: { gap: 14, marginBottom: 28 },
  featureRow: { flexDirection: 'row', alignItems: 'center' },
  planBtn: { height: 54, borderRadius: 16, backgroundColor: Colors.grayscale.offWhite },
  restoreBtn: { marginTop: 40, alignItems: 'center' }
});
