import React from 'react';
import { Text, TextProps, StyleSheet, StyleProp, TextStyle } from 'react-native';
import { Colors } from '../constants/Colors';

interface AppTextProps extends TextProps {
  variant?: 'largeTitle' | 'title1' | 'title2' | 'title3' | 'headline' | 'body' | 'caption1';
  fontFamily?: 'Onest-Regular' | 'Onest-Medium' | 'Onest-SemiBold' | 'Onest-Bold';
  color?: string;
  style?: StyleProp<TextStyle>;
}

export default function AppText({ 
  variant = 'body', 
  fontFamily,
  color = Colors.grayscale.black, 
  style, 
  ...props 
}: AppTextProps) {
  
  const getVariantStyle = (): TextStyle => {
    switch (variant) {
      case 'largeTitle':
        return { fontSize: 34, fontFamily: 'Onest-Bold', lineHeight: 41 };
      case 'title1':
        return { fontSize: 28, fontFamily: 'Onest-Bold', lineHeight: 34 };
      case 'title2':
        return { fontSize: 22, fontFamily: 'Onest-Bold', lineHeight: 28 };
      case 'title3':
        return { fontSize: 20, fontFamily: 'Onest-SemiBold', lineHeight: 25 };
      case 'headline':
        return { fontSize: 17, fontFamily: 'Onest-SemiBold', lineHeight: 22 };
      case 'body':
        return { fontSize: 16, fontFamily: 'Onest-Regular', lineHeight: 24 };
      case 'caption1':
        return { fontSize: 12, fontFamily: 'Onest-Medium', lineHeight: 16 };
      default:
        return { fontSize: 16, fontFamily: 'Onest-Regular' };
    }
  };

  const baseStyle = getVariantStyle();
  
  // Override font family if explicitly provided
  if (fontFamily) {
    baseStyle.fontFamily = fontFamily;
  }

  return (
    <Text 
      style={[baseStyle, { color }, style]} 
      {...props}
    />
  );
}
