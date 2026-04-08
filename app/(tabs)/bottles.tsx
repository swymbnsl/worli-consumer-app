import BottleBalanceCard from "@/components/bottles/BottleBalanceCard"
import BottleTransactionList from "@/components/bottles/BottleTransactionList"
import PurchaseBottlesCard from "@/components/bottles/PurchaseBottlesCard"
import AutoPayCard from "@/components/wallet/AutoPayCard"
import LowBalanceNotification from "@/components/wallet/LowBalanceNotification"
import PageHeader from "@/components/ui/PageHeader"
import { COLORS } from "@/constants/theme"
import { useWallet } from "@/hooks/useWallet"
import { useFocusEffect } from "expo-router"
import React, { useCallback, useState } from "react"
import { RefreshControl, ScrollView, View } from "react-native"
import Animated, { FadeInUp } from "react-native-reanimated"

export default function BottlesScreen() {
  const {
    transactions,
    loading,
    refreshWallet,
    bottleBalance,
    bottlePrice,
    estimatedDaysLeft,
  } = useWallet()
  const [refreshing, setRefreshing] = useState(false)

  useFocusEffect(
    useCallback(() => {
      refreshWallet()
    }, [])
  )

  const onRefresh = async () => {
    setRefreshing(true)
    await refreshWallet()
    setRefreshing(false)
  }

  return (
    <View className="flex-1 bg-neutral-lightCream">
      <PageHeader title="My Bottles" showBackButton={false} />

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
        {/* Bottle Balance Card */}
        <BottleBalanceCard
          bottleBalance={bottleBalance}
          estimatedDaysLeft={estimatedDaysLeft}
        />

        {/* Purchase Bottles Section */}
        <Animated.View entering={FadeInUp.duration(500).delay(80)}>
          <PurchaseBottlesCard />
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
          <BottleTransactionList
            transactions={transactions}
            bottlePrice={bottlePrice}
          />
        </Animated.View>
      </ScrollView>
    </View>
  )
}
