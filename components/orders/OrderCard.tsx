import { fetchProductSummary } from "@/lib/supabase-service"
import { Order } from "@/types/database.types"
import { formatFullDate } from "@/utils/dateUtils"
import { formatCurrency } from "@/utils/formatters"
import React, { useEffect, useState } from "react"
import { Text, TouchableOpacity, View } from "react-native"
import Animated, { FadeInUp } from "react-native-reanimated"

interface OrderCardProps {
  order: Order
  onPress: () => void
  index?: number
}

export default function OrderCard({ order, onPress, index = 0 }: OrderCardProps) {
  const [productName, setProductName] = useState<string>("Order")

  useEffect(() => {
    const loadProductName = async () => {
      if (order.product_id) {
        try {
          const product = await fetchProductSummary(order.product_id)
          if (product) setProductName(product.name)
        } catch {
          // ignore
        }
      }
    }
    loadProductName()
  }, [order.product_id])

  const getStatusClasses = () => {
    switch (order.status) {
      case "delivered":
        return {
          bg: "bg-functional-success/10",
          text: "text-functional-success",
        }
      case "pending":
        return { bg: "bg-primary-cream", text: "text-primary-orange" }
      case "cancelled":
        return { bg: "bg-functional-error/10", text: "text-functional-error" }
      default:
        return { bg: "bg-neutral-lightGray", text: "text-neutral-darkGray" }
    }
  }

  const statusClasses = getStatusClasses()

  return (
    <Animated.View entering={FadeInUp.duration(350).delay(index * 60).springify().damping(18)}>
    <TouchableOpacity
      className="bg-white rounded-2xl p-5 mb-4 shadow-md"
      onPress={onPress}
      activeOpacity={0.7}
    >
      <View className="flex-row justify-between items-center mb-3">
        <Text className="font-sofia-bold text-base text-primary-navy">
          {productName}
        </Text>
        <View className={`${statusClasses.bg} px-3 py-1 rounded-md`}>
          <Text
            className={`${statusClasses.text} font-sofia-bold text-xs uppercase tracking-wide`}
          >
            {order.status}
          </Text>
        </View>
      </View>

      <View className="flex-row justify-between mb-2">
        <Text className="font-comfortaa text-sm text-neutral-gray">
          {formatFullDate(order.delivery_date)}
        </Text>
        <Text className="font-sofia-bold text-base text-primary-navy">
          {formatCurrency(order.amount || 0)}
        </Text>
      </View>

      <View className="flex-row justify-between items-center">
        <Text className="font-comfortaa text-sm text-neutral-gray">
          {order.quantity || 0} bottle{(order.quantity || 0) > 1 ? "s" : ""}
        </Text>
      </View>
    </TouchableOpacity>
    </Animated.View>
  )
}
