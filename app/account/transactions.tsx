import TransactionList from "@/components/wallet/TransactionList"
import { COLORS } from "@/constants/theme"
import { useWallet } from "@/hooks/useWallet"
import { useFocusEffect } from "expo-router"
import React, { useCallback, useState } from "react"
import { RefreshControl, ScrollView, View } from "react-native"
import Animated, { FadeInUp } from "react-native-reanimated"

export default function TransactionsScreen() {
  const { transactions, refreshWallet } = useWallet()
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
      <ScrollView
        className="flex-1"
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 40 }}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={COLORS.primary.navy}
          />
        }
      >
        <Animated.View entering={FadeInUp.duration(500)}>
          <TransactionList transactions={transactions} />
        </Animated.View>
      </ScrollView>
    </View>
  )
}
