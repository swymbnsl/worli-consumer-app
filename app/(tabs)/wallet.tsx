import Header from "@/components/ui/Header"
import LowBalanceNotification from "@/components/wallet/LowBalanceNotification"
import RechargeModal from "@/components/wallet/RechargeModal"
import TransactionList from "@/components/wallet/TransactionList"
import WalletBalanceCard from "@/components/wallet/WalletBalanceCard"
import { useWallet } from "@/hooks/useWallet"
import React, { useState } from "react"
import { RefreshControl, ScrollView, View } from "react-native"

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
          />
        }
      >
        {/* Wallet Balance Card */}
        <WalletBalanceCard balance={wallet?.balance || 0} />

        {/* Recharge Section - Inline */}
        <RechargeModal />

        {/* Low Balance Notification Settings - Inline */}
        <LowBalanceNotification />

        {/* Transaction List */}
        <TransactionList transactions={transactions} />
      </ScrollView>
    </View>
  )
}
