
import { Award, TrendingUp } from 'lucide-react-native';
import React from 'react';
import { Text, View } from 'react-native';

interface StatsCardsProps {
  deliveriesCount: number;
  monthlyLiters: number;
}

export default function StatsCards({ deliveriesCount, monthlyLiters }: StatsCardsProps) {
  return (
    <View className="flex-row px-6 mb-6 gap-3">
      {/* Deliveries Card */}
      <View className="flex-1 bg-white rounded-2xl p-5 shadow-sm">
        <View className="w-10 h-10 rounded-xl bg-secondary-gold/20 items-center justify-center mb-3">
          <TrendingUp size={20} color="#EF6600" />
        </View>
        <Text className="font-sofia-bold text-2xl text-primary-navy mb-1">
          {deliveriesCount}
        </Text>
        <Text className="font-comfortaa text-xs text-neutral-gray tracking-wide">
          Deliveries
        </Text>
      </View>

      {/* Monthly Total Card */}
      <View className="flex-1 bg-white rounded-2xl p-5 shadow-sm">
        <View className="w-10 h-10 rounded-xl bg-functional-success/20 items-center justify-center mb-3">
          <Award size={20} color="#638C5F" />
        </View>
        <Text className="font-sofia-bold text-2xl text-primary-navy mb-1">
          {monthlyLiters.toFixed(1)}L
        </Text>
        <Text className="font-comfortaa text-xs text-neutral-gray tracking-wide">
          This Month
        </Text>
      </View>
    </View>
  );
}