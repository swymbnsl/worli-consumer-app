import { showErrorToast, showSuccessToast } from "@/components/ui/Toast"
import { BORDER_RADIUS, COLORS, SHADOWS, SPACING } from "@/constants/theme"
import { useAuth } from "@/hooks/useAuth"
import { useRouter } from "expo-router"
import { CheckCircle, ChevronDown } from "lucide-react-native"
import React, { useState } from "react"
import { Modal, ScrollView, Text, TextInput, TouchableOpacity, View } from "react-native"

export default function DeliveryPreferencesScreen() {
  const router = useRouter()
  const { deliveryPreference, updateDeliveryPreference } = useAuth()
  const [specialInstructions, setSpecialInstructions] = useState(
    deliveryPreference?.special_instructions || "",
  )
  const [isDropdownOpen, setIsDropdownOpen] = useState(false)
  const [isSaving, setIsSaving] = useState(false)

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

  const [selectedPref, setSelectedPref] = useState(getCurrentPreference())

  const handleSelect = (prefId: string) => {
    setSelectedPref(prefId)
    setIsDropdownOpen(false)
  }

  const handleSave = async () => {
    setIsSaving(true)
    try {
      const updates = {
        ring_doorbell: selectedPref === "ring_doorbell",
        leave_at_door: selectedPref === "leave_at_door",
        hand_delivery: selectedPref === "hand_delivery",
        special_instructions: specialInstructions.trim() || null,
      }
      await updateDeliveryPreference(updates)
      showSuccessToast("Success", "Delivery preferences saved successfully")
      router.back()
    } catch (error) {
      showErrorToast("Error", "Failed to save delivery preferences")
    } finally {
      setIsSaving(false)
    }
  }

  const selectedPreference = preferences.find((p) => p.id === selectedPref)

  return (
    <View style={{ flex: 1, backgroundColor: COLORS.background }}>
      <ScrollView style={{ flex: 1 }}>
        <View style={{ paddingHorizontal: SPACING.xxl, paddingTop: SPACING.xxl, paddingBottom: SPACING.xxl }}>
          {/* Delivery Preference Dropdown */}
          <View
            style={{
              backgroundColor: COLORS.white,
              borderRadius: BORDER_RADIUS.md,
              padding: 24,
              marginBottom: 16,
              ...SHADOWS.md,
            }}
          >
            <Text
              style={{
                fontWeight: "700",
                fontSize: 16,
                color: COLORS.primary.navy,
                marginBottom: 12,
              }}
            >
              Delivery Preference
            </Text>
            <TouchableOpacity
              style={{
                borderWidth: 1,
                borderColor: COLORS.neutral.lightGray,
                borderRadius: BORDER_RADIUS.sm,
                padding: 16,
                flexDirection: "row",
                justifyContent: "space-between",
                alignItems: "center",
              }}
              onPress={() => setIsDropdownOpen(true)}
            >
              <View style={{ flex: 1 }}>
                <Text
                  style={{
                    fontSize: 15,
                    fontWeight: "600",
                    color: COLORS.primary.navy,
                    marginBottom: 2,
                  }}
                >
                  {selectedPreference?.label}
                </Text>
                <Text
                  style={{
                    fontSize: 13,
                    color: COLORS.text.secondary,
                  }}
                >
                  {selectedPreference?.description}
                </Text>
              </View>
              <ChevronDown size={24} color={COLORS.text.secondary} />
            </TouchableOpacity>
          </View>

          {/* Special Instructions */}
          <View
            style={{
              backgroundColor: COLORS.white,
              borderRadius: BORDER_RADIUS.md,
              padding: 24,
              marginBottom: 16,
              ...SHADOWS.md,
            }}
          >
            <Text
              style={{
                fontWeight: "700",
                fontSize: 16,
                color: COLORS.primary.navy,
                marginBottom: 12,
              }}
            >
              Special Instructions
            </Text>
            <TextInput
              style={{
                borderWidth: 1,
                borderColor: COLORS.neutral.lightGray,
                borderRadius: BORDER_RADIUS.sm,
                padding: 12,
                fontSize: 14,
                color: COLORS.text.primary,
                minHeight: 100,
                textAlignVertical: "top",
              }}
              placeholder="Add any special delivery instructions..."
              placeholderTextColor={COLORS.text.secondary}
              value={specialInstructions}
              onChangeText={setSpecialInstructions}
              multiline
              maxLength={200}
            />
            <Text
              style={{
                fontSize: 12,
                color: COLORS.text.secondary,
                marginTop: 8,
              }}
            >
              {specialInstructions.length}/200 characters
            </Text>
          </View>

          {/* Save Button */}
          <TouchableOpacity
            style={{
              backgroundColor: COLORS.primary.navy,
              borderRadius: BORDER_RADIUS.md,
              padding: 18,
              alignItems: "center",
              ...SHADOWS.md,
              opacity: isSaving ? 0.7 : 1,
            }}
            onPress={handleSave}
            disabled={isSaving}
          >
            <Text
              style={{
                fontSize: 16,
                fontWeight: "700",
                color: COLORS.white,
              }}
            >
              {isSaving ? "Saving..." : "Save Preferences"}
            </Text>
          </TouchableOpacity>
        </View>
      </ScrollView>

      {/* Dropdown Modal */}
      <Modal
        visible={isDropdownOpen}
        transparent
        animationType="fade"
        onRequestClose={() => setIsDropdownOpen(false)}
      >
        <TouchableOpacity
          style={{
            flex: 1,
            backgroundColor: "rgba(0, 0, 0, 0.5)",
            justifyContent: "center",
            alignItems: "center",
          }}
          activeOpacity={1}
          onPress={() => setIsDropdownOpen(false)}
        >
          <View
            style={{
              backgroundColor: COLORS.white,
              borderRadius: BORDER_RADIUS.lg,
              padding: 20,
              marginHorizontal: SPACING.xxl,
              width: "85%",
              maxWidth: 400,
              ...SHADOWS.lg,
            }}
          >
            <Text
              style={{
                fontSize: 18,
                fontWeight: "700",
                color: COLORS.primary.navy,
                marginBottom: 16,
              }}
            >
              Select Delivery Preference
            </Text>
            {preferences.map((pref) => (
              <TouchableOpacity
                key={pref.id}
                style={{
                  padding: 16,
                  borderRadius: BORDER_RADIUS.sm,
                  marginBottom: 8,
                  backgroundColor:
                    selectedPref === pref.id
                      ? COLORS.primary.navy + "10"
                      : "transparent",
                  flexDirection: "row",
                  justifyContent: "space-between",
                  alignItems: "center",
                }}
                onPress={() => handleSelect(pref.id)}
              >
                <View style={{ flex: 1 }}>
                  <Text
                    style={{
                      fontWeight: "600",
                      fontSize: 15,
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
                {selectedPref === pref.id && (
                  <CheckCircle size={24} color={COLORS.primary.navy} />
                )}
              </TouchableOpacity>
            ))}
          </View>
        </TouchableOpacity>
      </Modal>
    </View>
  )
}
