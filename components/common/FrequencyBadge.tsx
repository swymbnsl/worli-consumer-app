import { CartItem } from "@/context/CartContext"
import React from "react"
import { Text, View } from "react-native"

interface FrequencyBadgeProps {
  frequency: CartItem["frequency"]
  intervalDays?: number
  className?: string
}

export default function FrequencyBadge({
  frequency,
  intervalDays,
  className,
}: FrequencyBadgeProps) {
  const getLabel = (): string => {
    switch (frequency) {
      case "daily":
        return "Daily"
      case "custom":
        return "Custom"
      case "on_interval":
        return `Every ${intervalDays || 2} Days`
      case "buy_once":
        return "One Time"
      default:
        return "Daily"
    }
  }

  return (
    <View
      className={`bg-primary-cream px-3 py-1 rounded-full ${className || ""}`}
    >
      <Text className="font-sofia-bold text-xs text-primary-navy">
        {getLabel()}
      </Text>
    </View>
  )
}
