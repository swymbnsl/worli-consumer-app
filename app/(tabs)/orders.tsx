import FullCalendar from "@/components/orders/FullCalendar"
import OrderCard from "@/components/orders/OrderCard"
import Button from "@/components/ui/Button"
import { COLORS } from "@/constants/theme"
import { useAuth } from "@/hooks/useAuth"
import { fetchAllOrders } from "@/lib/supabase-service"
import { Order } from "@/types/database.types"
import { formatFullDate } from "@/utils/dateUtils"
import { useRouter } from "expo-router"
import React, { useEffect, useState } from "react"
import { RefreshControl, ScrollView, Text, View } from "react-native"

export default function OrdersScreen() {
  const router = useRouter()
  const { user } = useAuth()
  const [orders, setOrders] = useState<Order[]>([])
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [selectedDate, setSelectedDate] = useState(
    new Date().toISOString().split("T")[0],
  )

  useEffect(() => {
    fetchOrders()
  }, [user])

  const fetchOrders = async () => {
    if (!user) return

    try {
      const data = await fetchAllOrders(user.id)
      setOrders(data)
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

  // Filter orders for selected date
  const selectedOrders = orders.filter((o) => o.delivery_date === selectedDate)

  return (
    <View className="flex-1 bg-neutral-lightCream">
      {/* Page Title */}
      <View className="bg-primary-navy px-5 pt-14 pb-5">
        <Text className="font-sofia-bold text-2xl text-white">My Orders</Text>
      </View>

      <ScrollView
        className="flex-1 px-4 pt-4"
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 100 }}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={COLORS.primary.navy}
          />
        }
      >
        <FullCalendar
          orders={orders}
          selectedDate={selectedDate}
          onDateSelect={setSelectedDate}
        />

        <View className="mb-6">
          <Text className="font-sofia-bold text-xl text-primary-navy text-center mb-6">
            {formatFullDate(selectedDate)}
          </Text>

          {selectedOrders.length > 0 ? (
            <View>
              {selectedOrders.map((order) => (
                <OrderCard
                  key={order.id}
                  order={order}
                  onPress={() => handleOrderPress(order.id)}
                />
              ))}
            </View>
          ) : (
            <View className="items-center py-6">
              <Text className="font-comfortaa-bold text-lg text-primary-navy mb-4 text-center">
                There are no orders scheduled for this day
              </Text>
              <Button
                title="Add Products"
                onPress={() => router.push("/(tabs)/home")}
                variant="navy"
                size="medium"
              />
            </View>
          )}
        </View>
      </ScrollView>

      {/* WhatsApp Button could go here absolutely positioned if needed */}
    </View>
  )
}
