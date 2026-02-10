import {
  CalendarLegend,
  CategoriesGrid,
  DateStrip,
  PromoBanner,
  TodayDeliveryCard,
} from "@/components/home"
import Header from "@/components/ui/Header"
import { COLORS } from "@/constants/theme"
import { useAuth } from "@/hooks/useAuth"
import {
  fetchActiveOffers,
  fetchActiveProducts,
  fetchActiveSubscriptions,
  fetchHomeOrders,
} from "@/lib/supabase-service"
import { Offer, Order, Product, Subscription } from "@/types/database.types"
import { useRouter } from "expo-router"
import React, { useCallback, useEffect, useState } from "react"
import { RefreshControl, ScrollView, Text, View } from "react-native"
import Animated, { FadeInDown } from "react-native-reanimated"

export default function HomeScreen() {
  const { user } = useAuth()
  const router = useRouter()

  // State
  const [orders, setOrders] = useState<Order[]>([])
  const [subscriptions, setSubscriptions] = useState<Subscription[]>([])
  const [products, setProducts] = useState<Product[]>([])
  const [offers, setOffers] = useState<Offer[]>([])
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)

  // Selected date for calendar (using local date to avoid timezone issues)
  const getTodayLocalDate = () => {
    const today = new Date()
    const year = today.getFullYear()
    const month = String(today.getMonth() + 1).padStart(2, "0")
    const day = String(today.getDate()).padStart(2, "0")
    return `${year}-${month}-${day}`
  }
  const [selectedDate, setSelectedDate] = useState<string>(getTodayLocalDate())

  // Fetch all data
  const fetchData = useCallback(async () => {
    try {
      const [ordersData, subscriptionsData, productsData, offersData] =
        await Promise.all([
          user ? fetchHomeOrders(user.id) : Promise.resolve([]),
          user ? fetchActiveSubscriptions(user.id) : Promise.resolve([]),
          fetchActiveProducts(),
          fetchActiveOffers(),
        ])

      setOrders(ordersData)
      setSubscriptions(subscriptionsData)
      setProducts(productsData)
      setOffers(offersData)
    } catch (error) {
      console.error("Error fetching home data:", error)
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }, [user])

  useEffect(() => {
    fetchData()
  }, [fetchData])

  const onRefresh = useCallback(() => {
    setRefreshing(true)
    fetchData()
  }, [fetchData])

  // Get order for selected date
  const selectedDateOrder = orders.find(
    (order) => order.delivery_date === selectedDate,
  )

  // Handle offer press
  const handleOfferPress = (offer: Offer) => {
    if (offer.link_url) {
      // Navigate to offer link (could be product, subscription, etc.)
      router.push(offer.link_url as any)
    }
  }

  // Handle search press
  const handleSearchPress = () => {
    // Navigate to search screen (to be implemented)
    // router.push("/search")
  }

  return (
    <View className="flex-1 bg-white">
      {/* Header with Logo and Location */}
      <Header />

      <ScrollView
        className="flex-1"
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={COLORS.primary.navy}
            colors={[COLORS.primary.navy]}
          />
        }
        contentContainerStyle={{ paddingBottom: 120 }}
      >
        {/* Date Strip Calendar */}
        <Animated.View
          entering={FadeInDown.duration(400).delay(150)}
          className="mb-2 bg-neutral-lightCream/30"
        >
          <DateStrip
            orders={orders}
            selectedDate={selectedDate}
            onSelectDate={setSelectedDate}
          />
        </Animated.View>

        {/* Calendar Legend */}
        <View className="mb-4 bg-neutral-lightCream/30 pb-3">
          <CalendarLegend />
        </View>

        {/* Today's Delivery Status Card */}
        <View className="px-4 mb-5">
          <TodayDeliveryCard
            selectedDate={selectedDate}
            order={selectedDateOrder}
          />
        </View>

        {/* Promotional Banners Carousel */}
        <View className="mb-6">
          <PromoBanner offers={offers} onPressOffer={handleOfferPress} />
        </View>

        <View className="px-4">
          <Animated.View entering={FadeInDown.duration(400).delay(300)}>
            <Text className="font-sofia-bold text-xl text-primary-navy mb-4">
              All Products
            </Text>
          </Animated.View>

          <CategoriesGrid products={products} isLoading={loading} />
        </View>
      </ScrollView>
    </View>
  )
}
