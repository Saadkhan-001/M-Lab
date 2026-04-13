import { useState, useEffect } from 'react';
import Purchases, { CustomerInfo } from 'react-native-purchases';
import { Platform } from 'react-native';
import { REVENUECAT_CONFIG } from '../config/RevenueCatConfig';

export function useSubscription() {
  const [isPro, setIsPro] = useState(false);
  const [loading, setLoading] = useState(true);
  const [planName, setPlanName] = useState<string | null>(null);
  const [customerInfo, setCustomerInfo] = useState<CustomerInfo | null>(null);

  const getPlanLabel = (info: CustomerInfo) => {
    const activeEntitlement = info.entitlements.active[REVENUECAT_CONFIG.ENTITLEMENT_ID];
    if (!activeEntitlement) return null;

    const productId = activeEntitlement.productIdentifier;
    
    // Map RevenueCat Product IDs to Display Names
    if (productId.includes('monthly')) return 'Monthly Pro';
    if (productId.includes('yearly')) return 'Yearly Pro';
    if (productId.includes('lifetime')) return 'Lifetime Pro';
    
    return 'Pro Member';
  };

  useEffect(() => {
    const checkStatus = async () => {
      try {
        const info = await Purchases.getCustomerInfo();
        setCustomerInfo(info);
        const hasEntitlement = !!info.entitlements.active[REVENUECAT_CONFIG.ENTITLEMENT_ID];
        setIsPro(hasEntitlement);
        setPlanName(getPlanLabel(info));
      } catch (e) {
        console.error('Subscription Check Error:', e);
      } finally {
        setLoading(false);
      }
    };

    checkStatus();

    // Listen for changes (purchases, renewals)
    const listener = (info: CustomerInfo) => {
      setCustomerInfo(info);
      setIsPro(!!info.entitlements.active[REVENUECAT_CONFIG.ENTITLEMENT_ID]);
      setPlanName(getPlanLabel(info));
    };

    Purchases.addCustomerInfoUpdateListener(listener);
    
    return () => {
      // In latest react-native-purchases, the listener removal is handled differently
      // but keeping it structural for best practice
    };
  }, []);

  return { isPro, loading, planName, customerInfo };
}
