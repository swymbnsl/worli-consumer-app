import Header from "@/components/ui/Header"
import { COLORS } from "@/constants/theme"
import { supabase } from "@/lib/supabase"
import { Product } from "@/types/database.types"
import { formatCurrency } from "@/utils/formatters"
import { Image } from "expo-image"
import { useLocalSearchParams, useRouter } from "expo-router"
import { CheckCircle } from "lucide-react-native"
import React, { useEffect, useState } from "react"
import {
  ActivityIndicator,
  ScrollView,
  Text,
  TouchableOpacity,
  View,
} from "react-native"
import Animated, { FadeInDown } from "react-native-reanimated"

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

const defaultFeatures = [
  "100% Pure & Fresh",
  "Farm Fresh Quality",
  "No Preservatives",
  "Rich in Nutrients",
  "Eco-Friendly Packaging",
]

const defaultNutritionalInfo = [
  { label: "Energy", value: "66 kcal" },
  { label: "Protein", value: "3.2g" },
  { label: "Fat", value: "3.5g" },
  { label: "Carbohydrates", value: "4.8g" },
  { label: "Calcium", value: "120mg" },
  { label: "Vitamin D", value: "0.1µg" },
]

const defaultDeliveryInfo = [
  {
    title: "Fresh Daily Delivery",
    description: "Delivered fresh every morning between 6:00 AM - 8:00 AM",
  },
  {
    title: "Glass Bottle Packaging",
    description: "Eco-friendly glass bottles that preserve freshness and taste",
  },
  {
    title: "Easy Returns",
    description: "Return empty bottles during your next delivery",
  },
  {
    title: "Quality Guaranteed",
    description: "100% satisfaction guarantee or full refund",
  },
]

export default function ProductScreen() {
  const router = useRouter()
  const { productId } = useLocalSearchParams()
  const [product, setProduct] = useState<Product | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (productId) {
      fetchProduct()
    }
  }, [productId])

  const fetchProduct = async () => {
    try {
      setLoading(true)
      const { data, error } = await supabase
        .from("products")
        .select("*")
        .eq("id", productId)
        .single()

      if (error) throw error
      setProduct(data)
    } catch (error) {
      console.error("Error fetching product:", error)
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <View className="flex-1 bg-neutral-lightCream">
        <Header />
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator size="large" color={COLORS.primary.navy} />
        </View>
      </View>
    )
  }

  if (!product) {
    return (
      <View className="flex-1 bg-neutral-lightCream">
        <Header />
        <View className="flex-1 items-center justify-center px-8">
          <Text className="text-4xl mb-4">😕</Text>
          <Text className="font-sofia-bold text-xl text-primary-navy text-center mb-4">
            Product Not Found
          </Text>
          <TouchableOpacity
            className="bg-primary-orange px-6 py-3 rounded-xl"
            onPress={() => router.back()}
          >
            <Text className="font-sofia-bold text-white">Go Back</Text>
          </TouchableOpacity>
        </View>
      </View>
    )
  }

  const emoji = getProductEmoji(product.name)

  return (
    <View className="flex-1 bg-neutral-lightCream">
      {/* Header */}
      <Header />

      <ScrollView
        className="flex-1"
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 100 }}
      >
        {/* Product Image Section */}
        <Animated.View
          entering={FadeInDown.duration(400)}
          className="bg-white items-center py-16"
        >
          <View className="w-52 h-52 rounded-3xl bg-primary-cream items-center justify-center shadow-lg">
            {product.image_url ? (
              <Image
                source={{ uri: product.image_url }}
                style={{ width: 180, height: 180 }}
                contentFit="contain"
                transition={200}
              />
            ) : (
              <Text className="text-[120px]">{emoji}</Text>
            )}
          </View>
        </Animated.View>

        {/* Product Details Section */}
        <Animated.View
          entering={FadeInDown.duration(400).delay(100)}
          className="bg-white px-6 pt-8 pb-10"
        >
          <Text className="text-3xl font-sofia-bold text-primary-navy mb-2">
            {product.name}
          </Text>
          {product.volume && (
            <Text className="text-base font-comfortaa text-neutral-gray mb-5">
              {product.volume}
            </Text>
          )}
          <Text className="text-4xl font-sofia-bold text-primary-orange mb-7">
            {formatCurrency(product.price)}
          </Text>

          {product.description && (
            <Text className="text-base font-comfortaa text-neutral-darkGray leading-6 mb-8">
              {product.description}
            </Text>
          )}

          {/* Key Features */}
          <Text className="text-xl font-sofia-bold text-primary-navy mb-5">
            Key Features
          </Text>
          {defaultFeatures.map((feature, idx) => (
            <View key={idx} className="flex-row items-center mb-4">
              <View className="w-8 h-8 rounded-lg bg-functional-success/10 items-center justify-center mr-3">
                <CheckCircle size={18} color={COLORS.functional.success} />
              </View>
              <Text className="flex-1 text-base font-comfortaa text-primary-navy">
                {feature}
              </Text>
            </View>
          ))}
        </Animated.View>

        {/* Nutritional Information */}
        <Animated.View
          entering={FadeInDown.duration(400).delay(200)}
          className="bg-white mx-5 mt-4 rounded-2xl p-6 shadow-md"
        >
          <Text className="text-xl font-sofia-bold text-primary-navy mb-4">
            Nutritional Information
          </Text>
          <Text className="text-sm font-comfortaa text-neutral-gray mb-3">
            Per 100ml serving
          </Text>

          {defaultNutritionalInfo.map((nutrient, idx, arr) => (
            <View key={idx}>
              <View className="flex-row justify-between py-3">
                <Text className="font-comfortaa text-neutral-gray text-sm">
                  {nutrient.label}
                </Text>
                <Text className="font-comfortaa-bold text-primary-navy text-sm">
                  {nutrient.value}
                </Text>
              </View>
              {idx < arr.length - 1 && (
                <View className="h-[1px] bg-neutral-lightGray my-1" />
              )}
            </View>
          ))}
        </Animated.View>

        {/* Delivery Information */}
        <Animated.View
          entering={FadeInDown.duration(400).delay(300)}
          className="bg-white mx-5 mt-4 rounded-2xl p-6 shadow-md"
        >
          <Text className="text-xl font-sofia-bold text-primary-navy mb-4">
            Delivery Information
          </Text>

          {defaultDeliveryInfo.map((info, idx) => (
            <View key={idx} className={idx < 3 ? "mb-5" : ""}>
              <Text className="text-base font-comfortaa-bold text-primary-navy mb-1">
                {info.title}
              </Text>
              <Text className="text-sm font-comfortaa text-neutral-gray leading-5">
                {info.description}
              </Text>
            </View>
          ))}
        </Animated.View>

        {/* Add to Cart Button */}
        <View className="px-5 py-8">
          <TouchableOpacity
            className="bg-primary-orange rounded-xl py-5 items-center shadow-lg active:opacity-90"
            onPress={() =>
              router.push({
                pathname: "/cart",
                params: { productId: product.id },
              })
            }
          >
            <Text className="font-sofia-bold text-white text-lg">
              Add to Cart
            </Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </View>
  )
}
