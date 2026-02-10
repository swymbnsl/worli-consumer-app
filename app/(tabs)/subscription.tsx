import EditModal from "@/components/subscription/EditModal"
import PauseModal from "@/components/subscription/PauseModal"
import SubscriptionCard from "@/components/subscription/SubscriptionCard"
import Button from "@/components/ui/Button"
import { COLORS } from "@/constants/theme"
import { useAuth } from "@/hooks/useAuth"
import {
  cancelSubscription as cancelSub,
  fetchActiveSubscription,
} from "@/lib/supabase-service"
import { Subscription } from "@/types/database.types"
import { useRouter } from "expo-router"
import { Calendar, X } from "lucide-react-native"
import React, { useEffect, useState } from "react"
import { Alert, RefreshControl, ScrollView, Text, View } from "react-native"

export default function SubscriptionScreen() {
  const { user } = useAuth()
  const router = useRouter()
  const [subscription, setSubscription] = useState<Subscription | null>(null)
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [pauseModalVisible, setPauseModalVisible] = useState(false)
  const [editModalVisible, setEditModalVisible] = useState(false)

  useEffect(() => {
    fetchSubscription()
  }, [user])

  const fetchSubscription = async () => {
    if (!user) return

    try {
      const data = await fetchActiveSubscription(user.id)
      setSubscription(data)
    } catch (error) {
      console.error("Error fetching subscription:", error)
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }

  const onRefresh = () => {
    setRefreshing(true)
    fetchSubscription()
  }

  const handleCancelSubscription = () => {
    Alert.alert(
      "Cancel Subscription",
      "Are you sure you want to cancel your subscription? This action cannot be undone.",
      [
        { text: "Keep Subscription", style: "cancel" },
        {
          text: "Cancel Subscription",
          style: "destructive",
          onPress: async () => {
            if (!subscription) return

            try {
              await cancelSub(subscription.id)

              Alert.alert(
                "Subscription Cancelled",
                "Your subscription has been cancelled successfully.",
              )
              fetchSubscription()
            } catch (error) {
              console.error("Error cancelling subscription:", error)
              Alert.alert(
                "Error",
                "Failed to cancel subscription. Please try again.",
              )
            }
          },
        },
      ],
    )
  }

  if (!subscription && !loading) {
    return (
      <View className="flex-1 bg-white">
        {/* Page Title */}
        <View className="bg-primary-navy px-5 pt-14 pb-5">
          <Text className="font-sofia-bold text-2xl text-white">
            My Subscriptions
          </Text>
        </View>

        {/* Empty State */}
        <View className="flex-1 justify-center items-center px-8">
          {/* Calendar Icon with X */}
          <View className="mb-8 relative">
            <View className="bg-primary-navy/5 p-6 rounded-2xl">
              <Calendar
                size={80}
                color={COLORS.primary.navy}
                strokeWidth={1.5}
              />
            </View>
            <View className="absolute -bottom-2 -right-2 bg-functional-error rounded-full p-3 border-4 border-white">
              <X size={24} color="white" strokeWidth={3} />
            </View>
          </View>

          <Text className="font-sofia-bold text-2xl text-neutral-darkGray mb-3 text-center">
            You don't have any subscriptions yet
          </Text>

          <View className="mt-4 w-full px-8">
            <Button
              title="Start Shopping"
              onPress={() => router.push("/(tabs)/home")}
              variant="navy"
              size="large"
            />
          </View>
        </View>
      </View>
    )
  }

  return (
    <View className="flex-1 bg-white">
      {/* Page Title */}
      <View className="bg-primary-navy px-5 pt-14 pb-5">
        <Text className="font-sofia-bold text-2xl text-white">
          My Subscriptions
        </Text>
      </View>

      <ScrollView
        className="flex-1"
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 100 }}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={COLORS.primary.navy}
            colors={[COLORS.primary.navy]}
          />
        }
      >
        {/* Active Subscription Card */}
        {subscription && (
          <SubscriptionCard
            subscription={subscription}
            onEdit={() => setEditModalVisible(true)}
            onPause={() => setPauseModalVisible(true)}
          />
        )}

        {/* Cancel Subscription Button */}
        {subscription && (
          <View className="px-4 mt-4">
            <Button
              title="Cancel Subscription"
              onPress={handleCancelSubscription}
              variant="outline"
              size="medium"
            />
          </View>
        )}
      </ScrollView>

      {/* Pause Modal */}
      {subscription && (
        <PauseModal
          visible={pauseModalVisible}
          onClose={() => setPauseModalVisible(false)}
          subscription={subscription}
          onUpdate={fetchSubscription}
        />
      )}

      {/* Edit Modal */}
      {subscription && (
        <EditModal
          visible={editModalVisible}
          onClose={() => setEditModalVisible(false)}
          subscription={subscription}
          onUpdate={fetchSubscription}
        />
      )}
    </View>
  )
}
