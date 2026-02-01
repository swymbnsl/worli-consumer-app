
import { useRouter } from 'expo-router';
import { Package, ShoppingCart } from 'lucide-react-native';
import React from 'react';
import { Text, TouchableOpacity, View } from 'react-native';

export default function QuickActions() {
  const router = useRouter();

  return (
    <View className="px-6 mb-8">
      <Text className="font-sofia-bold text-lg text-primary-navy mb-4">
        Quick Actions
      </Text>
      <View className="flex-row flex-wrap -mx-2">
        {/* Order Now */}
        <TouchableOpacity
          className="w-1/2 p-2 active:scale-95"
          onPress={() => router.push('/cart')}
        >
          <View className="bg-white rounded-2xl p-5 items-center shadow-sm h-full justify-center">
            <View className="w-14 h-14 rounded-2xl bg-secondary-gold/20 items-center justify-center mb-3">
              <ShoppingCart size={26} color="#EF6600" />
            </View>
            <Text className="font-sofia-bold text-sm text-primary-navy text-center">
              Order Now
            </Text>
          </View>
        </TouchableOpacity>

        {/* Manage Subscription */}
        <TouchableOpacity
          className="w-1/2 p-2 active:scale-95"
          onPress={() => router.push('/(tabs)/subscription')}
        >
          <View className="bg-white rounded-2xl p-5 items-center shadow-sm h-full justify-center">
            <View className="w-14 h-14 rounded-2xl bg-functional-success/20 items-center justify-center mb-3">
              <Package size={26} color="#638C5F" />
            </View>
            <Text className="font-sofia-bold text-sm text-primary-navy text-center">
              Manage{'\n'}Subscription
            </Text>
          </View>
        </TouchableOpacity>
      </View>
    </View>
  );
}