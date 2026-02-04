// @ts-nocheck
import { BORDER_RADIUS, COLORS, SPACING } from "@/constants/theme"
import { useWallet } from "@/hooks/useWallet"
import { Wallet } from "@/types/database.types"
import React, { useEffect, useState } from "react"
import {
  Alert,
  Modal,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native"

interface SettingsModalProps {
  visible: boolean
  onClose: () => void
  wallet: Wallet | null
}

export default function SettingsModal({
  visible,
  onClose,
  wallet,
}: SettingsModalProps) {
  const { updateWalletSettings } = useWallet()
  const [autoPayEnabled, setAutoPayEnabled] = useState(
    wallet?.auto_recharge_enabled || true,
  )
  const [threshold, setThreshold] = useState(
    wallet?.auto_recharge_trigger_amount?.toString() || "200",
  )
  const [alertAmount, setAlertAmount] = useState(
    wallet?.low_balance_threshold?.toString() || "300",
  )
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (wallet) {
      setAutoPayEnabled(wallet.auto_recharge_enabled || false)
      setThreshold(wallet.auto_recharge_trigger_amount?.toString() || "200")
      setAlertAmount(wallet.low_balance_threshold?.toString() || "300")
    }
  }, [wallet])

  const handleSave = async () => {
    const thresholdNum = parseInt(threshold)
    const alertNum = parseInt(alertAmount)

    if (!thresholdNum || thresholdNum < 0) {
      Alert.alert("Invalid Input", "Please enter a valid threshold amount")
      return
    }

    if (!alertNum || alertNum < 0) {
      Alert.alert("Invalid Input", "Please enter a valid alert amount")
      return
    }

    setLoading(true)
    try {
      const success = await updateWalletSettings({
        auto_recharge_enabled: autoPayEnabled,
        auto_recharge_trigger_amount: thresholdNum,
        low_balance_threshold: alertNum,
      })

      if (success) {
        Alert.alert("Success", "Wallet settings updated successfully")
        onClose()
      } else {
        Alert.alert("Error", "Failed to update settings")
      }
    } catch (error) {
      Alert.alert("Error", "An error occurred")
    } finally {
      setLoading(false)
    }
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
            backgroundColor: COLORS.white,
            borderTopLeftRadius: SPACING.xxxl,
            borderTopRightRadius: SPACING.xxxl,
            padding: SPACING.xxxl,
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
              color: COLORS.secondary,
              marginBottom: SPACING.xxl,
            }}
          >
            Wallet Settings
          </Text>

          {/* Auto Pay Toggle */}
          <View style={{ marginBottom: SPACING.xxl }}>
            <View
              style={{
                flexDirection: "row",
                justifyContent: "space-between",
                alignItems: "center",
                marginBottom: 12,
              }}
            >
              <Text
                style={{
                  color: COLORS.secondary,
                  fontSize: 16,
                  fontWeight: "600",
                }}
              >
                Auto Recharge
              </Text>
              <TouchableOpacity
                style={{
                  width: 56,
                  height: 32,
                  borderRadius: BORDER_RADIUS.sm,
                  padding: 3,
                  backgroundColor: autoPayEnabled ? COLORS.accent : "#E0E0E0",
                  justifyContent: "center",
                }}
                onPress={() => setAutoPayEnabled(!autoPayEnabled)}
              >
                <View
                  style={{
                    width: 26,
                    height: 26,
                    borderRadius: BORDER_RADIUS.xs,
                    backgroundColor: COLORS.white,
                    marginLeft: autoPayEnabled ? 24 : 0,
                  }}
                />
              </TouchableOpacity>
            </View>
            <Text
              style={{
                fontSize: 12,
                color: COLORS.text.secondary,
                lineHeight: 18,
              }}
            >
              Automatically recharge when balance falls below threshold
            </Text>
          </View>

          {/* Threshold Input */}
          <View style={{ marginBottom: SPACING.xxl }}>
            <Text
              style={{
                color: COLORS.secondary,
                fontSize: 14,
                fontWeight: "600",
                marginBottom: 12,
              }}
            >
              Auto Recharge Trigger Amount
            </Text>
            <TextInput
              style={{
                borderWidth: 2,
                borderColor: COLORS.border,
                borderRadius: BORDER_RADIUS.xs,
                paddingHorizontal: 16,
                paddingVertical: 14,
                fontSize: 15,
                color: COLORS.secondary,
              }}
              placeholder="₹200"
              keyboardType="numeric"
              value={threshold}
              onChangeText={setThreshold}
            />
          </View>

          {/* Alert Amount Input */}
          <View style={{ marginBottom: SPACING.xxl }}>
            <Text
              style={{
                color: COLORS.secondary,
                fontSize: 14,
                fontWeight: "600",
                marginBottom: 12,
              }}
            >
              Low Balance Alert
            </Text>
            <TextInput
              style={{
                borderWidth: 2,
                borderColor: COLORS.border,
                borderRadius: BORDER_RADIUS.xs,
                paddingHorizontal: 16,
                paddingVertical: 14,
                fontSize: 15,
                color: COLORS.secondary,
              }}
              placeholder="₹300"
              keyboardType="numeric"
              value={alertAmount}
              onChangeText={setAlertAmount}
            />
          </View>

          {/* Save Button */}
          <TouchableOpacity
            style={{
              backgroundColor: loading ? COLORS.text.secondary : COLORS.primary,
              paddingVertical: 18,
              borderRadius: BORDER_RADIUS.sm,
              alignItems: "center",
              marginBottom: 12,
            }}
            onPress={handleSave}
            disabled={loading}
          >
            <Text
              style={{ color: COLORS.white, fontWeight: "700", fontSize: 16 }}
            >
              {loading ? "Saving..." : "Save Changes"}
            </Text>
          </TouchableOpacity>

          {/* Cancel Button */}
          <TouchableOpacity
            style={{ paddingVertical: 16, alignItems: "center" }}
            onPress={onClose}
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
