import { ChevronDown, MapPin } from 'lucide-react-native';
import React from 'react';
import { Image, Text, TouchableOpacity, View } from 'react-native';

interface HeaderProps {
  location?: string;
  onLocationPress?: () => void;
}

export default function Header({ location = 'Home', onLocationPress }: HeaderProps) {
  return (
    <View className="flex-row items-center justify-between px-4 py-4 bg-white shadow-sm z-10">
      <View className="flex-row items-center">
        {/* Logo */}
        <Image 
          source={require('../../assets/logos/worli_blue.png')}
          style={{ height: 40, width: 120 }}
          resizeMode="contain"
        />
      </View>

      <TouchableOpacity 
        className="flex-row items-center gap-2 bg-primary-cream rounded-full px-4 py-2 active:opacity-80"
        onPress={onLocationPress}
      >
        <MapPin color="#101B53" size={16} />
        <Text className="font-comfortaa text-sm text-primary-navy font-semibold">
          {location}
        </Text>
        <ChevronDown color="#101B53" size={16} />
      </TouchableOpacity>
    </View>
  );
}
