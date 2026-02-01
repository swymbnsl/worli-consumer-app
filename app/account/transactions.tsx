import { useRouter } from 'expo-router';
import { ChevronLeft } from 'lucide-react-native';
import React from 'react';
import { StatusBar, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

export default function TransactionsScreen() {
  const router = useRouter();

  return (
    <SafeAreaView className="flex-1 bg-neutral-lightCream" edges={['top', 'bottom']}>
      <StatusBar barStyle="dark-content" backgroundColor="#F5F5F0" />

      {/* Header */}
      <View className="bg-primary-navy px-6 pt-10 pb-6 flex-row items-center">
        <TouchableOpacity onPress={() => router.back()} className="mr-4 active:opacity-70">
          <ChevronLeft size={24} color="#FFFFFF" />
        </TouchableOpacity>
        <View>
          <Text className="font-comfortaa text-xs text-primary-cream uppercase tracking-widest mb-1">
            History
          </Text>
          <Text className="font-sofia-bold text-2xl text-white">
            Transactions
          </Text>
        </View>
      </View>

      <View className="flex-1 justify-center items-center px-6">
        <Text className="font-comfortaa text-base text-neutral-gray text-center">
          Transaction history is available in the Wallet tab
        </Text>
        <TouchableOpacity
          className="bg-primary-orange py-3.5 px-6 rounded-xl mt-5 active:opacity-90 shadow-md"
          onPress={() => router.push('/(tabs)/wallet')}
        >
          <Text className="font-sofia-bold text-sm text-white">
            Go to Wallet
          </Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}