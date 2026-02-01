import React, { useEffect, useState } from 'react';
import {
    Alert,
    RefreshControl,
    ScrollView,
    StatusBar,
    Text,
    TouchableOpacity,
    View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import EditModal from '../../components/subscription/EditModal';
import PausedDatesList from '../../components/subscription/PausedDatesList';
import PauseModal from '../../components/subscription/PauseModal';
import SubscriptionCard from '../../components/subscription/SubscriptionCard';
import Header from '../../components/ui/Header';
import { useAuth } from '../../hooks/useAuth';
import { supabase } from '../../lib/supabase';
import { Subscription } from '../../types/database.types';

export default function SubscriptionScreen() {
  const { user } = useAuth();
  const [subscription, setSubscription] = useState<Subscription | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [pauseModalVisible, setPauseModalVisible] = useState(false);
  const [editModalVisible, setEditModalVisible] = useState(false);

  useEffect(() => {
    fetchSubscription();
  }, [user]);

  const fetchSubscription = async () => {
    if (!user) return;

    try {
      const { data, error } = await supabase
        .from('subscriptions')
        .select('*')
        .eq('user_id', user.id)
        .eq('status', 'active')
        .single();

      if (error && error.code !== 'PGRST116') throw error;
      setSubscription(data);
    } catch (error) {
      console.error('Error fetching subscription:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const onRefresh = () => {
    setRefreshing(true);
    fetchSubscription();
  };

  const handleCancelSubscription = () => {
    Alert.alert(
      'Cancel Subscription',
      'Are you sure you want to cancel your subscription? This action cannot be undone.',
      [
        { text: 'Keep Subscription', style: 'cancel' },
        {
          text: 'Cancel Subscription',
          style: 'destructive',
          onPress: async () => {
            if (!subscription) return;
            
            try {
              const { error } = await supabase
                .from('subscriptions')
                .update({ status: 'cancelled' })
                .eq('id', subscription.id);

              if (error) throw error;

              Alert.alert('Subscription Cancelled', 'Your subscription has been cancelled successfully.');
              fetchSubscription();
            } catch (error) {
              console.error('Error cancelling subscription:', error);
              Alert.alert('Error', 'Failed to cancel subscription. Please try again.');
            }
          },
        },
      ]
    );
  };

  if (!subscription && !loading) {
    return (
      <SafeAreaView className="flex-1 bg-neutral-lightCream" edges={['top', 'bottom']}>
        <StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" />

        <Header />

        {/* No Subscription State */}
        <View className="flex-1 justify-center items-center px-6">
          <Text className="text-5xl mb-4">📦</Text>
          <Text className="font-sofia-bold text-lg text-primary-navy mb-2">
            No Active Subscription
          </Text>
          <Text className="font-comfortaa text-sm text-neutral-gray text-center">
            Start a subscription for daily fresh milk delivery
          </Text>
        </View>
      </SafeAreaView>
    );
  }

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
        {/* Active Subscription Card */}
        {subscription && (
          <SubscriptionCard
            subscription={subscription}
            onEdit={() => setEditModalVisible(true)}
            onPause={() => setPauseModalVisible(true)}
          />
        )}

        {/* Paused Dates List */}
        {subscription && subscription.paused_dates && subscription.paused_dates.length > 0 && (
          <PausedDatesList
            pausedDates={subscription.paused_dates}
            subscriptionId={subscription.id}
            onUpdate={fetchSubscription}
          />
        )}

        {/* Cancel Subscription Button */}
        <TouchableOpacity
          className="bg-white mx-4 mt-4 rounded-xl p-5 items-center border border-red-100"
          onPress={handleCancelSubscription}
          activeOpacity={0.7}
        >
          <Text className="font-sofia-bold text-sm text-functional-error">
            Cancel Subscription
          </Text>
        </TouchableOpacity>
      </ScrollView>

      {/* Pause Modal */}
      {subscription && (
        <PauseModal
          visible={pauseModalVisible}
          onClose={() => setPauseModalVisible(false)}
          subscription={subscription}
          onUpdate={fetchSubscription}
        />
      )}

      {/* Edit Modal */}
      {subscription && (
        <EditModal
          visible={editModalVisible}
          onClose={() => setEditModalVisible(false)}
          subscription={subscription}
          onUpdate={fetchSubscription}
        />
      )}
    </SafeAreaView>
  );
}
