import Button from '@/components/ui/Button';
import { useWallet } from '@/hooks/useWallet';
import { formatCurrency } from '@/utils/formatters';
import { Bell } from 'lucide-react-native';
import React, { useState } from 'react';
import {
    Alert,
    Text,
    TouchableOpacity,
    View,
} from 'react-native';

export default function LowBalanceNotification() {
  const { wallet, updateWalletSettings } = useWallet();
  const [notificationLimit, setNotificationLimit] = useState(
    wallet?.low_balance_threshold || 0,
  );
  const [loading, setLoading] = useState(false);

  const maxLimit = 3000;
  const minLimit = 0;

  const handleSetNotification = async () => {
    if (notificationLimit < 0) {
      Alert.alert('Invalid Amount', 'Please set a valid notification limit');
      return;
    }

    setLoading(true);
    try {
      const success = await updateWalletSettings({
        low_balance_threshold: notificationLimit,
      });

      if (success) {
        Alert.alert(
          'Success',
          `Low balance notification set to ${formatCurrency(notificationLimit)}`,
        );
      } else {
        Alert.alert('Error', 'Failed to update notification settings');
      }
    } catch (error) {
      Alert.alert('Error', 'An error occurred. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleIncrement = () => {
    if (notificationLimit < maxLimit) {
      setNotificationLimit(Math.min(notificationLimit + 100, maxLimit));
    }
  };

  const handleDecrement = () => {
    if (notificationLimit > minLimit) {
      setNotificationLimit(Math.max(notificationLimit - 100, minLimit));
    }
  };

  const progress = (notificationLimit / maxLimit) * 100;

  return (
    <View className="bg-white mx-4 rounded-2xl p-8 mb-5 shadow-lg">
      <View className="flex-row items-center mb-6">
        <Bell size={20} color="#101B53" strokeWidth={2} />
        <Text className="font-sofia-bold text-lg text-primary-navy ml-2 flex-1">
          Set Low Balance Notification Limit ( {notificationLimit} )
        </Text>
      </View>

      {/* Slider Track */}
      <View className="mb-6">
        <View className="h-2 bg-neutral-lightGray rounded-full overflow-hidden mb-4">
          <View
            className="h-full bg-primary-navy rounded-full"
            style={{ width: `${progress}%` }}
          />
        </View>

        {/* Value Display and Controls */}
        <View className="flex-row justify-between items-center mb-4">
          <TouchableOpacity
            className="w-12 h-12 bg-neutral-lightGray rounded-full items-center justify-center active:opacity-70"
            onPress={handleDecrement}
            disabled={loading || notificationLimit <= minLimit}
          >
            <Text className="font-sofia-bold text-2xl text-primary-navy">−</Text>
          </TouchableOpacity>

          <View className="flex-1 mx-4 bg-primary-cream rounded-xl py-3">
            <Text className="font-sofia-bold text-2xl text-primary-navy text-center">
              {formatCurrency(notificationLimit)}
            </Text>
          </View>

          <TouchableOpacity
            className="w-12 h-12 bg-neutral-lightGray rounded-full items-center justify-center active:opacity-70"
            onPress={handleIncrement}
            disabled={loading || notificationLimit >= maxLimit}
          >
            <Text className="font-sofia-bold text-2xl text-primary-navy">+</Text>
          </TouchableOpacity>
        </View>

        <View className="flex-row justify-between">
          <Text className="font-comfortaa text-xs text-neutral-gray">
            {formatCurrency(minLimit)}
          </Text>
          <Text className="font-comfortaa text-xs text-neutral-gray">
            {formatCurrency(maxLimit)}
          </Text>
        </View>
      </View>

      {/* Set Notification Button */}
      <Button
        title={loading ? 'Updating...' : 'Set Notification'}
        onPress={handleSetNotification}
        disabled={loading}
        isLoading={loading}
        variant="primary"
      />
    </View>
  );
}
