import { PageHeaderProps } from "@/types/ui-components.types"
import { useRouter } from "expo-router"
import { ChevronLeft } from "lucide-react-native"
import React from "react"
import { Text, TouchableOpacity, View } from "react-native"
import Animated, { FadeInDown } from "react-native-reanimated"

export default function PageHeader({
  title,
  subtitle,
  showBackButton = true,
  disabled = false,
  onBackPress,
  rightComponent,
  backgroundColor = "#101B53",
  animationDelay = 0,
}: PageHeaderProps) {
  const router = useRouter()

  const handleBackPress = () => {
    if (onBackPress) {
      onBackPress()
    } else {
      router.back()
    }
  }

  const AnimatedView = animationDelay > 0 ? Animated.View : View
  const animationProps =
    animationDelay > 0
      ? { entering: FadeInDown.duration(300).delay(animationDelay) }
      : {}

  return (
    <AnimatedView
      className="px-6 pt-10 pb-6 flex-row items-center"
      style={{ backgroundColor }}
      {...animationProps}
    >
      {showBackButton ? (
        <TouchableOpacity
          onPress={handleBackPress}
          disabled={disabled}
          className={`mr-4 ${disabled ? "opacity-50" : "active:opacity-70"}`}
        >
          <ChevronLeft size={24} color="#FFFFFF" />
        </TouchableOpacity>
      ) : (
        <View className="w-6 mr-4" />
      )}

      <View className="flex-1">
        {subtitle && (
          <Text className="font-comfortaa text-xs text-primary-cream uppercase tracking-widest mb-1">
            {subtitle}
          </Text>
        )}
        <Text className="font-sofia-bold text-2xl text-white">{title}</Text>
      </View>

      {rightComponent && <View className="ml-4">{rightComponent}</View>}
    </AnimatedView>
  )
}
