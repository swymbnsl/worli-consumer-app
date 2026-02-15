import { COLORS } from "@/constants/theme"
import { WifiOff } from "lucide-react-native"
import React from "react"
import { Text, View } from "react-native"
import Button from "../ui/Button"

interface OfflineScreenProps {
  onRetry?: () => void
  isLoading?: boolean
}

export default function OfflineScreen({
  onRetry,
  isLoading = false,
}: OfflineScreenProps) {
  return (
    <View className="flex-1 items-center justify-center bg-white px-6">
      <View className="items-center justify-center rounded-full bg-blue-50 p-8 mb-6">
        <WifiOff size={64} color={COLORS.primary.navy} strokeWidth={1.5} />
      </View>
      
      <Text className="text-2xl font-sofia-bold text-primary-navy text-center mb-3">
        No Internet Connection
      </Text>
      
      <Text className="text-base font-comfortaa text-neutral-gray text-center mb-8 px-4">
        Please check your network settings and try again.
      </Text>
      
      <View className="w-full max-w-xs">
        <Button
          title="Try Again"
          onPress={onRetry}
          variant="navy"
          isLoading={isLoading}
          fullWidth
        />
      </View>
    </View>
  )
}
