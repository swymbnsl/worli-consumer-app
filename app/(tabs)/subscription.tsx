import EditModal from "@/components/subscription/EditModal"
import PauseModal from "@/components/subscription/PauseModal"
import SubscriptionCard from "@/components/subscription/SubscriptionCard"
import Button from "@/components/ui/Button"
import PageHeader from "@/components/ui/PageHeader"
import { COLORS } from "@/constants/theme"
import { useAuth } from "@/hooks/useAuth"
import {
  cancelSubscription as cancelSub,
  fetchActiveSubscriptions,
} from "@/lib/supabase-service"
import { Subscription } from "@/types/database.types"
import { useRouter } from "expo-router"
import { Calendar, X } from "lucide-react-native"
import React, { useEffect, useState } from "react"
import { RefreshControl, ScrollView, Text, View } from "react-native"
import {
  showErrorToast,
  showSuccessToast,
} from "@/components/ui/Toast"
import { ConfirmModal } from "@/components/ui/Modal"

export default function SubscriptionScreen() {
  const { user } = useAuth()
  const router = useRouter()
  const [subscriptions, setSubscriptions] = useState<Subscription[]>([])
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [pauseModalVisible, setPauseModalVisible] = useState(false)
  const [editModalVisible, setEditModalVisible] = useState(false)
  const [selectedSubscription, setSelectedSubscription] =
    useState<Subscription | null>(null)
  const [showCancelModal, setShowCancelModal] = useState(false)
  const [cancellingSubscription, setCancellingSubscription] =
    useState<Subscription | null>(null)

  useEffect(() => {
    fetchSubscriptions()
  }, [user])

  const fetchSubscriptions = async () => {
    if (!user) return

    try {
      const data = await fetchActiveSubscriptions(user.id)
      setSubscriptions(data)
    } catch (error) {
      console.error("Error fetching subscriptions:", error)
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }

  const onRefresh = () => {
    setRefreshing(true)
    fetchSubscriptions()
  }

  const handleEditSubscription = (subscription: Subscription) => {
    setSelectedSubscription(subscription)
    setEditModalVisible(true)
  }

  const handlePauseSubscription = (subscription: Subscription) => {
    setSelectedSubscription(subscription)
    setPauseModalVisible(true)
  }

  const handleCancelSubscription = (subscription: Subscription) => {
    setCancellingSubscription(subscription)
    setShowCancelModal(true)
  }

  const handleConfirmCancel = async () => {
    if (!cancellingSubscription) return
    setShowCancelModal(false)
    try {
      await cancelSub(cancellingSubscription.id)
      showSuccessToast(
        "Subscription Cancelled",
        "Your subscription has been cancelled successfully.",
      )
      fetchSubscriptions()
    } catch (error) {
      console.error("Error cancelling subscription:", error)
      showErrorToast(
        "Error",
        "Failed to cancel subscription. Please try again.",
      )
    } finally {
      setCancellingSubscription(null)
    }
  }

  if (subscriptions.length === 0 && !loading) {
    return (
      <View className="flex-1 bg-neutral-lightCream">
        <PageHeader title="My Subscriptions" showBackButton={false} />

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
    <View className="flex-1 bg-neutral-lightCream">
      <PageHeader
        title="My Subscriptions"
        showBackButton={false}
        rightComponent={
          subscriptions.length > 0 ? (
            <View className="bg-functional-success/10 px-3 py-1.5 rounded-full">
              <Text className="font-sofia-bold text-xs text-functional-success">
                {subscriptions.length}
              </Text>
            </View>
          ) : undefined
        }
      />

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
        {/* Active Subscriptions */}
        {subscriptions.map((subscription, idx) => (
          <SubscriptionCard
            key={subscription.id}
            subscription={subscription}
            index={idx}
            onEdit={() => handleEditSubscription(subscription)}
            onPause={() => handlePauseSubscription(subscription)}
            onCancel={() => handleCancelSubscription(subscription)}
          />
        ))}
      </ScrollView>

      {/* Pause Modal */}
      {selectedSubscription && (
        <PauseModal
          visible={pauseModalVisible}
          onClose={() => {
            setPauseModalVisible(false)
            setSelectedSubscription(null)
          }}
          subscription={selectedSubscription}
          onUpdate={fetchSubscriptions}
        />
      )}

      {/* Edit Modal */}
      {selectedSubscription && (
        <EditModal
          visible={editModalVisible}
          onClose={() => {
            setEditModalVisible(false)
            setSelectedSubscription(null)
          }}
          subscription={selectedSubscription}
          onUpdate={fetchSubscriptions}
        />
      )}

      {/* Cancel Confirmation Modal */}
      <ConfirmModal
        visible={showCancelModal}
        onClose={() => {
          setShowCancelModal(false)
          setCancellingSubscription(null)
        }}
        title="Cancel Subscription"
        description="Are you sure you want to cancel this subscription? This action cannot be undone."
        confirmText="Cancel Subscription"
        cancelText="Keep Subscription"
        onConfirm={handleConfirmCancel}
        destructive
      />
    </View>
  )
}
