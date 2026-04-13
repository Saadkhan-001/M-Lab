import React, { useState, useEffect } from 'react';
import { View, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator, Alert, Dimensions, Platform } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Check, X, Crown, Sparkles, ReceiptText, ShieldCheck, ArrowLeft, Zap } from 'lucide-react-native';
import Purchases, { PurchasesPackage } from 'react-native-purchases';
import { useRouter } from 'expo-router';
import { Colors } from '../../constants/Colors';
import AppText from '../../components/AppText';
import AppButton from '../../components/AppButton';
import { useSubscription } from '../../hooks/useSubscription';

const { width } = Dimensions.get('window');

export default function PlansScreen() {
  const router = useRouter();
  const { isPro } = useSubscription();
  const [offerings, setOfferings] = useState<PurchasesPackage[]>([]);
  const [loading, setLoading] = useState(true);
  const [purchasingId, setPurchasingId] = useState<string | null>(null);

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
      if (customerInfo.entitlements.active['pro']) {
        Alert.alert("Success!", "You are now a PRO member. Your lab's AI is fully unlocked!");
        router.replace('/(app)/(tabs)');
      } else {
        // Handle case where purchase went through but entitlement isn't active
        Alert.alert("Note", "Purchase completed. Refreshing status...");
        router.replace('/(app)/(tabs)');
      }
    } catch (e: any) {
      if (!e.userCancelled) {
        Alert.alert("Payment Failed", "We couldn't process your transaction. Please check your bank and try again.");
        router.replace('/(app)/(tabs)');
      }
    } finally {
      setPurchasingId(null);
    }
  };

  const FeatureRow = ({ text }: { text: string }) => (
    <View style={styles.featureRow}>
      <View style={styles.checkBadge}><Check size={14} color="white" /></View>
      <AppText variant="body" style={{ marginLeft: 12 }}>{text}</AppText>
    </View>
  );

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <ArrowLeft size={24} color={Colors.primary.navy} />
        </TouchableOpacity>
        <AppText variant="title2">Lab Membership</AppText>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        <View style={styles.hero}>
          <View style={styles.crownContainer}>
            <Crown size={40} color={Colors.primary.orange} />
          </View>
          <AppText variant="title1" style={styles.heroTitle}>Level Up Your Lab</AppText>
          <AppText variant="body" color={Colors.grayscale.darkGray} style={styles.heroSub}>Unlock professional tools used by 500+ labs worldwide.</AppText>
        </View>

        <View style={styles.perksCard}>
           <FeatureRow text="Unlimited AI Parameter Discovery" />
           <FeatureRow text="Custom Invoice Branding & Logo" />
           <FeatureRow text="Advanced CRM & Analytics" />
           <FeatureRow text="Priority Multi-Device Sync" />
        </View>

        {loading ? (
          <ActivityIndicator size="large" color={Colors.primary.navy} style={{ marginTop: 40 }} />
        ) : (
          <View style={styles.plansContainer}>
            {offerings.length > 0 ? offerings.map((pkg, idx) => (
              <TouchableOpacity 
                key={pkg.identifier} 
                style={[styles.planCard, idx === 1 && styles.highlightedCard]}
                onPress={() => handlePurchase(pkg)}
                disabled={!!purchasingId || isPro}
              >
                {idx === 1 && <View style={styles.bestValueBadge}><AppText variant="caption1" fontFamily="Onest-Bold" color="white">BEST VALUE</AppText></View>}
                <View style={styles.planHeader}>
                  <AppText variant="title2">{pkg.product.title.split('(')[0].trim()}</AppText>
                  <AppText variant="title1" color={Colors.primary.navy}>{pkg.product.priceString}</AppText>
                </View>
                <AppButton 
                  title={isPro ? "ALREADY ACTIVE" : (purchasingId === pkg.identifier ? "Processing..." : "Upgrade Now")} 
                  onPress={() => handlePurchase(pkg)}
                  disabled={!!purchasingId || isPro}
                  buttonStyle={{ marginTop: 20 }}
                />
              </TouchableOpacity>
            )) : (
              // Fallback UI if no packages are configured in RevenueCat yet
              <View style={styles.planCard}>
                <AppText variant="title3">Standard Pro Plan</AppText>
                <AppText variant="caption1" color={Colors.grayscale.darkGray} style={{ marginTop: 8 }}>Configuration Pending in RevenueCat Dashboard</AppText>
                <AppButton title="Unavailable" disabled buttonStyle={{ marginTop: 20 }} />
              </View>
            )}
          </View>
        )}

        <TouchableOpacity style={styles.restoreBtn} onPress={async () => {
             try { await Purchases.restorePurchases(); Alert.alert("Restored", "Your purchases have been synchronized."); } catch(e) {}
        }}>
          <AppText variant="caption1" color={Colors.grayscale.silver}>Already have a plan? Restore Purchases</AppText>
        </TouchableOpacity>
        
        <View style={{ height: 40 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.grayscale.white },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 24, paddingVertical: 16 },
  backButton: { width: 40, height: 40, borderRadius: 12, backgroundColor: Colors.grayscale.offWhite, justifyContent: 'center', alignItems: 'center' },
  scrollContent: { paddingHorizontal: 24, paddingBottom: 40 },
  hero: { alignItems: 'center', marginTop: 20, marginBottom: 32 },
  crownContainer: { width: 80, height: 80, borderRadius: 30, backgroundColor: '#FFF9C4', justifyContent: 'center', alignItems: 'center', marginBottom: 16 },
  heroTitle: { textAlign: 'center', color: Colors.primary.navy },
  heroSub: { textAlign: 'center', marginTop: 8, paddingHorizontal: 20 },
  perksCard: { backgroundColor: Colors.grayscale.offWhite, borderRadius: 24, padding: 24, marginBottom: 32 },
  featureRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 16 },
  checkBadge: { width: 24, height: 24, borderRadius: 12, backgroundColor: Colors.message.success, justifyContent: 'center', alignItems: 'center' },
  plansContainer: { gap: 16 },
  planCard: { backgroundColor: 'white', borderRadius: 28, padding: 24, borderWidth: 1, borderColor: Colors.grayscale.lightGray, position: 'relative', overflow: 'hidden' },
  highlightedCard: { borderColor: Colors.primary.navy, borderWidth: 2, backgroundColor: '#F0F7FF' },
  bestValueBadge: { position: 'absolute', top: 0, right: 0, backgroundColor: Colors.primary.navy, paddingHorizontal: 16, paddingVertical: 6, borderBottomLeftRadius: 16 },
  planHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  restoreBtn: { marginTop: 32, alignItems: 'center' }
});
