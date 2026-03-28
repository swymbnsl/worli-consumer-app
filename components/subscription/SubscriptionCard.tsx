import { COLORS } from "@/constants/theme"
import { fetchProductById } from "@/lib/supabase-service"
import { Product, Subscription } from "@/types/database.types"
import { formatDate } from "@/utils/dateUtils"
import { formatCurrency } from "@/utils/formatters"
import {
  Calendar,
  Edit3,
  PauseCircle,
  Repeat,
  Tag,
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
        const product = await fetchProductById(subscription.product_id)
        if (product) {
          setProduct(product)
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

  // ─── Discount helpers ──────────────────────────────────────────────
  const hasActiveDiscount = !!subscription.discount_code_id

  const discountedDailyCost = hasActiveDiscount
    ? Math.max(0, dailyCost - (subscription.discount_amount ?? 0))
    : dailyCost

  // Since discount_orders_remaining is not in the schema, we'll simplify this
  const discountEndDateLabel = null

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
      entering={FadeInUp.duration(500)
        .delay(index * 80)}
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
                  {formatCurrency(hasActiveDiscount ? discountedDailyCost : dailyCost)}
                </Text>
                {hasActiveDiscount && discountedDailyCost < dailyCost ? (
                  <Text
                    className="font-comfortaa text-[10px] text-neutral-gray"
                    style={{ textDecorationLine: "line-through" }}
                  >
                    {formatCurrency(dailyCost)}
                  </Text>
                ) : (
                  <Text className="font-comfortaa text-[10px] text-neutral-gray">
                    /day
                  </Text>
                )}
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

        {/* Discount info strip */}
        {hasActiveDiscount && (
          <View
            className="mx-4 mb-3 flex-row items-center px-3 py-2 rounded-xl"
            style={{ backgroundColor: COLORS.functional.success + "15" }}
          >
            <Tag size={12} color={COLORS.functional.success} strokeWidth={2.5} />
            <Text className="font-comfortaa text-xs ml-2" style={{ color: COLORS.functional.success }}>
              Saving {formatCurrency(subscription.discount_amount ?? 0)}/order
            </Text>
          </View>
        )}

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
