import PageHeader from "@/components/ui/PageHeader"
import AutoPayCard from "@/components/wallet/AutoPayCard"
import LowBalanceNotification from "@/components/wallet/LowBalanceNotification"
import RechargeModal from "@/components/wallet/RechargeModal"
import TransactionList from "@/components/wallet/TransactionList"
import WalletBalanceCard from "@/components/wallet/WalletBalanceCard"
import { COLORS } from "@/constants/theme"
import { useWallet } from "@/hooks/useWallet"
import { useFocusEffect } from "expo-router"
import React, { useCallback, useState } from "react"
import { RefreshControl, ScrollView, View } from "react-native"
import Animated, { FadeInUp } from "react-native-reanimated"

export default function WalletScreen() {
  const { wallet, transactions, loading, refreshWallet } = useWallet()
  const [refreshing, setRefreshing] = useState(false)

  useFocusEffect(
    useCallback(() => {
      refreshWallet()
    }, []),
  )

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
        <Animated.View entering={FadeInUp.duration(500).delay(80)}>
          <RechargeModal />
        </Animated.View>

        {/* AutoPay Settings */}
        <Animated.View entering={FadeInUp.duration(500).delay(160)}>
          <AutoPayCard />
        </Animated.View>

        {/* Low Balance Notification Settings */}
        <Animated.View entering={FadeInUp.duration(500).delay(240)}>
          <LowBalanceNotification />
        </Animated.View>

        {/* Transaction List */}
        <Animated.View entering={FadeInUp.duration(500).delay(320)}>
          <TransactionList transactions={transactions} />
        </Animated.View>
      </ScrollView>
    </View>
  )
}
