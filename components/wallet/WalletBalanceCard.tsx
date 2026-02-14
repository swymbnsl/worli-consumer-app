import { formatCurrency } from '@/utils/formatters';
import { Wallet2 } from 'lucide-react-native';
import React from 'react';
import { Text, View } from 'react-native';
import Animated, { FadeInUp } from 'react-native-reanimated';

interface WalletBalanceCardProps {
  balance: number;
}

export default function WalletBalanceCard({ balance }: WalletBalanceCardProps) {
  return (
    <Animated.View entering={FadeInUp.duration(400).springify().damping(18)} className="mx-4 mb-6 mt-6">
      <View className="bg-primary-navy rounded-2xl p-8 relative overflow-hidden shadow-lg">
        {/* Background decorations matching app style */}
        <View className="absolute -top-10 -right-10 w-36 h-36 rounded-full bg-primary-cream opacity-10" />
        <View className="absolute -bottom-8 -left-8 w-28 h-28 rounded-full bg-secondary-skyBlue opacity-20" />

        {/* Wallet Icon */}
        <View className="absolute top-6 right-6 w-14 h-14 bg-white rounded-full items-center justify-center shadow-md">
          <Wallet2 size={28} color="#101B53" strokeWidth={2} />
        </View>

        <Text className="font-comfortaa text-xs text-primary-cream tracking-widest mb-2 opacity-90">
          TOTAL AVAILABLE BALANCE
        </Text>
        <Text className="font-sofia-bold text-5xl text-primary-cream">
          {formatCurrency(balance)}
        </Text>
      </View>
    </Animated.View>
  );
}