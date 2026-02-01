import React, { useState } from 'react';
import {
    RefreshControl,
    ScrollView,
    StatusBar
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Header from '@/components/ui/Header';
import RechargeModal from '@/components/wallet/RechargeModal';
import SettingsModal from '@/components/wallet/SettingsModal';
import TransactionList from '@/components/wallet/TransactionList';
import WalletBalanceCard from '@/components/wallet/WalletBalanceCard';
import WalletSettingsCard from '@/components/wallet/WalletSettingsCard';
import { useWallet } from '@/hooks/useWallet';

export default function WalletScreen() {
  const { wallet, transactions, loading, refreshWallet } = useWallet();
  const [rechargeModalVisible, setRechargeModalVisible] = useState(false);
  const [settingsModalVisible, setSettingsModalVisible] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  const onRefresh = async () => {
    setRefreshing(true);
    await refreshWallet();
    setRefreshing(false);
  };

  return (
    <SafeAreaView className="flex-1 bg-neutral-lightCream" edges={['top', 'bottom']}>
      <StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" />

      <Header />

      <ScrollView
        className="flex-1"
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 100 }}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#101B53" />
        }
      >
        {/* Wallet Balance Card */}
        <WalletBalanceCard
          balance={wallet?.balance || 0}
          onAddMoney={() => setRechargeModalVisible(true)}
        />

        {/* Wallet Settings Card */}
        <WalletSettingsCard
          wallet={wallet}
          onPress={() => setSettingsModalVisible(true)}
        />

        {/* Transaction List */}
        <TransactionList transactions={transactions} />
      </ScrollView>

      {/* Recharge Modal */}
      <RechargeModal
        visible={rechargeModalVisible}
        onClose={() => setRechargeModalVisible(false)}
      />

      {/* Settings Modal */}
      <SettingsModal
        visible={settingsModalVisible}
        onClose={() => setSettingsModalVisible(false)}
        wallet={wallet}
      />
    </SafeAreaView>
  );
}