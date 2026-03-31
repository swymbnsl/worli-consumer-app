import { showErrorToast, showSuccessToast } from "@/components/ui/Toast"
import { BORDER_RADIUS, COLORS, SPACING } from "@/constants/theme"
import { updateSubscriptionPausedDates } from "@/lib/supabase-service"
import { formatDate, getDaysArray } from "@/utils/dateUtils"
import { Calendar } from "lucide-react-native"
import React, { useState } from "react"
import { Modal, ScrollView, Text, TouchableOpacity, View } from "react-native"

interface Subscription {
  id: string
  paused_dates?: string[] | null
  end_date?: string | null
}

interface PauseModalProps {
  visible: boolean
  onClose: () => void
  subscription: Subscription
  onUpdate: () => void
}

export default function PauseModal({
  visible,
  onClose,
  subscription,
  onUpdate,
}: PauseModalProps) {
  const [selectedDates, setSelectedDates] = useState<string[]>([])
  const [loading, setLoading] = useState(false)

  // Calculate valid date range - subscription must be valid for selected dates
  const endDate = subscription.end_date ? new Date(subscription.end_date) : null
  const futureDays = getDaysArray(14, 1).filter((date) => {
    if (!endDate) return true
    return new Date(date) <= endDate
  })

  const toggleDate = (date: string) => {
    if (selectedDates.includes(date)) {
      setSelectedDates(selectedDates.filter((d) => d !== date))
    } else {
      setSelectedDates([...selectedDates, date])
    }
  }

  const handleConfirmPause = async () => {
    if (selectedDates.length === 0) {
      showErrorToast(
        "No Dates Selected",
        "Please select at least one date to pause",
      )
      return
    }

    setLoading(true)
    try {
      const existingPaused = subscription.paused_dates || []
      const newPausedDates = [...new Set([...existingPaused, ...selectedDates])]

      await updateSubscriptionPausedDates(subscription.id, newPausedDates)

      showSuccessToast(
        "Success",
        `${selectedDates.length} date(s) paused successfully`,
      )
      setSelectedDates([])
      onUpdate()
      onClose()
    } catch (error) {
      console.error("Error pausing dates:", error)
      showErrorToast("Error", "Failed to pause dates")
    } finally {
      setLoading(false)
    }
  }

  const handleClose = () => {
    setSelectedDates([])
    onClose()
  }

  return (
    <Modal visible={visible} transparent animationType="slide">
      <View
        style={{
          flex: 1,
          backgroundColor: "rgba(0,0,0,0.5)",
          justifyContent: "flex-end",
        }}
      >
        <View
          style={{
            backgroundColor: COLORS.neutral.white,
            borderTopLeftRadius: SPACING.xxxl,
            borderTopRightRadius: SPACING.xxxl,
            padding: SPACING.xxxl,
            maxHeight: "80%",
          }}
        >
          {/* Handle Bar */}
          <View
            style={{
              width: 40,
              height: 4,
              backgroundColor: "#E0E0E0",
              borderRadius: 2,
              alignSelf: "center",
              marginBottom: SPACING.xxl,
            }}
          />

          <Text
            style={{
              fontSize: 24,
              fontWeight: "700",
              color: COLORS.primary.navy,
              marginBottom: 12,
            }}
          >
            Pause Delivery
          </Text>
          <Text
            style={{
              fontSize: 14,
              color: COLORS.text.secondary,
              marginBottom: SPACING.xxl,
            }}
          >
            Select dates to pause your subscription (valid until{" "}
            {endDate ? formatDate(subscription.end_date!) : "end"})
          </Text>

          {/* Date Selection */}
          <ScrollView
            style={{ marginBottom: SPACING.xxl, maxHeight: 350 }}
            showsVerticalScrollIndicator={false}
          >
            {futureDays.length === 0 ? (
              <Text
                style={{
                  fontSize: 14,
                  color: COLORS.text.secondary,
                  textAlign: "center",
                  paddingVertical: 20,
                }}
              >
                No dates available to pause within your subscription period.
              </Text>
            ) : (
              futureDays.map((date, idx) => {
                const isSelected = selectedDates.includes(date)
                const isPaused = subscription.paused_dates?.includes(date)
                const dateObj = new Date(date)
                const dayName = dateObj.toLocaleDateString("en-IN", {
                  weekday: "long",
                })

                return (
                  <TouchableOpacity
                    key={idx}
                    style={{
                      flexDirection: "row",
                      justifyContent: "space-between",
                      alignItems: "center",
                      padding: 16,
                      borderRadius: BORDER_RADIUS.sm,
                      backgroundColor: isSelected
                        ? COLORS.primary.cream
                        : isPaused
                          ? COLORS.border
                          : COLORS.neutral.white,
                      borderWidth: isSelected ? 2 : 1,
                      borderColor: isSelected
                        ? COLORS.primary.orange
                        : COLORS.border,
                      marginBottom: 12,
                    }}
                    onPress={() => !isPaused && toggleDate(date)}
                    disabled={isPaused}
                  >
                    <View
                      style={{ flexDirection: "row", alignItems: "center" }}
                    >
                      <View
                        style={{
                          width: 40,
                          height: 40,
                          borderRadius: BORDER_RADIUS.sm,
                          backgroundColor: isSelected
                            ? COLORS.primary.orange
                            : isPaused
                              ? COLORS.text.light
                              : "#E8F5E9",
                          alignItems: "center",
                          justifyContent: "center",
                          marginRight: 12,
                        }}
                      >
                        <Calendar
                          size={20}
                          color={
                            isSelected || isPaused
                              ? COLORS.neutral.white
                              : COLORS.accent
                          }
                        />
                      </View>
                      <View>
                        <Text
                          style={{
                            fontSize: 15,
                            fontWeight: "600",
                            color: isPaused
                              ? COLORS.text.light
                              : COLORS.primary.navy,
                          }}
                        >
                          {formatDate(date)}
                        </Text>
                        <Text
                          style={{
                            fontSize: 12,
                            color: isPaused
                              ? COLORS.text.light
                              : COLORS.text.secondary,
                          }}
                        >
                          {dayName}
                        </Text>
                      </View>
                    </View>
                    {isPaused && (
                      <Text
                        style={{
                          fontSize: 11,
                          color: COLORS.text.light,
                          fontWeight: "600",
                        }}
                      >
                        ALREADY PAUSED
                      </Text>
                    )}
                  </TouchableOpacity>
                )
              })
            )}
          </ScrollView>

          {/* Confirm Button - Always visible */}
          <TouchableOpacity
            style={{
              backgroundColor:
                loading || selectedDates.length === 0
                  ? COLORS.neutral.gray
                  : COLORS.primary.orange,
              paddingVertical: 18,
              borderRadius: BORDER_RADIUS.sm,
              alignItems: "center",
              marginBottom: 12,
              opacity: selectedDates.length === 0 ? 0.6 : 1,
            }}
            onPress={handleConfirmPause}
            disabled={loading || selectedDates.length === 0}
          >
            <Text
              style={{
                color: COLORS.neutral.white,
                fontWeight: "700",
                fontSize: 16,
              }}
            >
              {loading
                ? "Pausing..."
                : selectedDates.length > 0
                  ? `Confirm Pause (${selectedDates.length} date${selectedDates.length > 1 ? "s" : ""})`
                  : "Select dates to pause"}
            </Text>
          </TouchableOpacity>

          {/* Cancel Button */}
          <TouchableOpacity
            style={{ paddingVertical: 16, alignItems: "center" }}
            onPress={handleClose}
          >
            <Text
              style={{
                color: COLORS.text.secondary,
                fontWeight: "600",
                fontSize: 14,
              }}
            >
              Cancel
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  )
}
