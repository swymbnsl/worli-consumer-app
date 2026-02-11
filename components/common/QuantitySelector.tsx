import { COLORS } from "@/constants/theme"
import { Minus, Plus } from "lucide-react-native"
import React from "react"
import { Text, TouchableOpacity, View } from "react-native"

interface QuantitySelectorProps {
  quantity: number
  onIncrease: () => void
  onDecrease: () => void
  min?: number
  max?: number
  size?: "small" | "medium"
}

export default function QuantitySelector({
  quantity,
  onIncrease,
  onDecrease,
  min = 1,
  max = 10,
  size = "small",
}: QuantitySelectorProps) {
  const buttonSize = size === "small" ? "w-7 h-7" : "w-10 h-10"
  const iconSize = size === "small" ? 14 : 18

  return (
    <View className="flex-row items-center">
      <TouchableOpacity
        className={`${buttonSize} rounded-md bg-primary-navy items-center justify-center`}
        onPress={onDecrease}
        disabled={quantity <= min}
      >
        <Minus size={iconSize} color={COLORS.neutral.white} />
      </TouchableOpacity>
      <Text className="mx-2 font-sofia-bold text-base text-primary-navy min-w-[20px] text-center">
        {quantity}
      </Text>
      <TouchableOpacity
        className={`${buttonSize} rounded-md bg-primary-navy items-center justify-center`}
        onPress={onIncrease}
        disabled={quantity >= max}
      >
        <Plus size={iconSize} color={COLORS.neutral.white} />
      </TouchableOpacity>
    </View>
  )
}
