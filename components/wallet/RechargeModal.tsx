import Button from '@/components/ui/Button';
import { useWallet } from '@/hooks/useWallet';
import { formatCurrency } from '@/utils/formatters';
import { Info } from 'lucide-react-native';
import React, { useState } from 'react';
import {
  Alert,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';

export default function RechargeModal() {
  const { rechargeWallet } = useWallet();
  const [amount, setAmount] = useState('');
  const [loading, setLoading] = useState(false);

  const quickAmounts = [
    { value: 2000, recommended: false },
    { value: 3000, recommended: true },
    { value: 5000, recommended: false },
  ];

  const handleRecharge = async () => {
    const amountNum = parseInt(amount);
    
    if (!amountNum || amountNum <= 0) {
      Alert.alert('Invalid Amount', 'Please enter a valid amount');
      return;
    }

    if (amountNum < 100) {
      Alert.alert('Minimum Amount', 'Minimum recharge amount is ₹100');
      return;
    }

    setLoading(true);
    try {
      const success = await rechargeWallet(amountNum);
      if (success) {
        Alert.alert('Success', `${formatCurrency(amountNum)} added to your wallet`);
        setAmount('');
      } else {
        Alert.alert('Error', 'Failed to recharge wallet. Please try again.');
      }
    } catch (error) {
      Alert.alert('Error', 'An error occurred. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleSetAutoPay = () => {
    Alert.alert(
      'AutoPay',
      'AutoPay feature will automatically recharge your wallet when balance falls below your set threshold.',
    );
  };

  return (
    <View className="bg-white mx-4 rounded-2xl p-8 mb-5 shadow-lg">
      <Text className="font-sofia-bold text-2xl text-primary-navy mb-2">
        Recharge
      </Text>
      <Text className="font-comfortaa text-sm text-neutral-gray mb-6">
        Enter the amount to add to your wallet
      </Text>

      {/* Amount Input */}
      <View className="mb-4">
        <TextInput
          className="border-2 border-neutral-lightGray rounded-xl px-5 py-4 font-sofia-bold text-2xl text-primary-navy"
          placeholder="₹ 2000"
          placeholderTextColor="#B3B3B3"
          keyboardType="numeric"
          value={amount}
          onChangeText={setAmount}
          editable={!loading}
        />
      </View>

      {/* Quick Amount Buttons */}
      <View className="flex-row justify-between mb-3">
        {quickAmounts.map((item) => (
          <TouchableOpacity
            key={item.value}
            className={`flex-1 mx-1 py-3 rounded-full border-2 ${
              item.recommended
                ? 'border-primary-navy bg-primary-cream/10'
                : 'border-neutral-lightGray bg-white'
            } active:opacity-70`}
            onPress={() => setAmount(item.value.toString())}
            disabled={loading}
          >
            <Text
              className={`font-sofia-bold text-center ${
                item.recommended ? 'text-primary-navy' : 'text-neutral-darkGray'
              }`}
            >
              + {formatCurrency(item.value)}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Recommended Label */}
      <Text className="font-comfortaa text-xs text-primary-navy text-center mb-6">
        Recommended
      </Text>

      {/* Continue Button */}
      <Button
        title={loading ? 'Processing...' : 'Continue'}
        onPress={handleRecharge}
        disabled={loading || !amount}
        isLoading={loading}
        variant="navy"
        className="mb-4"
      />

      {/* AutoPay Button */}
      <Button
        title="Set AutoPay"
        onPress={handleSetAutoPay}
        variant="secondary"
        className="mb-4"
      />

      {/* Info Link */}
      <TouchableOpacity
        className="flex-row items-center justify-center py-2 active:opacity-70"
        onPress={() =>
          Alert.alert(
            'Never Miss A Delivery!',
            'With AutoPay enabled, your wallet will be automatically recharged when the balance falls below your set threshold. This ensures uninterrupted delivery of your fresh milk subscription.',
          )
        }
      >
        <Info size={16} color="#B3B3B3" strokeWidth={2} />
        <Text className="font-comfortaa text-sm text-neutral-gray underline ml-2">
          Never Miss A Delivery! Know More
        </Text>
      </TouchableOpacity>
    </View>
  );
}