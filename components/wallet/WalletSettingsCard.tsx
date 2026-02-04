import { Wallet } from "@/types/database.types"
import { formatCurrency } from "@/utils/formatters"
import { Settings } from "lucide-react-native"
import React from "react"
import { Text, TouchableOpacity, View } from "react-native"

interface WalletSettingsCardProps {
  wallet: Wallet | null
  onPress: () => void
}

export default function WalletSettingsCard({
  wallet,
  onPress,
}: WalletSettingsCardProps) {
  if (!wallet) return null

  return (
    <View className="bg-white mx-4 rounded-2xl p-6 mb-5 shadow-md">
      <View className="flex-row justify-between items-center mb-5">
        <Text className="font-sofia-bold text-lg text-primary-navy">
          Wallet Settings
        </Text>
        <TouchableOpacity onPress={onPress} className="active:opacity-70">
          <Settings size={22} color="#101B53" strokeWidth={2} />
        </TouchableOpacity>
      </View>

      <View className="bg-neutral-lightCream rounded-xl p-5">
        <View className="flex-row justify-between py-3">
          <Text className="font-comfortaa text-sm text-neutral-darkGray">
            Auto Recharge
          </Text>
          <Text
            className={`font-comfortaa text-sm font-semibold ${
              wallet.auto_recharge_enabled
                ? "text-functional-success"
                : "text-neutral-gray"
            }`}
          >
            {wallet.auto_recharge_enabled ? "Enabled" : "Disabled"}
          </Text>
        </View>
        <View className="h-px bg-neutral-gray opacity-20 my-1" />
        <View className="flex-row justify-between py-3">
          <Text className="font-comfortaa text-sm text-neutral-darkGray">
            Auto Recharge Trigger
          </Text>
          <Text className="font-comfortaa text-sm font-semibold text-primary-navy">
            {formatCurrency(wallet.auto_recharge_trigger_amount)}
          </Text>
        </View>
        <View className="h-px bg-neutral-gray opacity-20 my-1" />
        <View className="flex-row justify-between py-3">
          <Text className="font-comfortaa text-sm text-neutral-darkGray">
            Low Balance Alert
          </Text>
          <Text className="font-comfortaa text-sm font-semibold text-primary-navy">
            {formatCurrency(wallet.low_balance_threshold)}
          </Text>
        </View>
      </View>
    </View>
  )
}
