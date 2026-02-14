import { COLORS } from "@/constants/theme"
import { supabase } from "@/lib/supabase"
import { Product, Subscription } from "@/types/database.types"
import { formatDate } from "@/utils/dateUtils"
import { formatCurrency } from "@/utils/formatters"
import {
  Calendar,
  Edit3,
  PauseCircle,
  Repeat,
  Trash2,
} from "lucide-react-native"
import React, { useEffect, useState } from "react"
import {
  ActivityIndicator,
  Image,
  Text,
  TouchableOpacity,
  View,
} from "react-native"
import Animated, { FadeInUp } from "react-native-reanimated"

interface SubscriptionCardProps {
  subscription: Subscription
  onEdit: () => void
  onPause: () => void
  onCancel?: () => void
  index?: number
}

export default function SubscriptionCard({
  subscription,
  onEdit,
  onPause,
  onCancel,
  index = 0,
}: SubscriptionCardProps) {
  const [product, setProduct] = useState<Product | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchProduct = async () => {
      if (!subscription.product_id) {
        setLoading(false)
        return
      }

      try {
        const { data, error } = await supabase
          .from("products")
          .select("*")
          .eq("id", subscription.product_id)
          .single()

        if (data && !error) {
          setProduct(data)
        }
      } catch (error) {
        console.error("Error fetching product:", error)
      } finally {
        setLoading(false)
      }
    }

    fetchProduct()
  }, [subscription.product_id])

  const dailyCost = (product?.price || 0) * (subscription.quantity || 1)

  const frequencyLabel =
    (subscription.frequency || "daily").charAt(0).toUpperCase() +
    (subscription.frequency || "daily").slice(1)

  if (loading) {
    return (
      <View className="mx-4 mt-3 bg-white rounded-2xl p-5 items-center justify-center h-24">
        <ActivityIndicator size="small" color={COLORS.primary.navy} />
      </View>
    )
  }

  return (
    <Animated.View
      entering={FadeInUp.duration(400)
        .delay(index * 80)
        .springify()
        .damping(18)}
      className="mx-4 mt-3"
    >
      <View
        className="bg-white rounded-2xl overflow-hidden"
        style={{
          shadowColor: "#000",
          shadowOffset: { width: 0, height: 2 },
          shadowOpacity: 0.06,
          shadowRadius: 8,
          elevation: 3,
        }}
      >
        {/* Main Content Row */}
        <View className="flex-row p-4">
          {/* Product Image / Icon */}
          <View className="w-14 h-14 rounded-xl bg-primary-cream items-center justify-center mr-3">
            {product?.image_url ? (
              <Image
                source={{ uri: product.image_url }}
                className="w-12 h-12 rounded-lg"
                resizeMode="cover"
              />
            ) : (
              <Text className="text-2xl">🥛</Text>
            )}
          </View>

          {/* Product Info */}
          <View className="flex-1">
            <View className="flex-row items-start justify-between">
              <View className="flex-1 mr-2">
                <Text
                  className="font-sofia-bold text-base text-primary-navy"
                  numberOfLines={1}
                >
                  {product?.name || "Product"}
                </Text>
                <Text className="font-comfortaa text-xs text-neutral-gray mt-0.5">
                  {product?.volume ? `${product.volume} · ` : ""}
                  {subscription.quantity || 1}x {frequencyLabel}
                </Text>
              </View>

              {/* Price */}
              <View className="items-end">
                <Text className="font-sofia-bold text-base text-primary-navy">
                  {formatCurrency(dailyCost)}
                </Text>
                <Text className="font-comfortaa text-[10px] text-neutral-gray">
                  /day
                </Text>
              </View>
            </View>

            {/* Tags Row */}
            <View className="flex-row items-center mt-2.5 gap-2">
              <View className="flex-row items-center bg-functional-success/10 px-2 py-1 rounded-md">
                <View className="w-1.5 h-1.5 rounded-full bg-functional-success mr-1.5" />
                <Text className="font-sofia-bold text-[10px] text-functional-success uppercase tracking-wider">
                  Active
                </Text>
              </View>

              <View className="flex-row items-center bg-neutral-lightCream px-2 py-1 rounded-md">
                <Repeat
                  size={10}
                  color={COLORS.neutral.darkGray}
                  strokeWidth={2.5}
                />
                <Text className="font-comfortaa text-[10px] text-neutral-darkGray ml-1">
                  {frequencyLabel}
                </Text>
              </View>

              <View className="flex-row items-center bg-neutral-lightCream px-2 py-1 rounded-md">
                <Calendar
                  size={10}
                  color={COLORS.neutral.darkGray}
                  strokeWidth={2.5}
                />
                <Text className="font-comfortaa text-[10px] text-neutral-darkGray ml-1">
                  {formatDate(subscription.start_date)}
                </Text>
              </View>
            </View>
          </View>
        </View>

        {/* Action Bar */}
        <View className="flex-row border-t border-neutral-lightGray/60">
          <TouchableOpacity
            className="flex-1 flex-row items-center justify-center py-2.5"
            onPress={onEdit}
            activeOpacity={0.6}
          >
            <Edit3 size={14} color={COLORS.primary.navy} strokeWidth={2} />
            <Text className="font-sofia-bold text-xs text-primary-navy ml-1.5">
              Edit
            </Text>
          </TouchableOpacity>

          <View className="w-px bg-neutral-lightGray/60" />

          <TouchableOpacity
            className="flex-1 flex-row items-center justify-center py-2.5"
            onPress={onPause}
            activeOpacity={0.6}
          >
            <PauseCircle
              size={14}
              color={COLORS.primary.orange}
              strokeWidth={2}
            />
            <Text className="font-sofia-bold text-xs text-primary-orange ml-1.5">
              Pause
            </Text>
          </TouchableOpacity>

          {onCancel && (
            <>
              <View className="w-px bg-neutral-lightGray/60" />
              <TouchableOpacity
                className="flex-1 flex-row items-center justify-center py-2.5"
                onPress={onCancel}
                activeOpacity={0.6}
              >
                <Trash2
                  size={14}
                  color={COLORS.functional.error}
                  strokeWidth={2}
                />
                <Text className="font-sofia-bold text-xs text-functional-error ml-1.5">
                  Cancel
                </Text>
              </TouchableOpacity>
            </>
          )}
        </View>
      </View>
    </Animated.View>
  )
}
