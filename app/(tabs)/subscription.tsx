import EditModal from "@/components/subscription/EditModal"
import PauseModal from "@/components/subscription/PauseModal"
import SubscriptionCard from "@/components/subscription/SubscriptionCard"
import Header from "@/components/ui/Header"
import { useAuth } from "@/hooks/useAuth"
import { supabase } from "@/lib/supabase"
import { Subscription } from "@/types/database.types"
import { useRouter } from "expo-router"
import { Calendar, X } from "lucide-react-native"
import React, { useEffect, useState } from "react"
import {
    Alert,
    RefreshControl,
    ScrollView,
    Text,
    TouchableOpacity,
    View,
} from "react-native"

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
      const { data, error } = await supabase
        .from("subscriptions")
        .select("*")
        .eq("user_id", user.id)
        .eq("status", "active")
        .single()

      if (error && error.code !== "PGRST116") throw error
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
              const { error } = await supabase
                .from("subscriptions")
                .update({ status: "cancelled" })
                .eq("id", subscription.id)

              if (error) throw error

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
        <Header />

        {/* Empty State */}
        <View className="flex-1 justify-center items-center px-8">
          {/* Calendar Icon with X */}
          <View className="mb-8 relative">
            <View className="bg-primary-navy/5 p-6 rounded-2xl">
              <Calendar size={80} color="#7c3aed" strokeWidth={1.5} />
            </View>
            <View className="absolute -bottom-2 -right-2 bg-functional-error rounded-full p-3 border-4 border-white">
              <X size={24} color="white" strokeWidth={3} />
            </View>
          </View>

          <Text className="font-sofia-bold text-2xl text-neutral-darkGray mb-3 text-center">
            You don't have any subscriptions yet
          </Text>
          
          <TouchableOpacity
            className="bg-secondary-skyBlue px-8 py-4 rounded-xl mt-4 shadow-md"
            onPress={() => router.push("/(tabs)/home")}
            activeOpacity={0.8}
          >
            <Text className="font-sofia-bold text-white text-base">
              Start Shopping
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    )
  }

  return (
    <View className="flex-1 bg-white">
      <Header />

      <ScrollView
        className="flex-1"
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 100 }}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor="#101B53"
            colors={["#101B53"]}
          />
        }
      >
        {/* Page Title */}
        <View className="px-4 pt-4 pb-2">
          <Text className="font-sofia-bold text-2xl text-primary-navy">
            My Subscriptions
          </Text>
        </View>

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
          <TouchableOpacity
            className="bg-white mx-4 mt-4 rounded-2xl py-3 items-center border-2 border-functional-error/20"
            onPress={handleCancelSubscription}
            activeOpacity={0.7}
          >
            <Text className="font-sofia-bold text-sm text-functional-error">
              Cancel Subscription
            </Text>
          </TouchableOpacity>
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
