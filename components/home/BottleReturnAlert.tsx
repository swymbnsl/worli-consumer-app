
import { ChevronRight, Package } from 'lucide-react-native';
import React from 'react';
import { Text, TouchableOpacity, View } from 'react-native';

interface BottleReturnAlertProps {
  count: number;
  onPress: () => void;
}

export default function BottleReturnAlert({ count, onPress }: BottleReturnAlertProps) {
  return (
    <TouchableOpacity
      className="bg-secondary-gold/10 border border-secondary-gold rounded-2xl p-4 mx-6 mb-6 flex-row items-center justify-between active:opacity-90"
      onPress={onPress}
    >
      <View className="flex-row items-center gap-4 flex-1">
        <Package size={24} color="#E4941C" />
        <View className="flex-1">
          <Text className="font-sofia-bold text-base text-primary-navy mb-1">
            Bottle Return Pending
          </Text>
          <Text className="font-comfortaa text-xs text-neutral-darkGray">
            {count} bottle{count > 1 ? 's' : ''} awaiting return
          </Text>
        </View>
      </View>
      <ChevronRight size={24} color="#E4941C" />
    </TouchableOpacity>
  );
}
