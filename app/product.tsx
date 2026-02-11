import ProductImage from "@/components/common/ProductImage"
import SubscriptionBottomSheet, {
  SubscriptionBottomSheetRef,
} from "@/components/cart/SubscriptionBottomSheet"
import Button from "@/components/ui/Button"
import PageHeader from "@/components/ui/PageHeader"
import { COLORS } from "@/constants/theme"
import { fetchProductById } from "@/lib/supabase-service"
import { Product } from "@/types/database.types"
import { formatCurrency } from "@/utils/formatters"
import { useLocalSearchParams, useRouter } from "expo-router"
import { CheckCircle } from "lucide-react-native"
import React, { useEffect, useRef, useState } from "react"
import { ActivityIndicator, ScrollView, Text, View } from "react-native"
import Animated, { FadeInDown } from "react-native-reanimated"

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
  const subscriptionSheetRef = useRef<SubscriptionBottomSheetRef>(null)

  useEffect(() => {
    if (productId) {
      fetchProduct()
    }
  }, [productId])

  const fetchProduct = async () => {
    try {
      setLoading(true)
      const data = await fetchProductById(productId as string)
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
        <PageHeader title="Product Details" />
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator size="large" color={COLORS.primary.navy} />
        </View>
      </View>
    )
  }

  if (!product) {
    return (
      <View className="flex-1 bg-neutral-lightCream">
        <PageHeader title="Product Details" />
        <View className="flex-1 items-center justify-center px-8">
          <Text className="text-4xl mb-4">😕</Text>
          <Text className="font-sofia-bold text-xl text-primary-navy text-center mb-6">
            Product Not Found
          </Text>
          <Button
            title="Go Back"
            onPress={() => router.back()}
            variant="primary"
            size="medium"
            fullWidth={false}
          />
        </View>
      </View>
    )
  }

  return (
    <View className="flex-1 bg-neutral-lightCream">
      {/* Header */}
      <PageHeader title={product.name} subtitle="PRODUCT DETAILS" />

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
          <ProductImage
            imageUrl={product.image_url}
            size="large"
            containerClassName="shadow-lg"
          />
        </Animated.View>

        {/* Product Details Section */}
        <Animated.View
          entering={FadeInDown.duration(400).delay(100)}
          className="bg-white px-6 pt-8 pb-10"
        >
          <Text className="text-2xl font-sofia-bold text-primary-navy mb-2">
            {product.name}
          </Text>
          {product.volume && (
            <Text className="text-sm font-comfortaa text-neutral-gray mb-5">
              {product.volume}
            </Text>
          )}
          <Text className="text-2xl font-sofia-bold text-primary-orange mb-7">
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
          <Button
            title="Subscribe"
            onPress={() => subscriptionSheetRef.current?.open(product)}
            variant="primary"
            size="large"
          />
        </View>
      </ScrollView>

      {/* Subscription Bottom Sheet */}
      <SubscriptionBottomSheet ref={subscriptionSheetRef} />
    </View>
  )
}
