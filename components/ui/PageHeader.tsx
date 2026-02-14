import { COLORS } from "@/constants/theme"
import { PageHeaderProps } from "@/types/ui-components.types"
import { useRouter } from "expo-router"
import { ChevronLeft } from "lucide-react-native"
import React from "react"
import { Text, TouchableOpacity, View } from "react-native"
import Animated, { FadeInDown } from "react-native-reanimated"

export default function PageHeader({
  title,
  showBackButton = true,
  disabled = false,
  onBackPress,
  rightComponent,
}: PageHeaderProps) {
  const router = useRouter()

  const handleBackPress = () => {
    if (onBackPress) {
      onBackPress()
    } else {
      router.back()
    }
  }

  return (
    <Animated.View
      entering={FadeInDown.duration(120)}
      className="flex-row items-center justify-between px-6 py-4 bg-neutral-lightCream"
    >
      {showBackButton ? (
        <TouchableOpacity
          onPress={handleBackPress}
          disabled={disabled}
          className={`w-10 h-10 rounded-xl bg-white items-center justify-center ${
            disabled ? "opacity-50" : "active:opacity-70"
          }`}
          style={{
            shadowColor: "#000",
            shadowOffset: { width: 0, height: 2 },
            shadowOpacity: 0.08,
            shadowRadius: 4,
            elevation: 2,
          }}
        >
          <ChevronLeft size={20} color={COLORS.primary.navy} />
        </TouchableOpacity>
      ) : (
        <View className="w-10 h-10" />
      )}

      <Text className="font-sofia-bold text-lg text-primary-navy">
        {title}
      </Text>

      {rightComponent || <View className="w-10 h-10" />}
    </Animated.View>
  )
}
