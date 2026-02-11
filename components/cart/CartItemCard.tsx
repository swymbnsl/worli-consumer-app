import FrequencyBadge from "@/components/common/FrequencyBadge"
import ProductImage from "@/components/common/ProductImage"
import QuantitySelector from "@/components/common/QuantitySelector"
import { COLORS } from "@/constants/theme"
import { CartItem, getItemTotal } from "@/context/CartContext"
import { formatCurrency } from "@/utils/formatters"
import { Pencil, Trash2 } from "lucide-react-native"
import React from "react"
import { Text, TouchableOpacity, View } from "react-native"

interface CartItemCardProps {
  item: CartItem
  onEdit: (item: CartItem) => void
  onRemove: (itemId: string) => void
  onQuantityChange?: (item: CartItem, delta: number) => void
}

const formatDate = (dateStr: string): string => {
  const d = new Date(dateStr + "T00:00:00")
  return d.toLocaleDateString("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
  })
}

export default function CartItemCard({
  item,
  onEdit,
  onRemove,
  onQuantityChange,
}: CartItemCardProps) {
  const itemTotal = getItemTotal(item)

  return (
    <View
      className="bg-white rounded-2xl p-4 mb-3"
      style={{
        borderWidth: 1,
        borderColor: COLORS.neutral.lightGray,
      }}
    >
      {/* Top row: image + name + qty + price */}
      <View className="flex-row items-center">
        {/* Product Image */}
        <ProductImage
          imageUrl={item.productImage}
          size="medium"
          containerClassName="mr-3"
        />

        {/* Name & Volume */}
        <View className="flex-1">
          <Text
            className="font-sofia-bold text-base text-primary-navy"
            numberOfLines={1}
          >
            {item.productName}
          </Text>
          {item.productVolume && (
            <Text className="font-comfortaa text-xs text-neutral-gray">
              {item.productVolume}
            </Text>
          )}
        </View>

        {/* Quantity Controls */}
        {item.frequency !== "custom" && onQuantityChange && (
          <View className="mx-2">
            <QuantitySelector
              quantity={item.quantity}
              onIncrease={() => onQuantityChange(item, 1)}
              onDecrease={() => onQuantityChange(item, -1)}
              size="small"
            />
          </View>
        )}

        {/* Price */}
        <Text className="font-sofia-bold text-base text-primary-navy ml-2">
          {formatCurrency(itemTotal)}
        </Text>
      </View>

      {/* Date Row */}
      <View className="flex-row items-center mt-3">
        <Text className="font-comfortaa text-xs text-neutral-darkGray">
          {item.frequency === "buy_once" ? "Delivery" : "Start Date"}:{" "}
          <Text className="font-sofia-bold">{formatDate(item.startDate)}</Text>
        </Text>
      </View>

      {/* Bottom Row: frequency + edit + delete */}
      <View className="flex-row items-center justify-between mt-2 pt-2 border-t border-neutral-lightGray">
        <View className="flex-row items-center flex-1">
          <FrequencyBadge
            frequency={item.frequency}
            intervalDays={item.intervalDays}
          />
        </View>

        <View className="flex-row items-center gap-3">
          <TouchableOpacity className="p-1.5" onPress={() => onEdit(item)}>
            <Pencil size={16} color={COLORS.primary.navy} />
          </TouchableOpacity>
          <TouchableOpacity className="p-1.5" onPress={() => onRemove(item.id)}>
            <Trash2 size={16} color={COLORS.functional.error} />
          </TouchableOpacity>
        </View>
      </View>
    </View>
  )
}
