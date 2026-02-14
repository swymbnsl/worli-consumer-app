import AutoPayCard from "@/components/wallet/AutoPayCard"
import LowBalanceNotification from "@/components/wallet/LowBalanceNotification"
import RechargeModal from "@/components/wallet/RechargeModal"
import TransactionList from "@/components/wallet/TransactionList"
import WalletBalanceCard from "@/components/wallet/WalletBalanceCard"
import PageHeader from "@/components/ui/PageHeader"
import { COLORS } from "@/constants/theme"
import { useWallet } from "@/hooks/useWallet"
import React, { useState } from "react"
import { RefreshControl, ScrollView, Text, View } from "react-native"

export default function WalletScreen() {
  const { wallet, transactions, loading, refreshWallet } = useWallet()
  const [refreshing, setRefreshing] = useState(false)

  const onRefresh = async () => {
    setRefreshing(true)
    await refreshWallet()
    setRefreshing(false)
  }

  return (
    <View className="flex-1 bg-neutral-lightCream">
      <PageHeader title="My Wallet" showBackButton={false} />

      <ScrollView
        className="flex-1"
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 100 }}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={COLORS.primary.navy}
          />
        }
      >
        {/* Wallet Balance Card */}
        <WalletBalanceCard balance={wallet?.balance || 0} />

        {/* Recharge Section - Razorpay Integrated */}
        <RechargeModal />

        {/* AutoPay Settings */}
        <AutoPayCard />

        {/* Low Balance Notification Settings */}
        <LowBalanceNotification />

        {/* Transaction List */}
        <TransactionList transactions={transactions} />
      </ScrollView>
    </View>
  )
}
