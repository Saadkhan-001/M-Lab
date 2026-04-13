import React, { useRef, useState, useEffect } from 'react';
import { View, StyleSheet, FlatList, Dimensions, Animated } from 'react-native';
import { Colors } from '../constants/Colors';
import AppText from './AppText';
import * as Localization from 'expo-localization';
import { ClipboardCheck, CreditCard, Activity } from 'lucide-react-native';

const { width } = Dimensions.get('window');
const CARD_WIDTH = width - 48; // Padding 24 on each side

interface StatData {
  pendingTests: number;
  doneTests: number;
  accounting: {
    paid: number;
    remaining: number;
    discounted: number;
  };
}

export default function StatCarousel({ data }: { data: StatData }) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const flatListRef = useRef<FlatList>(null);
  const locales = Localization.getLocales();
  const currencyCode = (locales && locales.length > 0) ? (locales[0].currencyCode || 'USD') : 'USD';
  const languageTag = (locales && locales.length > 0) ? (locales[0].languageTag || 'en-US') : 'en-US';

  const formatCurrency = (amt: number) => {
    try {
      return new Intl.NumberFormat(languageTag, {
        style: 'currency',
        currency: currencyCode,
        minimumFractionDigits: 0,
      }).format(amt);
    } catch (e) {
      return `${currencyCode} ${amt}`;
    }
  };

  const CARDS = [
    {
      id: 'pending',
      title: 'Pending Tests',
      value: data.pendingTests,
      label: 'Waiting for processing',
      icon: Activity,
      color: Colors.primary.navy,
      bg: 'rgba(95, 170, 220, 0.15)', // skyBlue tint
    },
    {
      id: 'done',
      title: 'Completed Tests',
      value: data.doneTests,
      label: 'Verified today',
      icon: ClipboardCheck,
      color: Colors.message.success,
      bg: 'rgba(49, 157, 62, 0.15)', // success tint
    },
    {
      id: 'billing',
      title: 'Financial Summary',
      isBilling: true,
      data: data.accounting || { paid: 0, remaining: 0, discounted: 0 },
      icon: CreditCard,
      color: Colors.primary.orange,
      bg: 'rgba(243, 137, 29, 0.15)', // orange tint
    }
  ];

  useEffect(() => {
    const interval = setInterval(() => {
      const nextIndex = (currentIndex + 1) % CARDS.length;
      flatListRef.current?.scrollToIndex({
        index: nextIndex,
        animated: true,
      });
      setCurrentIndex(nextIndex);
    }, 6000);

    return () => clearInterval(interval);
  }, [currentIndex]);

  const renderItem = ({ item }: { item: any }) => {
    if (item.isBilling) {
      return (
        <View style={[styles.card, { backgroundColor: item.bg }]}>
          <View style={styles.cardHeader}>
            <AppText variant="caption1" fontFamily="Onest-Bold" color={item.color}>{item.title}</AppText>
            <item.icon size={20} color={item.color} />
          </View>
          <View style={styles.billingRow}>
            <View style={styles.billingItem}>
              <AppText variant="caption1" color={Colors.grayscale.darkGray}>Paid</AppText>
              <AppText variant="body" fontFamily="Onest-Bold" color={Colors.message.success}>{formatCurrency(item.data?.paid || 0)}</AppText>
            </View>
            <View style={styles.billingItem}>
              <AppText variant="caption1" color={Colors.grayscale.darkGray}>Remaining</AppText>
              <AppText variant="body" fontFamily="Onest-Bold" color={Colors.message.error}>{formatCurrency(item.data?.remaining || 0)}</AppText>
            </View>
            <View style={styles.billingItem}>
              <AppText variant="caption1" color={Colors.grayscale.darkGray}>Discount</AppText>
              <AppText variant="body" fontFamily="Onest-Bold" color={Colors.primary.navy}>{formatCurrency(item.data?.discounted || 0)}</AppText>
            </View>
          </View>
        </View>
      );
    }

    return (
      <View style={[styles.card, { backgroundColor: item.bg }]}>
        <View style={styles.cardHeader}>
          <AppText variant="caption1" fontFamily="Onest-Bold" color={item.color}>{item.title}</AppText>
          <item.icon size={20} color={item.color} />
        </View>
        <AppText variant="title1" style={{ color: item.color, marginVertical: 4 }}>{item.value}</AppText>
        <AppText variant="caption1" color={Colors.grayscale.darkGray}>{item.label}</AppText>
      </View>
    );
  };

  return (
    <View style={styles.container}>
      <FlatList
        ref={flatListRef}
        data={CARDS}
        renderItem={renderItem}
        keyExtractor={(item) => item.id}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        snapToInterval={CARD_WIDTH + 16}
        decelerationRate="fast"
        getItemLayout={(_, index) => ({
          length: CARD_WIDTH + 16,
          offset: (CARD_WIDTH + 16) * index,
          index,
        })}
      />
      <View style={styles.pagination}>
        {CARDS.map((_, index) => (
          <View 
            key={index} 
            style={[
              styles.dot, 
              { backgroundColor: index === currentIndex ? Colors.primary.navy : Colors.grayscale.silver }
            ]} 
          />
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginTop: 20,
    paddingHorizontal: 24,
  },
  card: {
    width: CARD_WIDTH,
    height: 120,
    borderRadius: 20,
    padding: 20,
    marginRight: 16,
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.3)',
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  billingRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 8,
  },
  billingItem: {
    flex: 1,
  },
  pagination: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginTop: 12,
  },
  dot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    marginHorizontal: 4,
  }
});
