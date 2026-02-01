import React, { useState } from 'react';
import {
    Alert,
    Modal,
    Text,
    TextInput,
    TouchableOpacity,
    View,
} from 'react-native';
import { BORDER_RADIUS, COLORS, SPACING } from '../../constants/theme';
import { useWallet } from '../../hooks/useWallet';
import { formatCurrency } from '../../utils/formatters';

interface RechargeModalProps {
  visible: boolean;
  onClose: () => void;
}

export default function RechargeModal({ visible, onClose }: RechargeModalProps) {
  const { rechargeWallet } = useWallet();
  const [amount, setAmount] = useState('');
  const [loading, setLoading] = useState(false);

  const quickAmounts = [200, 500, 1000, 2000];

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
        onClose();
      } else {
        Alert.alert('Error', 'Failed to recharge wallet. Please try again.');
      }
    } catch (error) {
      Alert.alert('Error', 'An error occurred. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    setAmount('');
    onClose();
  };

  return (
    <Modal visible={visible} transparent animationType="slide">
      <View
        style={{
          flex: 1,
          backgroundColor: 'rgba(0,0,0,0.5)',
          justifyContent: 'flex-end',
        }}
      >
        <View
          style={{
            backgroundColor: COLORS.white,
            borderTopLeftRadius: SPACING.xxxl,
            borderTopRightRadius: SPACING.xxxl,
            padding: SPACING.xxxl,
          }}
        >
          {/* Handle Bar */}
          <View
            style={{
              width: 40,
              height: 4,
              backgroundColor: '#E0E0E0',
              borderRadius: 2,
              alignSelf: 'center',
              marginBottom: SPACING.xxl,
            }}
          />

          <Text
            style={{
              fontSize: 24,
              fontWeight: '700',
              color: COLORS.secondary,
              marginBottom: 12,
            }}
          >
            Add Money
          </Text>
          <Text style={{ fontSize: 14, color: COLORS.text.secondary, marginBottom: SPACING.xxl }}>
            Enter the amount to add to your wallet
          </Text>

          {/* Amount Input */}
          <TextInput
            style={{
              borderWidth: 2,
              borderColor: COLORS.border,
              borderRadius: BORDER_RADIUS.sm,
              paddingHorizontal: 20,
              paddingVertical: 18,
              fontSize: 18,
              fontWeight: '600',
              color: COLORS.secondary,
              marginBottom: 20,
            }}
            placeholder="₹ Enter amount"
            placeholderTextColor={COLORS.text.light}
            keyboardType="numeric"
            value={amount}
            onChangeText={setAmount}
          />

          {/* Quick Amount Buttons */}
          <View
            style={{
              flexDirection: 'row',
              flexWrap: 'wrap',
              marginBottom: SPACING.xxl,
              gap: 8,
            }}
          >
            {quickAmounts.map((amt) => (
              <TouchableOpacity
                key={amt}
                style={{
                  backgroundColor: '#FFF0D2',
                  paddingHorizontal: 20,
                  paddingVertical: 12,
                  borderRadius: BORDER_RADIUS.xs,
                  marginRight: 8,
                  marginBottom: 8,
                  borderWidth: 1,
                  borderColor: COLORS.primary,
                }}
                onPress={() => setAmount(amt.toString())}
              >
                <Text
                  style={{
                    color: COLORS.primary,
                    fontWeight: '700',
                    fontSize: 14,
                  }}
                >
                  {formatCurrency(amt)}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          {/* Recharge Button */}
          <TouchableOpacity
            style={{
              backgroundColor: loading ? COLORS.text.secondary : COLORS.primary,
              paddingVertical: 18,
              borderRadius: BORDER_RADIUS.sm,
              alignItems: 'center',
              marginBottom: 12,
            }}
            onPress={handleRecharge}
            disabled={loading}
          >
            <Text
              style={{ color: COLORS.white, fontWeight: '700', fontSize: 16 }}
            >
              {loading ? 'Processing...' : 'Proceed to Pay'}
            </Text>
          </TouchableOpacity>

          {/* Cancel Button */}
          <TouchableOpacity
            style={{ paddingVertical: 16, alignItems: 'center' }}
            onPress={handleClose}
          >
            <Text
              style={{ color: COLORS.text.secondary, fontWeight: '600', fontSize: 14 }}
            >
              Cancel
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}