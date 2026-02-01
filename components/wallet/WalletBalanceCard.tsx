import { Plus } from 'lucide-react-native';
import React from 'react';
import { Text, TouchableOpacity, View } from 'react-native';
import { formatCurrency } from '@/utils/formatters';

interface WalletBalanceCardProps {
  balance: number;
  onAddMoney: () => void;
}

export default function WalletBalanceCard({ balance, onAddMoney }: WalletBalanceCardProps) {
  return (
    <View className="mx-4 mb-6 mt-6">
      <View className="bg-primary-cream rounded-2xl p-8 relative overflow-hidden shadow-lg">
        {/* Background decorations */}
        <View className="absolute -top-10 -right-10 w-36 h-36 rounded-3xl bg-secondary-gold opacity-15" />
        <View className="absolute -bottom-8 -left-8 w-28 h-28 rounded-3xl bg-secondary-skyBlue opacity-10" />

        <Text className="font-comfortaa text-xs text-neutral-darkGray tracking-widest mb-2">
          AVAILABLE BALANCE
        </Text>
        <Text className="font-sofia-bold text-5xl text-primary-navy mb-8">
          {formatCurrency(balance)}
        </Text>
        <TouchableOpacity
          className="bg-primary-orange py-4 rounded-xl flex-row items-center justify-center shadow-md active:opacity-90"
          onPress={onAddMoney}
        >
          <Plus size={20} color="#FFFFFF" strokeWidth={2.5} />
          <Text className="font-sofia-bold text-base text-white ml-2">
            Add Money
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}