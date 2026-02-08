import { BORDER_RADIUS, COLORS, SHADOWS, SPACING } from "@/constants/theme"
import { useAuth } from "@/hooks/useAuth"
import { CheckCircle } from "lucide-react-native"
import React from "react"
import { Text, TouchableOpacity, View } from "react-native"

export default function DeliveryPreferencesScreen() {
  const { deliveryPreference, updateDeliveryPreference } = useAuth()

  const preferences = [
    {
      id: "ring_doorbell",
      label: "Ring Doorbell",
      description: "Delivery person will ring the doorbell",
      field: "ring_doorbell",
    },
    {
      id: "leave_at_door",
      label: "Drop at Door",
      description: "Leave the order at your doorstep",
      field: "leave_at_door",
    },
    {
      id: "hand_delivery",
      label: "In-hand Delivery",
      description: "Hand over the order directly to you",
      field: "hand_delivery",
    },
  ]

  const getCurrentPreference = () => {
    if (deliveryPreference?.hand_delivery) return "hand_delivery"
    if (deliveryPreference?.leave_at_door) return "leave_at_door"
    return "ring_doorbell" // Default
  }

  const handleSelect = async (prefId: string) => {
    const updates = {
      ring_doorbell: prefId === "ring_doorbell",
      leave_at_door: prefId === "leave_at_door",
      hand_delivery: prefId === "hand_delivery",
    }
    await updateDeliveryPreference(updates)
  }

  const currentPref = getCurrentPreference()

  return (
    <View style={{ flex: 1, backgroundColor: COLORS.background }}>
      <View style={{ paddingHorizontal: SPACING.xxl, paddingTop: SPACING.xxl }}>
        {preferences.map((pref) => (
          <TouchableOpacity
            key={pref.id}
            style={{
              backgroundColor: COLORS.white,
              borderRadius: BORDER_RADIUS.md,
              padding: 24,
              marginBottom: 16,
              ...SHADOWS.md,
              flexDirection: "row",
              justifyContent: "space-between",
              alignItems: "center",
              borderWidth: currentPref === pref.id ? 2 : 0,
              borderColor: COLORS.primary.navy,
            }}
            onPress={() => handleSelect(pref.id)}
          >
            <View style={{ flex: 1 }}>
              <Text
                style={{
                  fontWeight: "700",
                  fontSize: 16,
                  color: COLORS.primary.navy,
                  marginBottom: 4,
                }}
              >
                {pref.label}
              </Text>
              <Text
                style={{
                  fontSize: 13,
                  color: COLORS.text.secondary,
                  lineHeight: 18,
                }}
              >
                {pref.description}
              </Text>
            </View>
            {currentPref === pref.id && (
              <CheckCircle size={28} color={COLORS.primary.orange} />
            )}
          </TouchableOpacity>
        ))}
      </View>
    </View>
  )
}
