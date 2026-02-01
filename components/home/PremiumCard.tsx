import { Zap } from 'lucide-react-native';
import React from 'react';
import { Text, TouchableOpacity, View } from 'react-native';

interface PremiumCardProps {
  onPress: () => void;
}

export default function PremiumCard({ onPress }: PremiumCardProps) {
  return (
    <View className="mx-6 mb-6">
      <View className="bg-primary-navy rounded-2xl p-7 relative overflow-hidden shadow-md">
        {/* Background decorations */}
        <View className="absolute -top-8 -right-8 w-32 h-32 rounded-3xl bg-secondary-gold/15" />
        <View className="absolute -bottom-5 right-10 w-20 h-20 rounded-3xl bg-secondary-skyBlue/10" />

        <View className="w-14 h-14 rounded-2xl bg-primary-orange items-center justify-center mb-4">
          <Zap size={26} color="#FFFFFF" />
        </View>
        <Text className="font-sofia-bold text-2xl text-white mb-2">
          Premium Benefits
        </Text>
        <Text className="font-comfortaa text-sm text-neutral-lightGray mb-6 leading-5">
          Earn ₹50 cashback on every ₹500 recharge. Limited time offer!
        </Text>
        <TouchableOpacity
          className="bg-primary-orange rounded-xl py-3 px-6 self-start active:opacity-90 shadow-sm"
          onPress={onPress}
        >
          <Text className="font-sofia-bold text-sm text-white tracking-wide">
            Recharge Now
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}
