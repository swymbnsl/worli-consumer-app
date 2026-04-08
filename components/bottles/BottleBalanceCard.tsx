import { formatDaysLeft } from "@/lib/bottle-utils"
import { Milk } from "lucide-react-native"
import React from "react"
import { Text, View } from "react-native"
import Animated, { FadeInUp } from "react-native-reanimated"

interface BottleBalanceCardProps {
  bottleBalance: number
  estimatedDaysLeft: number
}

export default function BottleBalanceCard({
  bottleBalance,
  estimatedDaysLeft,
}: BottleBalanceCardProps) {
  const daysLeftText = formatDaysLeft(estimatedDaysLeft)
  const isLow = estimatedDaysLeft > 0 && estimatedDaysLeft < 7

  return (
    <Animated.View entering={FadeInUp.duration(500)} className="mx-4 mb-6 mt-6">
      <View className="bg-primary-navy rounded-2xl p-8 relative overflow-hidden shadow-lg">
        {/* Background decorations matching app style */}
        <View className="absolute -top-10 -right-10 w-36 h-36 rounded-full bg-primary-cream opacity-10" />
        <View className="absolute -bottom-8 -left-8 w-28 h-28 rounded-full bg-secondary-skyBlue opacity-20" />

        {/* Bottle Icon */}
        <View className="absolute top-6 right-6 w-14 h-14 bg-white rounded-full items-center justify-center shadow-md">
          <Milk size={28} color="#101B53" strokeWidth={2} />
        </View>

        <Text className="font-comfortaa text-xs text-primary-cream tracking-widest mb-2 opacity-90">
          YOUR BOTTLE BALANCE
        </Text>
        <View className="flex-row items-baseline">
          <Text className="font-sofia-bold text-5xl text-primary-cream">
            {bottleBalance}
          </Text>
          <Text className="font-comfortaa text-lg text-primary-cream/80 ml-2">
            {bottleBalance === 1 ? "bottle" : "bottles"}
          </Text>
        </View>

        {/* Days left indicator */}
        <View className="mt-4 pt-4 border-t border-primary-cream/20">
          <View className="flex-row items-center">
            <View
              className={`w-2 h-2 rounded-full mr-2 ${
                isLow ? "bg-functional-error" : "bg-functional-success"
              }`}
            />
            <Text
              className={`font-comfortaa text-sm ${
                isLow ? "text-functional-error" : "text-primary-cream/80"
              }`}
            >
              {daysLeftText}
            </Text>
          </View>
        </View>
      </View>
    </Animated.View>
  )
}
