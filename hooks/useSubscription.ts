import { useState, useEffect } from 'react';
import Purchases, { CustomerInfo } from 'react-native-purchases';
import { Platform } from 'react-native';
import { REVENUECAT_CONFIG } from '../config/RevenueCatConfig';

export function useSubscription() {
  const [isPro, setIsPro] = useState(false);
  const [loading, setLoading] = useState(true);
  const [planName, setPlanName] = useState<string | null>(null);
  const [customerInfo, setCustomerInfo] = useState<CustomerInfo | null>(null);
  const [tierLevel, setTierLevel] = useState<0 | 1 | 2 | 3>(0);

  const getPlanInfo = (info: CustomerInfo) => {
    const activeEntitlement = info.entitlements.active[REVENUECAT_CONFIG.ENTITLEMENT_ID];
    if (!activeEntitlement) return { name: null, level: 0 as const };

    const productId = activeEntitlement.productIdentifier.toLowerCase();
    
    if (productId.includes('elite')) return { name: 'Elite Member', level: 3 as const };
    if (productId.includes('professional')) return { name: 'Professional Pro', level: 2 as const };
    if (productId.includes('starter')) return { name: 'Starter Pro', level: 1 as const };
    
    // Fallback for legacy IDs
    if (productId.includes('monthly') || productId.includes('yearly')) return { name: 'Pro Member', level: 2 as const };
    
    return { name: 'Pro Member', level: 2 as const };
  };

  useEffect(() => {
    const checkStatus = async () => {
      try {
        const info = await Purchases.getCustomerInfo();
        setCustomerInfo(info);
        const { name, level } = getPlanInfo(info);
        setIsPro(level > 0);
        setPlanName(name);
        setTierLevel(level);
      } catch (e) {
        console.error('Subscription Check Error:', e);
      } finally {
        setLoading(false);
      }
    };

    checkStatus();

    const listener = (info: CustomerInfo) => {
      setCustomerInfo(info);
      const { name, level } = getPlanInfo(info);
      setIsPro(level > 0);
      setPlanName(name);
      setTierLevel(level);
    };

    Purchases.addCustomerInfoUpdateListener(listener);
    
    return () => {
      // In latest react-native-purchases, the listener removal is handled differently
    };
  }, []);

  return { isPro, loading, planName, customerInfo, tierLevel };
}
