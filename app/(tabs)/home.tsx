import SubscriptionBottomSheet, {
  SubscriptionBottomSheetRef,
} from "@/components/cart/SubscriptionBottomSheet"
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
import { useCart } from "@/hooks/useCart"
import {
  fetchActiveOffers,
  fetchActiveProducts,
  fetchActiveSubscriptions,
  fetchHomeOrders,
  fetchUserAddresses,
} from "@/lib/supabase-service"
import {
  Address,
  Offer,
  Order,
  Product,
  Subscription,
} from "@/types/database.types"
import { useRouter } from "expo-router"
import { ShoppingCart } from "lucide-react-native"
import React, { useCallback, useEffect, useRef, useState } from "react"
import {
  RefreshControl,
  ScrollView,
  Text,
  TouchableOpacity,
  View,
} from "react-native"
import Animated, { FadeInDown } from "react-native-reanimated"

export default function HomeScreen() {
  const { user } = useAuth()
  const router = useRouter()
  const { itemCount } = useCart()
  const subscriptionSheetRef = useRef<SubscriptionBottomSheetRef>(null)

  // State
  const [orders, setOrders] = useState<Order[]>([])
  const [subscriptions, setSubscriptions] = useState<Subscription[]>([])
  const [products, setProducts] = useState<Product[]>([])
  const [offers, setOffers] = useState<Offer[]>([])
  const [defaultAddress, setDefaultAddress] = useState<Address | null>(null)
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
      const [
        ordersData,
        subscriptionsData,
        productsData,
        offersData,
        addressesData,
      ] = await Promise.all([
        user ? fetchHomeOrders(user.id) : Promise.resolve([]),
        user ? fetchActiveSubscriptions(user.id) : Promise.resolve([]),
        fetchActiveProducts(),
        fetchActiveOffers(),
        user ? fetchUserAddresses(user.id) : Promise.resolve([]),
      ])

      setOrders(ordersData)
      setSubscriptions(subscriptionsData)
      setProducts(productsData)
      setOffers(offersData)

      // First address is default (sorted by is_default desc)
      const defAddr =
        addressesData.find((a) => a.is_default) || addressesData[0] || null
      setDefaultAddress(defAddr)
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

  // Handle add product to subscription cart
  const handleAddProduct = (product: Product) => {
    subscriptionSheetRef.current?.open(product)
  }

  return (
    <View className="flex-1 bg-neutral-lightCream">
      {/* Header with Logo and Location */}
      <Header
        location={
          defaultAddress?.name || defaultAddress?.landmark || "Add Address"
        }
        onLocationPress={() => router.push("/add-address")}
      />

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
          className="mb-2 bg-neutral-lightCream"
        >
          <DateStrip
            orders={orders}
            selectedDate={selectedDate}
            onSelectDate={setSelectedDate}
          />
        </Animated.View>

        {/* Calendar Legend */}
        <View className="mb-4 bg-neutral-lightCream pb-3">
          <CalendarLegend />
        </View>

        {/* Today's Delivery Status Card */}
        <Animated.View entering={FadeInDown.duration(400).delay(200)} className="px-4 mb-5 bg-neutral-lightCream rounded-2xl">
          <TodayDeliveryCard
            selectedDate={selectedDate}
            order={selectedDateOrder}
          />
        </Animated.View>

        {/* Promotional Banners Carousel */}
        <Animated.View entering={FadeInDown.duration(400).delay(250)} className="mb-6 bg-neutral-lightCream rounded-2xl">
          <PromoBanner offers={offers} onPressOffer={handleOfferPress} />
        </Animated.View>

        <View className="px-4">
          <Animated.View entering={FadeInDown.duration(400).delay(300)}>
            <Text className="font-sofia-bold text-xl text-primary-navy mb-4">
              All Products
            </Text>
          </Animated.View>

          <CategoriesGrid
            products={products}
            isLoading={loading}
            onAddProduct={handleAddProduct}
          />
        </View>
      </ScrollView>

      {/* Floating Action Button — Cart */}
      {itemCount > 0 && (
        <TouchableOpacity
          className="absolute bottom-4 right-4 w-14 h-14 rounded-full bg-primary-navy items-center justify-center"
          style={{
            shadowColor: "#000",
            shadowOffset: { width: 0, height: 4 },
            shadowOpacity: 0.25,
            shadowRadius: 8,
            elevation: 8,
          }}
          activeOpacity={0.8}
          onPress={() => router.push("/cart")}
        >
          <ShoppingCart size={22} color={COLORS.neutral.white} />
          {/* Badge */}
          <View className="absolute -top-1 -right-1 w-5 h-5 rounded-full bg-neutral-lightCream border border-primary-navy items-center justify-center">
            <Text className="font-sofia-bold text-[10px] text-primary-navy">
              {itemCount}
            </Text>
          </View>
        </TouchableOpacity>
      )}

      {/* Subscription Bottom Sheet */}
      <SubscriptionBottomSheet ref={subscriptionSheetRef} />
    </View>
  )
}
