import React from "react"
import { ActivityIndicator, Text, View } from "react-native"
import Animated, { FadeInUp } from "react-native-reanimated"

interface InfoCardProps {
  label: string
  value: string
  animationDelay?: number
  variant?: "default" | "large" | "compact"
  isLoading?: boolean
  backgroundColor?: string
  icon?: React.ReactNode
}

export default function InfoCard({
  label,
  value,
  animationDelay = 0,
  variant = "default",
  isLoading = false,
  backgroundColor,
  icon,
}: InfoCardProps) {
  const AnimatedView = animationDelay > 0 ? Animated.View : View
  const animationProps =
    animationDelay > 0
      ? { entering: FadeInUp.duration(300).delay(animationDelay) }
      : {}

  const getValueTextClass = () => {
    switch (variant) {
      case "large":
        return "text-primary-navy text-2xl font-sofia-bold"
      case "compact":
        return "text-primary-navy text-base font-sofia-bold"
      default:
        return "text-primary-navy text-xl font-sofia-bold"
    }
  }

  const getPaddingClass = () => {
    switch (variant) {
      case "compact":
        return "p-3"
      default:
        return "p-4"
    }
  }

  return (
    <AnimatedView className="mb-4" {...animationProps}>
      <Text className="text-neutral-gray text-xs font-comfortaa font-semibold mb-2 uppercase tracking-wide">
        {label}
      </Text>
      <View
        className={`bg-white rounded-xl ${getPaddingClass()} shadow-sm flex-row items-center justify-between`}
        style={backgroundColor ? { backgroundColor } : undefined}
      >
        {isLoading ? (
          <ActivityIndicator size="small" color="#101B53" />
        ) : (
          <>
            <Text className={getValueTextClass()}>{value}</Text>
            {icon && <View className="ml-2">{icon}</View>}
          </>
        )}
      </View>
    </AnimatedView>
  )
}
