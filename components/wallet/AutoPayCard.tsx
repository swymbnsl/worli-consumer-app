import Button from "@/components/ui/Button"
import { useWallet } from "@/hooks/useWallet"
import { Zap, ZapOff, RefreshCw } from "lucide-react-native"
import React, { useEffect, useState } from "react"
import { Switch, Text, TouchableOpacity, View } from "react-native"
import {
  showErrorToast,
  showSuccessToast,
} from "@/components/ui/Toast"
import { ConfirmModal } from "@/components/ui/Modal"

export default function AutoPayCard() {
  const { wallet, setupAutoPay, cancelAutoPay } = useWallet()
  const [isEnabled, setIsEnabled] = useState(false)
  const [rechargeAmount, setRechargeAmount] = useState(30)
  const [triggerAmount, setTriggerAmount] = useState(5)
  const [loading, setLoading] = useState(false)
  const [isEditing, setIsEditing] = useState(false)
  const [showDisableModal, setShowDisableModal] = useState(false)

  const rechargeOptions = [15, 30, 45, 60]
  const triggerOptions = [3, 5, 10, 15]

  useEffect(() => {
    if (wallet) {
      setIsEnabled(wallet.auto_recharge_enabled || false)
      if (wallet.auto_recharge_amount) {
        setRechargeAmount(Number(wallet.auto_recharge_amount))
      }
      if (wallet.auto_recharge_trigger_amount) {
        setTriggerAmount(Number(wallet.auto_recharge_trigger_amount))
      }
    }
  }, [wallet])

  const handleToggle = (value: boolean) => {
    if (value) {
      // Intending to enable autopay, but don't save until explicit confirmation
      setIsEditing(true)
      setIsEnabled(true)
    } else {
      // Disable autopay
      if (wallet?.auto_recharge_enabled) {
        setShowDisableModal(true)
      } else {
        setIsEnabled(false)
        setIsEditing(false)
      }
    }
  }

  const handleConfirmDisable = async () => {
    setShowDisableModal(false)
    setLoading(true)
    const success = await cancelAutoPay()
    if (success) {
      setIsEnabled(false)
      setIsEditing(false)
    } else {
      showErrorToast("Error", "Failed to disable AutoPay")
      setIsEnabled(true) // Revert on failure
    }
    setLoading(false)
  }

  const handleSave = async () => {
    if (triggerAmount >= rechargeAmount) {
      showErrorToast(
        "Invalid Settings",
        "Trigger amount must be less than recharge amount",
      )
      return
    }

    setLoading(true)
    try {
      const success = await setupAutoPay(rechargeAmount, triggerAmount)
      if (success) {
        setIsEditing(false)
        showSuccessToast(
          "AutoPay Enabled",
          `Your balance will be automatically recharged with ${rechargeAmount} bottles when balance falls below ${triggerAmount} bottles.`,
        )
      } else {
        showErrorToast("Error", "Failed to setup AutoPay. Please try again.")
      }
    } catch (error) {
      showErrorToast("Error", "Something went wrong. Please try again.")
    } finally {
      setLoading(false)
    }
  }

  return (
    <View className="bg-white mx-4 rounded-2xl p-8 mb-5 shadow-lg">
      {/* Header */}
      <View className="flex-row items-center justify-between mb-2">
        <View className="flex-row items-center flex-1">
          {isEnabled ? (
            <View className="w-10 h-10 bg-functional-success/10 rounded-full items-center justify-center mr-3">
              <Zap size={20} color="#638C5F" strokeWidth={2} />
            </View>
          ) : (
            <View className="w-10 h-10 bg-neutral-lightGray rounded-full items-center justify-center mr-3">
              <ZapOff size={20} color="#999" strokeWidth={2} />
            </View>
          )}
          <View className="flex-1">
            <Text className="font-sofia-bold text-lg text-primary-navy">
              AutoPay
            </Text>
            <Text className="font-comfortaa text-xs text-neutral-gray">
              Never run out of bottles
            </Text>
          </View>
        </View>
        <Switch
          value={isEnabled}
          onValueChange={handleToggle}
          trackColor={{ false: "#E5E5E5", true: "#638C5F" }}
          thumbColor={isEnabled ? "#fff" : "#f4f3f4"}
          disabled={loading}
        />
      </View>

      {/* Active AutoPay Info (when enabled and not editing and saved to DB) */}
      {isEnabled && !isEditing && wallet?.auto_recharge_enabled && (
        <View className="mt-4">
          <View className="bg-primary-cream/30 rounded-xl p-4 mb-3">
            <View className="flex-row items-center justify-between mb-2">
              <Text className="font-comfortaa text-xs text-neutral-gray">
                Recharge Amount
              </Text>
              <Text className="font-sofia-bold text-base text-primary-navy">
                {rechargeAmount} Bottles
              </Text>
            </View>
            <View className="flex-row items-center justify-between">
              <Text className="font-comfortaa text-xs text-neutral-gray">
                When Balance Below
              </Text>
              <Text className="font-sofia-bold text-base text-primary-navy">
                {triggerAmount} Bottles
              </Text>
            </View>
          </View>

          <TouchableOpacity
            className="flex-row items-center justify-center py-2 active:opacity-70"
            onPress={() => setIsEditing(true)}
          >
            <RefreshCw size={14} color="#101B53" strokeWidth={2} />
            <Text className="font-comfortaa text-sm text-primary-navy ml-1.5 underline">
              Modify Settings
            </Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Edit AutoPay Settings */}
      {isEnabled && isEditing && (
        <View className="mt-4">
          {/* Recharge Amount Selection */}
          <Text className="font-sofia-bold text-sm text-primary-navy mb-3">
            Auto-recharge amount
          </Text>
          <View className="flex-row flex-wrap gap-2 mb-5">
            {rechargeOptions.map((amt) => (
              <TouchableOpacity
                key={amt}
                className={`px-4 py-2.5 rounded-full border-2 ${
                  rechargeAmount === amt
                    ? "border-primary-navy bg-primary-navy"
                    : "border-neutral-lightGray bg-white"
                } active:opacity-70`}
                onPress={() => setRechargeAmount(amt)}
                disabled={loading}
              >
                <Text
                  className={`font-sofia-bold text-sm ${
                    rechargeAmount === amt
                      ? "text-white"
                      : "text-neutral-darkGray"
                  }`}
                >
                  {amt} Bottles
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          {/* Trigger Amount Selection */}
          <Text className="font-sofia-bold text-sm text-primary-navy mb-3">
            When balance falls below
          </Text>
          <View className="flex-row flex-wrap gap-2 mb-6">
            {triggerOptions.map((amt) => (
              <TouchableOpacity
                key={amt}
                className={`px-4 py-2.5 rounded-full border-2 ${
                  triggerAmount === amt
                    ? "border-secondary-sage bg-secondary-sage"
                    : "border-neutral-lightGray bg-white"
                } active:opacity-70`}
                onPress={() => setTriggerAmount(amt)}
                disabled={loading}
              >
                <Text
                  className={`font-sofia-bold text-sm ${
                    triggerAmount === amt
                      ? "text-white"
                      : "text-neutral-darkGray"
                  }`}
                >
                  {amt} Bottles
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          {/* Summary */}
          <View className="bg-secondary-skyBlue/10 rounded-xl p-4 mb-5">
            <Text className="font-comfortaa text-sm text-primary-navy text-center">
              Your balance will be recharged with{" "}
              <Text className="font-sofia-bold">
                {rechargeAmount} bottles
              </Text>{" "}
              when balance drops below{" "}
              <Text className="font-sofia-bold">
                {triggerAmount} bottles
              </Text>
            </Text>
          </View>

          {/* Save Button */}
          <Button
            title={loading ? "Saving..." : wallet?.auto_recharge_enabled ? "Save Settings" : "Enable AutoPay"}
            onPress={handleSave}
            disabled={loading}
            isLoading={loading}
            variant="navy"
          />
        </View>
      )}

      {/* Info text when disabled */}
      {!isEnabled && (
        <Text className="font-comfortaa text-xs text-neutral-gray mt-3 leading-4">
          Enable AutoPay to automatically recharge your bottles when the balance
          runs low. Never miss a delivery!
        </Text>
      )}

      {/* Disable Confirmation */}
      <ConfirmModal
        visible={showDisableModal}
        onClose={() => setShowDisableModal(false)}
        title="Disable AutoPay"
        description="Are you sure you want to disable automatic bottle recharge?"
        confirmText="Disable"
        onConfirm={handleConfirmDisable}
        destructive
      />
    </View>
  )
}
