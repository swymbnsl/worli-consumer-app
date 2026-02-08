import { BORDER_RADIUS, COLORS, SHADOWS } from "@/constants/theme"
import { supabase } from "@/lib/supabase"
import { Order } from "@/types/database.types"
import { formatFullDate } from "@/utils/dateUtils"
import { formatCurrency } from "@/utils/formatters"
import React, { useEffect, useState } from "react"
import { Text, TouchableOpacity, View } from "react-native"

interface OrderCardProps {
  order: Order
  onPress: () => void
}

export default function OrderCard({ order, onPress }: OrderCardProps) {
  const [productName, setProductName] = useState<string>('Order')

  useEffect(() => {
    const fetchProductName = async () => {
      if (order.product_id) {
        const { data, error } = await supabase
          .from('products')
          .select('name')
          .eq('id', order.product_id)
          .single()
        
        if (data && !error) {
          setProductName(data.name)
        }
      }
    }
    fetchProductName()
  }, [order.product_id])

  const getStatusColor = () => {
    switch (order.status) {
      case "delivered":
        return { bg: "#E8F5E9", text: COLORS.accent }
      case "pending":
        return { bg: "#FFF0D2", text: COLORS.primary }
      case "cancelled":
        return { bg: "#FFE0E0", text: COLORS.error }
      default:
        return { bg: COLORS.border, text: COLORS.text.secondary }
    }
  }

  const statusColors = getStatusColor()

  return (
    <TouchableOpacity
      style={{
        backgroundColor: COLORS.white,
        borderRadius: BORDER_RADIUS.md,
        padding: 20,
        marginBottom: 16,
        ...SHADOWS.md,
      }}
      onPress={onPress}
    >
      <View
        style={{
          flexDirection: "row",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: 12,
        }}
      >
        <Text
          style={{ fontWeight: "700", fontSize: 16, color: COLORS.secondary }}
        >
          {productName}
        </Text>
        <View
          style={{
            backgroundColor: statusColors.bg,
            paddingHorizontal: 12,
            paddingVertical: 4,
            borderRadius: BORDER_RADIUS.xs,
          }}
        >
          <Text
            style={{
              color: statusColors.text,
              fontSize: 11,
              fontWeight: "700",
              letterSpacing: 0.3,
              textTransform: "uppercase",
            }}
          >
            {order.status}
          </Text>
        </View>
      </View>

      <View
        style={{
          flexDirection: "row",
          justifyContent: "space-between",
          marginBottom: 8,
        }}
      >
        <Text style={{ color: COLORS.text.secondary, fontSize: 13 }}>
          {formatFullDate(order.delivery_date)}
        </Text>
        <Text
          style={{ fontWeight: "700", color: COLORS.secondary, fontSize: 15 }}
        >
          {formatCurrency(order.amount || 0)}
        </Text>
      </View>

      <View
        style={{
          flexDirection: "row",
          justifyContent: "space-between",
          alignItems: "center",
        }}
      >
        <Text style={{ color: COLORS.text.secondary, fontSize: 13 }}>
          {order.quantity || 0} bottle{(order.quantity || 0) > 1 ? "s" : ""}
        </Text>
      </View>
    </TouchableOpacity>
  )
}
