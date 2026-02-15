import { useRouter } from "expo-router"
import React from "react"
import { Text, TouchableOpacity, View } from "react-native"

export default function TransactionsScreen() {
  const router = useRouter()

  return (
    <View className="flex-1 bg-neutral-lightCream">
      <View className="flex-1 justify-center items-center px-6">
        <Text className="font-comfortaa text-base text-neutral-gray text-center">
          Transaction history is available in the Wallet tab
        </Text>
        <TouchableOpacity
          className="bg-primary-navy py-3.5 px-6 rounded-xl mt-5 active:opacity-90 shadow-md"
          onPress={() => router.push("/(tabs)/wallet")}
        >
          <Text className="font-sofia-bold text-sm text-white">
            Go to Wallet
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  )
}
