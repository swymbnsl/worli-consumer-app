import AccountSubHeader from "@/components/account/AccountSubHeader"
import { PRODUCT } from "@/constants/product"
import { COLORS } from "@/constants/theme"
import { useAuth } from "@/hooks/useAuth"
import { fetchOrderById, fetchProductSummary } from "@/lib/supabase-service"
import { Order, Product as ProductType } from "@/types/database.types"
import { formatFullDate } from "@/utils/dateUtils"
import { formatCurrency } from "@/utils/formatters"
import { showErrorToast } from "@/components/ui/Toast"
import { useLocalSearchParams, useRouter } from "expo-router"
import { Calendar, MapPin } from "lucide-react-native"
import React, { useEffect, useState } from "react"
import { Image, ScrollView, Text, View } from "react-native"

export default function OrderDetailScreen() {
  const router = useRouter()
  const { id } = useLocalSearchParams()
  const { user } = useAuth()
  const [order, setOrder] = useState<Order | null>(null)
  const [product, setProduct] = useState<ProductType | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchOrder()
  }, [id])

  const fetchOrder = async () => {
    if (!user || !id) return

    try {
      const data = await fetchOrderById(id as string, user.id)
      setOrder(data)

      // fetch corresponding product image/info if product_id exists
      if (data?.product_id) {
        try {
          const prodData = await fetchProductSummary(data.product_id)
          if (prodData) setProduct(prodData as ProductType)
        } catch (e) {
          // ignore product fetch errors but continue
          console.warn("Failed to fetch product for order", e)
        }
      }
    } catch (error) {
      console.error("Error fetching order:", error)
      showErrorToast("Error", "Failed to load order details")
      router.back()
    } finally {
      setLoading(false)
    }
  }

  if (loading || !order) {
    return (
      <View className="flex-1 bg-neutral-lightCream justify-center items-center">
        <Text className="font-comfortaa text-neutral-gray">Loading...</Text>
      </View>
    )
  }

  const getStatusInfo = () => {
    switch (order.status) {
      case "delivered":
        return {
          bg: "bg-functional-success/10",
          text: "text-functional-success",
          label: "Delivered",
        }
      case "pending":
      case "confirmed":
        return {
          bg: "bg-secondary-skyBlue/20",
          text: "text-primary-navy",
          label: "Confirmed",
        }
      case "cancelled":
        return {
          bg: "bg-functional-error/10",
          text: "text-functional-error",
          label: "Cancelled",
        }
      case "out_for_delivery":
        return {
          bg: "bg-secondary-gold/20",
          text: "text-secondary-gold",
          label: "Out for Delivery",
        }
      default:
        return {
          bg: "bg-neutral-gray/10",
          text: "text-neutral-darkGray",
          label: order.status || "Unknown",
        }
    }
  }

  const statusInfo = getStatusInfo()

  return (
    <View className="flex-1 bg-neutral-lightCream">
      <AccountSubHeader title="Order Details" />

      <ScrollView
        className="flex-1"
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ padding: 16 }}
      >
        {/* Status Badge */}
        {/* <View className="items-center mb-4">
          <View
            className={`${statusInfo.bg} px-6 py-3 rounded-full`}
          >
            <Text
              className={`${statusInfo.text} font-sofia-bold text-sm uppercase tracking-wider`}
            >
              {statusInfo.label}
            </Text>
          </View>
        </View> */}

        {/* Product Card */}
        <View className="bg-white rounded-2xl p-4 mb-4 shadow-sm">
          <Text className="font-sofia-bold text-lg text-primary-navy mb-4">
            Order Details
          </Text>

          <View className="flex-row items-center pb-4 border-b border-neutral-lightGray">
            {/* Product Image */}
            <View className="w-20 h-20 rounded-xl bg-primary-cream items-center justify-center mr-4 overflow-hidden">
              {product?.image_url ? (
                <Image
                  source={{ uri: product.image_url }}
                  className="w-full h-full"
                  resizeMode="cover"
                />
              ) : (
                <Text className="text-4xl">{PRODUCT.image}</Text>
              )}
            </View>

            {/* Product Info */}
            <View className="flex-1">
              <Text className="font-sofia-bold text-base text-primary-navy mb-1">
                {product?.name ?? PRODUCT.name}
              </Text>
              <Text className="font-comfortaa text-sm text-neutral-gray mb-2">
                {product?.volume ?? PRODUCT.size} • {order.quantity || 1} ×{" "}
                {formatCurrency(product?.price ?? PRODUCT.price)}
              </Text>
            </View>
          </View>

          {/* Order Number & Date */}
          <View className="pt-4">
            <View className="flex-row justify-between mb-2">
              <Text className="font-comfortaa text-sm text-neutral-gray">
                Order Number
              </Text>
              <Text className="font-sofia-bold text-sm text-primary-navy">
                #{order.order_number}
              </Text>
            </View>
            <View className="flex-row justify-between">
              <Text className="font-comfortaa text-sm text-neutral-gray">
                Order Date
              </Text>
              <Text className="font-comfortaa text-sm text-primary-navy">
                {formatFullDate(order.created_at || order.delivery_date)}
              </Text>
            </View>
          </View>
        </View>

        {/* Delivery Information */}
        <View className="bg-white rounded-2xl p-4 mb-4 shadow-sm">
          <Text className="font-sofia-bold text-lg text-primary-navy mb-4">
            Delivery Information
          </Text>

          {/* Delivery Date */}
          <View className="flex-row items-start mb-4">
            <View className="w-10 h-10 rounded-full bg-secondary-skyBlue/20 items-center justify-center mr-3">
              <Calendar size={20} color={COLORS.primary.navy} />
            </View>
            <View className="flex-1">
              <Text className="font-comfortaa text-xs text-neutral-gray mb-1">
                Delivery Date
              </Text>
              <Text className="font-sofia-bold text-base text-primary-navy">
                {formatFullDate(order.delivery_date)}
              </Text>
              {order.delivered_at && (
                <Text className="font-comfortaa text-xs text-secondary-sage mt-1">
                  Delivered on {formatFullDate(order.delivered_at)}
                </Text>
              )}
            </View>
          </View>

          {/* Delivery Address (if available) */}
          {order.address_id && (
            <View className="flex-row items-start">
              <View className="w-10 h-10 rounded-full bg-secondary-skyBlue/20 items-center justify-center mr-3">
                <MapPin size={20} color={COLORS.primary.navy} />
              </View>
              <View className="flex-1">
                <Text className="font-comfortaa text-xs text-neutral-gray mb-1">
                  Delivery Address
                </Text>
                <Text className="font-comfortaa text-sm text-primary-navy">
                  {order.delivery_notes || "Default delivery address"}
                </Text>
              </View>
            </View>
          )}
        </View>

        {/* Payment Summary */}
        <View className="bg-white rounded-2xl p-4 mb-4 shadow-sm">
          <Text className="font-sofia-bold text-lg text-primary-navy mb-4">
            Payment Summary
          </Text>

          <View className="space-y-3">
            <View className="flex-row justify-between">
              <Text className="font-comfortaa text-sm text-neutral-gray">
                Subtotal
              </Text>
              <Text className="font-comfortaa text-sm text-primary-navy">
                {formatCurrency(order.amount || 0)}
              </Text>
            </View>

            <View className="h-px bg-neutral-lightGray my-2" />

            <View className="flex-row justify-between items-center pt-2">
              <Text className="font-sofia-bold text-base text-primary-navy">
                Total Amount
              </Text>
              <Text className="font-sofia-bold text-xl text-secondary-sage">
                {formatCurrency(order.amount || 0)}
              </Text>
            </View>

            <View className="mt-3 bg-secondary-skyBlue/10 rounded-lg p-3">
              <Text className="font-comfortaa text-xs text-primary-navy text-center">
                Payment completed via Wallet
              </Text>
            </View>
          </View>
        </View>

        {/* Additional Notes */}
        {order.delivery_notes && (
          <View className="bg-white rounded-2xl p-4 mb-4 shadow-sm">
            <Text className="font-sofia-bold text-base text-primary-navy mb-2">
              Delivery Notes
            </Text>
            <Text className="font-comfortaa text-sm text-neutral-gray leading-5">
              {order.delivery_notes}
            </Text>
          </View>
        )}

        {order.cancellation_reason && (
          <View className="bg-functional-error/5 rounded-2xl p-4 mb-4 border border-functional-error/20">
            <Text className="font-sofia-bold text-base text-functional-error mb-2">
              Cancellation Reason
            </Text>
            <Text className="font-comfortaa text-sm text-neutral-darkGray leading-5">
              {order.cancellation_reason}
            </Text>
          </View>
        )}
      </ScrollView>
    </View>
  )
}
