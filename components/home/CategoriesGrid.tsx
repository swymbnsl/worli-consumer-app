import { COLORS } from "@/constants/theme"
import { Product } from "@/types/database.types"
import { formatCurrency } from "@/utils/formatters"
import { Image } from "expo-image"
import { useRouter } from "expo-router"
import { Plus } from "lucide-react-native"
import React from "react"
import { ActivityIndicator, Text, TouchableOpacity, View } from "react-native"
import Animated, { FadeInUp } from "react-native-reanimated"

// Define category structure based on unique product types
interface Category {
  id: string
  name: string
  image_url: string | null
  productCount: number
  emoji: string
  price: number
  product: Product
}

interface CategoriesGridProps {
  products: Product[]
  isLoading?: boolean
}

// Map product names to emojis for fallback
const productEmojis: Record<string, string> = {
  milk: "🥛",
  "high protein": "💪",
  curd: "🥣",
  paneer: "🧀",
  ghee: "🍯",
  butter: "🧈",
  yogurt: "🥛",
  cream: "🍦",
  default: "🥛",
}

const getProductEmoji = (name: string): string => {
  const lowerName = name.toLowerCase()
  for (const [key, emoji] of Object.entries(productEmojis)) {
    if (lowerName.includes(key)) {
      return emoji
    }
  }
  return productEmojis.default
}

// Group products by category (using name patterns for now)
const groupProductsIntoCategories = (products: Product[]): Category[] => {
  // For now, create categories based on unique products
  // In a real app, you'd have a categories table
  const categoryMap = new Map<string, Category>()

  products.forEach((product) => {
    const categoryName = product.name
    if (!categoryMap.has(product.id)) {
      categoryMap.set(product.id, {
        id: product.id,
        name: product.name,
        image_url: product.image_url,
        productCount: 1,
        emoji: getProductEmoji(product.name),
        price: product.price,
        product: product,
      })
    }
  })

  return Array.from(categoryMap.values())
}

export default function CategoriesGrid({
  products,
  isLoading = false,
}: CategoriesGridProps) {
  const router = useRouter()
  const categories = groupProductsIntoCategories(products)

  const handleCategoryPress = (category: Category) => {
    // Navigate to product page with category filter
    router.push({
      pathname: "/product",
      params: { productId: category.id },
    })
  }

  const handleAddToCart = (e: any, product: Product) => {
    e.stopPropagation() // Prevent navigation when clicking add button

    // Navigate to cart with product pre-selected
    router.push({
      pathname: "/cart",
      params: { productId: product.id },
    })
  }

  if (isLoading) {
    return (
      <View className="items-center justify-center py-8">
        <ActivityIndicator size="large" color={COLORS.primary.navy} />
      </View>
    )
  }

  if (categories.length === 0) {
    return (
      <View className="items-center justify-center py-8">
        <Text className="text-4xl mb-3">📦</Text>
        <Text className="font-comfortaa text-neutral-gray text-center">
          No products available
        </Text>
      </View>
    )
  }

  return (
    <View className="flex-row flex-wrap justify-between">
      {categories.map((category, index) => (
        <Animated.View
          key={category.id}
          entering={FadeInUp.delay(index * 80).duration(400)}
          className="w-[48%] mb-4"
        >
          <TouchableOpacity
            className="bg-white rounded-2xl p-4 shadow-sm active:scale-95"
            onPress={() => handleCategoryPress(category)}
            activeOpacity={0.8}
          >
            {/* Product Image */}
            <View className="bg-neutral-lightCream/50 rounded-3xl p-4 mb-3 items-center justify-center h-24">
              {category.image_url ? (
                <Image
                  source={{ uri: category.image_url }}
                  style={{ width: 90, height: 90 }}
                  contentFit="contain"
                  transition={200}
                />
              ) : (
                <Text className="text-4xl">{category.emoji}</Text>
              )}
            </View>

            {/* Category Name */}
            <Text
              className="font-sofia-bold text-base text-primary-navy mb-2"
              numberOfLines={2}
            >
              {category.name}
            </Text>

            {/* Price and Add Button */}
            <View className="flex-row items-center justify-between mt-1">
              <Text className="font-sofia-bold text-lg text-primary-orange">
                {formatCurrency(category.price)}
              </Text>
              <TouchableOpacity
                className="bg-primary-navy w-8 h-8 rounded-lg items-center justify-center active:opacity-80"
                onPress={(e) => handleAddToCart(e, category.product)}
              >
                <Plus
                  size={18}
                  color={COLORS.neutral.white}
                  strokeWidth={2.5}
                />
              </TouchableOpacity>
            </View>
          </TouchableOpacity>
        </Animated.View>
      ))}
    </View>
  )
}
