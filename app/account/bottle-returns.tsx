import Button from "@/components/ui/Button"
import PageHeader from "@/components/ui/PageHeader"
import { showErrorToast, showSuccessToast } from "@/components/ui/Toast"
import { COLORS } from "@/constants/theme"
import { useAuth } from "@/hooks/useAuth"
import {
  cancelBottleReturn,
  fetchUserBottleReturns,
} from "@/lib/supabase-service"
import { BottleReturn } from "@/types/database.types"
import { formatDate } from "@/utils/dateUtils"
import { useFocusEffect, useRouter } from "expo-router"
import { Calendar, Package, X } from "lucide-react-native"
import React, { useCallback, useState } from "react"
import {
  ActivityIndicator,
  Modal,
  RefreshControl,
  ScrollView,
  Text,
  TouchableOpacity,
  View,
} from "react-native"
import Animated, { FadeInUp } from "react-native-reanimated"

export default function BottleReturnsScreen() {
  const { user } = useAuth()
  const router = useRouter()
  const [returns, setReturns] = useState<BottleReturn[]>([])
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [cancellingId, setCancellingId] = useState<string | null>(null)
  const [showInfoModal, setShowInfoModal] = useState(false)

  useFocusEffect(
    useCallback(() => {
      fetchReturns()
    }, [user]),
  )

  const fetchReturns = async () => {
    if (!user) return

    try {
      const data = await fetchUserBottleReturns(user.id)
      setReturns(data)
    } catch (error) {
      console.error("Error fetching bottle returns:", error)
      showErrorToast("Error", "Failed to load bottle returns")
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }

  const onRefresh = () => {
    setRefreshing(true)
    fetchReturns()
  }

  const handleCancelReturn = async (returnId: string) => {
    setCancellingId(returnId)
    try {
      await cancelBottleReturn(returnId)
      showSuccessToast("Success", "Bottle return cancelled")
      fetchReturns()
    } catch (error) {
      console.error("Error cancelling return:", error)
      showErrorToast("Error", "Failed to cancel return")
    } finally {
      setCancellingId(null)
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case "completed":
        return {
          bg: COLORS.functional.success + "15",
          text: COLORS.functional.success,
        }
      case "collected":
        return {
          bg: COLORS.secondary.skyBlue + "15",
          text: COLORS.secondary.skyBlue,
        }
      case "requested":
        return { bg: COLORS.primary.orange + "15", text: COLORS.primary.orange }
      case "cancelled":
        return { bg: COLORS.neutral.lightGray, text: COLORS.neutral.darkGray }
      default:
        return { bg: COLORS.neutral.lightCream, text: COLORS.neutral.darkGray }
    }
  }

  if (loading) {
    return (
      <View className="flex-1 bg-neutral-lightCream">
        <PageHeader title="Bottle Returns" />
        <View className="flex-1 justify-center items-center">
          <ActivityIndicator size="large" color={COLORS.primary.navy} />
        </View>
      </View>
    )
  }

  return (
    <View className="flex-1 bg-neutral-lightCream">
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
        {/* Info Card */}
        <View
          className="mx-4 mt-4 bg-secondary-skyBlue/10 p-4 rounded-xl flex-row items-start"
          style={{
            borderWidth: 1,
            borderColor: COLORS.secondary.skyBlue + "30",
          }}
        >
          <Package size={20} color={COLORS.secondary.skyBlue} strokeWidth={2} />
          <Text className="flex-1 ml-3 font-comfortaa text-xs text-primary-navy leading-5">
            Schedule a bottle return and our delivery person will collect empty
            bottles on the scheduled date.
          </Text>
        </View>

        {/* New Return Button */}
        <View className="mx-4 mt-4">
          <Button
            title="Request New Return"
            onPress={() => router.push("/account/request-return")}
            variant="navy"
            size="medium"
          />
        </View>

        {/* Returns List */}
        {returns.length === 0 ? (
          <View className="flex-1 justify-center items-center px-8 py-16">
            <View className="bg-primary-navy/5 p-6 rounded-full mb-4">
              <Package
                size={48}
                color={COLORS.primary.navy}
                strokeWidth={1.5}
              />
            </View>
            <Text className="font-sofia-bold text-lg text-neutral-darkGray mb-2 text-center">
              No bottle returns yet
            </Text>
            <Text className="font-comfortaa text-sm text-neutral-gray text-center">
              Request a bottle return to schedule collection
            </Text>
          </View>
        ) : (
          <View className="mx-4 mt-4">
            {returns.map((returnItem, index) => {
              const statusColors = getStatusColor(
                returnItem.status || "pending",
              )
              const canCancel =
                returnItem.status === "requested" ||
                returnItem.status === "pending"

              return (
                <Animated.View
                  key={returnItem.id}
                  entering={FadeInUp.duration(500).delay(index * 80)}
                  className="mb-3"
                >
                  <View
                    className="bg-white rounded-2xl p-4 overflow-hidden"
                    style={{
                      shadowColor: "#000",
                      shadowOffset: { width: 0, height: 2 },
                      shadowOpacity: 0.06,
                      shadowRadius: 8,
                      elevation: 3,
                    }}
                  >
                    {/* Header */}
                    <View className="flex-row items-start justify-between mb-3">
                      <View className="flex-1">
                        <Text className="font-sofia-bold text-base text-primary-navy mb-1">
                          {returnItem.quantity}{" "}
                          {returnItem.quantity === 1 ? "Bottle" : "Bottles"}
                        </Text>
                        <View className="flex-row items-center">
                          <Calendar
                            size={12}
                            color={COLORS.neutral.gray}
                            strokeWidth={2}
                          />
                          <Text className="font-comfortaa text-xs text-neutral-gray ml-1">
                            {returnItem.return_date
                              ? formatDate(returnItem.return_date)
                              : "No date set"}
                          </Text>
                        </View>
                      </View>

                      {/* Status Badge */}
                      <View
                        className="px-3 py-1.5 rounded-full"
                        style={{ backgroundColor: statusColors.bg }}
                      >
                        <Text
                          className="font-sofia-bold text-xs capitalize"
                          style={{ color: statusColors.text }}
                        >
                          {returnItem.status || "pending"}
                        </Text>
                      </View>
                    </View>

                    {/* Notes */}
                    {returnItem.notes && (
                      <View className="bg-neutral-lightCream p-3 rounded-lg mb-3">
                        <Text className="font-comfortaa text-xs text-neutral-darkGray">
                          {returnItem.notes}
                        </Text>
                      </View>
                    )}

                    {/* Actions */}
                    {canCancel && (
                      <View className="flex-row border-t border-neutral-lightGray pt-3">
                        <TouchableOpacity
                          className="flex-1 flex-row items-center justify-center py-2 bg-functional-error/10 rounded-lg"
                          onPress={() => handleCancelReturn(returnItem.id)}
                          disabled={cancellingId === returnItem.id}
                          activeOpacity={0.6}
                        >
                          {cancellingId === returnItem.id ? (
                            <ActivityIndicator
                              size="small"
                              color={COLORS.functional.error}
                            />
                          ) : (
                            <>
                              <X
                                size={14}
                                color={COLORS.functional.error}
                                strokeWidth={2}
                              />
                              <Text className="font-sofia-bold text-xs text-functional-error ml-1.5">
                                Cancel Return
                              </Text>
                            </>
                          )}
                        </TouchableOpacity>
                      </View>
                    )}
                  </View>
                </Animated.View>
              )
            })}
          </View>
        )}
      </ScrollView>

      {/* Info Modal */}
      <Modal visible={showInfoModal} transparent animationType="fade">
        <View
          className="flex-1 bg-black/50 justify-center items-center px-6"
          style={{ backgroundColor: "rgba(0,0,0,0.5)" }}
        >
          <View className="bg-white rounded-2xl p-6 w-full max-w-sm">
            <Text className="font-sofia-bold text-lg text-primary-navy mb-4">
              How Bottle Returns Work
            </Text>

            <View className="gap-4 mb-6">
              {[
                {
                  step: "1",
                  title: "Request Return",
                  text: "Schedule a date for bottle collection",
                },
                {
                  step: "2",
                  title: "Prepare Bottles",
                  text: "Keep empty bottles ready at the delivery address",
                },
                {
                  step: "3",
                  title: "Collection",
                  text: "Our delivery person will collect bottles on the scheduled date",
                },
                {
                  step: "4",
                  title: "Confirmation",
                  text: "You'll receive confirmation once bottles are collected",
                },
              ].map((item) => (
                <View key={item.step} className="flex-row items-start">
                  <View className="w-7 h-7 rounded-full bg-primary-navy items-center justify-center mr-3 shrink-0">
                    <Text className="font-sofia-bold text-xs text-white">
                      {item.step}
                    </Text>
                  </View>
                  <View className="flex-1">
                    <Text className="font-sofia-bold text-sm text-primary-navy mb-0.5">
                      {item.title}
                    </Text>
                    <Text className="font-comfortaa text-xs text-neutral-darkGray">
                      {item.text}
                    </Text>
                  </View>
                </View>
              ))}
            </View>

            <TouchableOpacity
              className="bg-primary-navy py-3 rounded-xl"
              onPress={() => setShowInfoModal(false)}
            >
              <Text className="font-sofia-bold text-sm text-white text-center">
                Got It
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  )
}
