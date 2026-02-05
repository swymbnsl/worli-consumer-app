import {
  CalendarLegend,
  CategoriesGrid,
  DateStrip,
  PromoBanner,
  SearchBar,
  TodayDeliveryCard,
} from "@/components/home"
import Header from "@/components/ui/Header"
import { useAuth } from "@/hooks/useAuth"
import { supabase } from "@/lib/supabase"
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
      // Fetch orders (last 7 days + future 30 days)
      const sevenDaysAgo = new Date()
      sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7)

      const ordersPromise = user
        ? supabase
            .from("orders")
            .select("*")
            .eq("user_id", user.id)
            .gte("delivery_date", sevenDaysAgo.toISOString().split("T")[0])
            .order("delivery_date", { ascending: true })
        : Promise.resolve({ data: [], error: null })

      // Fetch active subscriptions
      const subscriptionsPromise = user
        ? supabase
            .from("subscriptions")
            .select("*")
            .eq("user_id", user.id)
            .eq("status", "active")
        : Promise.resolve({ data: [], error: null })

      // Fetch active products
      const productsPromise = supabase
        .from("products")
        .select("*")
        .eq("is_active", true)
        .order("name", { ascending: true })

      // Fetch active offers
      const offersPromise = supabase
        .from("offers")
        .select("*")
        .eq("is_active", true)
        .order("display_order", { ascending: true })

      // Execute all in parallel
      const [ordersResult, subscriptionsResult, productsResult, offersResult] =
        await Promise.all([
          ordersPromise,
          subscriptionsPromise,
          productsPromise,
          offersPromise,
        ])

      if (ordersResult.error) throw ordersResult.error
      if (subscriptionsResult.error) throw subscriptionsResult.error
      if (productsResult.error) throw productsResult.error
      if (offersResult.error) throw offersResult.error

      setOrders(ordersResult.data || [])
      setSubscriptions(subscriptionsResult.data || [])
      setProducts(productsResult.data || [])
      setOffers(offersResult.data || [])
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
    <View className="flex-1 bg-neutral-lightCream">
      {/* Header with Logo and Location */}
      <Header />

      <ScrollView
        className="flex-1"
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor="#101B53"
            colors={["#101B53"]}
          />
        }
        contentContainerStyle={{ paddingBottom: 120 }}
      >
        {/* Search Bar */}
        <View className="px-4 mt-4 mb-5">
          <SearchBar onPress={handleSearchPress} />
        </View>

        {/* Date Strip Calendar */}
        <Animated.View
          entering={FadeInDown.duration(400).delay(150)}
          className="mb-2"
        >
          <DateStrip
            orders={orders}
            selectedDate={selectedDate}
            onSelectDate={setSelectedDate}
          />
        </Animated.View>

        {/* Calendar Legend */}
        <View className="mb-4">
          <CalendarLegend />
        </View>

        {/* Today's Delivery Status Card */}
        <View className="px-4 mb-6">
          <TodayDeliveryCard
            selectedDate={selectedDate}
            order={selectedDateOrder}
          />
        </View>

        {/* Promotional Banners Carousel */}
        {offers.length > 0 && (
          <View className="mb-6">
            <PromoBanner offers={offers} onPressOffer={handleOfferPress} />
          </View>
        )}

        {/* All Categories Section */}
        <View className="px-4">
          <Animated.View entering={FadeInDown.duration(400).delay(300)}>
            <Text className="font-sofia-bold text-xl text-primary-navy mb-4">
              All Categories
            </Text>
          </Animated.View>

          <CategoriesGrid products={products} isLoading={loading} />
        </View>
      </ScrollView>
    </View>
  )
}
