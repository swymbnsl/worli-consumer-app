import BottleReturnAlert from "@/components/home/BottleReturnAlert"
import DeliveryCalendar from "@/components/home/DeliveryCalendar"
import PremiumCard from "@/components/home/PremiumCard"
import Header from "@/components/ui/Header"
import { CATEGORIES } from "@/constants/categories"
import { useAuth } from "@/hooks/useAuth"
import { supabase } from "@/lib/supabase"
import { Order, Subscription } from "@/types/database.types"
import { useRouter } from "expo-router"
import { Search } from "lucide-react-native"
import React, { useEffect, useState } from "react"
import {
  RefreshControl,
  ScrollView,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native"

export default function HomeScreen() {
  const { user } = useAuth()
  const router = useRouter()
  const [orders, setOrders] = useState<Order[]>([])
  const [subscriptions, setSubscriptions] = useState<Subscription[]>([])
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)

  useEffect(() => {
    fetchData()
  }, [user])

  const fetchData = async () => {
    if (!user) return
    try {
      const { data: ordersData, error: ordersError } = await supabase
        .from("orders")
        .select("*")
        .eq("user_id", user.id)
        .order("delivery_date", { ascending: false })
        .limit(30)

      if (ordersError) throw ordersError
      setOrders(ordersData || [])

      const { data: subsData, error: subsError } = await supabase
        .from("subscriptions")
        .select("*")
        .eq("user_id", user.id)
        .eq("status", "active")

      if (subsError) throw subsError
      setSubscriptions(subsData || [])
    } catch (error) {
      console.error("Error fetching data:", error)
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }

  const onRefresh = () => {
    setRefreshing(true)
    fetchData()
  }

  // TODO: Implement bottle tracking when schema supports it
  const unreturnedBottles = 0

  return (
    <View className="flex-1 bg-neutral-lightCream">
      {/* 9.1 Header with Logo and Location */}
      <Header />

      <ScrollView
        className="flex-1 px-4 " // Screen padding: px-4
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor="#101B53"
          />
        }
        contentContainerStyle={{ paddingBottom: 100 }}
      >
        {/* Search Bar (Optional) */}
        <View className="relative mb-6">
          <TextInput
            className="bg-white border border-neutral-lightGray rounded-xl pl-12 pr-4 py-3 font-comfortaa text-base text-neutral-darkGray shadow-sm"
            placeholder="Search for milk, ghee..."
            placeholderTextColor="#B3B3B3"
          />
          <View className="absolute left-4 top-3.5">
            <Search size={20} color="#B3B3B3" />
          </View>
        </View>

        {/* Delivery Calendar */}
        <View className="mb-6">
          <DeliveryCalendar orders={orders} subscriptions={subscriptions} />
        </View>

        {/* Bottle Return Prompt */}
        {unreturnedBottles > 0 && (
          <View className="mb-6">
            <BottleReturnAlert
              count={unreturnedBottles}
              onPress={() => router.push("/(tabs)/orders")}
            />
          </View>
        )}

        {/* Promotional Carousel */}
        <View className="mb-6">
          <Text className="font-sofia text-lg font-bold text-primary-navy mb-4">
            Special Offers
          </Text>
          <PremiumCard onPress={() => router.push("/(tabs)/wallet")} />
        </View>

        {/* All Categories Grid */}
        <View className="mb-6">
          <Text className="font-sofia text-lg font-bold text-primary-navy mb-4">
            All Categories
          </Text>
          <View className="flex-row flex-wrap justify-between">
            {CATEGORIES.map((cat) => (
              <TouchableOpacity
                key={cat.id}
                className="bg-white rounded-2xl p-4 shadow-sm w-[48%] mb-4 active:scale-95"
                onPress={() => router.push("/product")}
              >
                <View className="bg-neutral-lightCream rounded-xl p-4 mb-3 items-center justify-center h-24">
                  {/* Placeholder Image */}
                  <View className="w-12 h-12 bg-primary-cream rounded-full items-center justify-center">
                    <Text className="text-2xl">🥛</Text>
                  </View>
                </View>
                <Text className="font-playfair text-base font-semibold text-center text-neutral-darkGray">
                  {cat.name}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>
      </ScrollView>
    </View>
  )
}
