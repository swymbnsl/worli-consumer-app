import { COLORS } from "@/constants/theme"
import { Order } from "@/types/database.types"
import { Calendar } from "lucide-react-native"
import React from "react"
import { Text, View } from "react-native"
import Animated, { FadeInDown } from "react-native-reanimated"

interface TodayDeliveryCardProps {
  selectedDate: string
  order?: Order | null
}

const formatDisplayDate = (dateStr: string): string => {
  // Parse date string in local timezone (YYYY-MM-DD format)
  const [year, month, day] = dateStr.split("-").map(Number)
  const date = new Date(year, month - 1, day)

  const today = new Date()
  const todayYear = today.getFullYear()
  const todayMonth = today.getMonth()
  const todayDate = today.getDate()

  // Check if it's today
  if (
    date.getFullYear() === todayYear &&
    date.getMonth() === todayMonth &&
    date.getDate() === todayDate
  ) {
    return "Today"
  }

  // Check if it's tomorrow
  const tomorrow = new Date(todayYear, todayMonth, todayDate + 1)
  if (
    date.getFullYear() === tomorrow.getFullYear() &&
    date.getMonth() === tomorrow.getMonth() &&
    date.getDate() === tomorrow.getDate()
  ) {
    return "Tomorrow"
  }

  return date.toLocaleDateString("en-IN", {
    weekday: "long",
    day: "numeric",
    month: "short",
  })
}

const getStatusMessage = (
  order: Order | null | undefined,
): { message: string; icon: string } => {
  if (!order) {
    return {
      message: "There are no orders scheduled for this day",
      icon: "📭",
    }
  }

  switch (order.status) {
    case "delivered":
      return {
        message: "Your order has been delivered!",
        icon: "✅",
      }
    case "out_for_delivery":
      return {
        message: "Your order is out for delivery",
        icon: "🚚",
      }
    case "confirmed":
      return {
        message: "Your order is confirmed and will be delivered soon",
        icon: "📦",
      }
    case "pending":
      return {
        message: "Your order is pending confirmation",
        icon: "⏳",
      }
    case "cancelled":
      return {
        message: "This order was cancelled",
        icon: "❌",
      }
    default:
      return {
        message: "Order scheduled for delivery",
        icon: "📅",
      }
  }
}

export default function TodayDeliveryCard({
  selectedDate,
  order,
}: TodayDeliveryCardProps) {
  const displayDate = formatDisplayDate(selectedDate)
  const { message, icon } = getStatusMessage(order)

  return (
    <Animated.View
      entering={FadeInDown.duration(400).delay(200)}
      className="bg-secondary-skyBlue/20 rounded-2xl p-4 flex-row items-center"
    >
      <View className="bg-white rounded-full p-3 mr-4">
        <Calendar size={24} color={COLORS.primary.navy} />
      </View>
      <View className="flex-1">
        <Text className="font-sofia-bold text-sm text-primary-navy mb-0.5">
          {displayDate}
        </Text>
        <Text className="font-comfortaa text-sm text-neutral-darkGray">
          {message}
        </Text>
      </View>
      <Text className="text-2xl">{icon}</Text>
    </Animated.View>
  )
}
