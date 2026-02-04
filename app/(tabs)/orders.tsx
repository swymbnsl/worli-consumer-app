import OrderCard from "@/components/orders/OrderCard"
import Header from "@/components/ui/Header"
import { useAuth } from "@/hooks/useAuth"
import { supabase } from "@/lib/supabase"
import { Order } from "@/types/database.types"
import { useRouter } from "expo-router"
import React, { useEffect, useState } from "react"
import { FlatList, RefreshControl, Text, View } from "react-native"

export default function OrdersScreen() {
  const router = useRouter()
  const { user } = useAuth()
  const [orders, setOrders] = useState<Order[]>([])
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)

  useEffect(() => {
    fetchOrders()
  }, [user])

  const fetchOrders = async () => {
    if (!user) return

    try {
      const { data, error } = await supabase
        .from("orders")
        .select("*")
        .eq("user_id", user.id)
        .order("delivery_date", { ascending: false })

      if (error) throw error
      setOrders(data || [])
    } catch (error) {
      console.error("Error fetching orders:", error)
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }

  const onRefresh = () => {
    setRefreshing(true)
    fetchOrders()
  }

  const handleOrderPress = (orderId: string) => {
    router.push(`/order-detail?id=${orderId}`)
  }

  return (
    <View className="flex-1 bg-neutral-lightCream">
      <Header />

      {/* Orders List */}
      {orders.length === 0 && !loading ? (
        <View className="flex-1 justify-center items-center px-6">
          <Text className="text-5xl mb-4">📦</Text>
          <Text className="font-sofia-bold text-lg text-primary-navy mb-2">
            No Orders Yet
          </Text>
          <Text className="font-comfortaa text-sm text-neutral-gray text-center">
            Your order history will appear here
          </Text>
        </View>
      ) : (
        <FlatList
          data={orders}
          keyExtractor={(item) => item.id}
          className="flex-1 px-4 pt-6"
          showsVerticalScrollIndicator={false}
          renderItem={({ item }) => (
            <OrderCard order={item} onPress={() => handleOrderPress(item.id)} />
          )}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              tintColor="#101B53"
            />
          }
          contentContainerStyle={{ paddingBottom: 100 }}
        />
      )}
    </View>
  )
}
