import React from 'react';
import { TouchableOpacity, Text, StyleSheet, TouchableOpacityProps, StyleProp, ViewStyle, TextStyle } from 'react-native';
import { Colors } from '../constants/Colors';

interface AppButtonProps extends TouchableOpacityProps {
  title: string;
  variant?: 'primary' | 'outline' | 'ghost';
  size?: 'large' | 'medium' | 'small';
  buttonStyle?: StyleProp<ViewStyle>;
  textStyle?: StyleProp<TextStyle>;
}

export default function AppButton({ 
  title, 
  variant = 'primary', 
  size = 'large', 
  buttonStyle, 
  textStyle, 
  ...props 
}: AppButtonProps) {
  
  const getContainerStyle = () => {
    let style: any = { ...styles.baseButton };
    
    // Size logic
    if (size === 'large') style.height = 56;
    if (size === 'medium') style.height = 48;
    if (size === 'small') style.height = 40;

    // Variant logic
    if (variant === 'primary') {
      style.backgroundColor = Colors.primary.navy;
      style.borderWidth = 0;
    } else if (variant === 'outline') {
      style.backgroundColor = Colors.grayscale.white;
      style.borderWidth = 1.5;
      style.borderColor = Colors.primary.navy;
    } else if (variant === 'ghost') {
      style.backgroundColor = Colors.grayscale.lightGray;
      style.borderWidth = 0;
    }
    
    return style;
  };

  const getTextStyle = () => {
    let style: any = { ...styles.baseText };
    
    if (variant === 'primary') {
      style.color = Colors.grayscale.white;
    } else if (variant === 'outline') {
      style.color = Colors.primary.navy;
    } else if (variant === 'ghost') {
      style.color = Colors.primary.navy;
    }

    if (size === 'small') style.fontSize = 14;
    return style;
  };

  return (
    <TouchableOpacity 
      style={[getContainerStyle(), buttonStyle]} 
      activeOpacity={0.8}
      {...props}
    >
      <Text style={[getTextStyle(), textStyle]}>{title}</Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  baseButton: {
    borderRadius: 8, // Matches the slightly rounded pill edges in the figma
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 16,
  },
  baseText: {
    fontSize: 16,
    fontWeight: '700',
    fontFamily: 'Onest-Bold',
  }
});
