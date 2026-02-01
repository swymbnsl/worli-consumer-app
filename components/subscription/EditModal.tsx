import { Minus, Plus } from 'lucide-react-native';
import React, { useEffect, useState } from 'react';
import {
  Alert,
  Modal,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { PRODUCT } from '../../constants/product';
import { BORDER_RADIUS, COLORS, SHADOWS, SPACING } from '../../constants/theme';
import { supabase } from '../../lib/supabase';
import { Subscription } from '../../types/database.types';
import { formatCurrency } from '../../utils/formatters';

interface EditModalProps {
  visible: boolean;
  onClose: () => void;
  subscription: Subscription;
  onUpdate: () => void;
}

export default function EditModal({ visible, onClose, subscription, onUpdate }: EditModalProps) {
  const [quantity, setQuantity] = useState(subscription.quantity);
  const [frequency, setFrequency] = useState(subscription.frequency);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    setQuantity(subscription.quantity);
    setFrequency(subscription.frequency);
  }, [subscription, visible]);

  const frequencies = [
    { id: 'daily', label: 'Daily' },
    { id: 'alternate', label: 'Alternate Days' },
    { id: 'weekly', label: 'Weekly' },
  ];

  const handleSave = async () => {
    if (quantity < 1) {
      Alert.alert('Invalid Quantity', 'Quantity must be at least 1');
      return;
    }

    setLoading(true);
    try {
      const { error } = await supabase
        .from('subscriptions')
        .update({ 
          quantity,
          frequency,
        })
        .eq('id', subscription.id);

      if (error) throw error;

      Alert.alert('Success', 'Subscription updated successfully');
      onUpdate();
      onClose();
    } catch (error) {
      console.error('Error updating subscription:', error);
      Alert.alert('Error', 'Failed to update subscription');
    } finally {
      setLoading(false);
    }
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
            Edit Subscription
          </Text>
          <Text style={{ fontSize: 14, color: COLORS.text.secondary, marginBottom: SPACING.xxxl }}>
            Modify your subscription details
          </Text>

          {/* Quantity Selector */}
          <View style={{ marginBottom: SPACING.xxxl }}>
            <Text
              style={{
                fontSize: 16,
                fontWeight: '600',
                color: COLORS.secondary,
                marginBottom: 16,
              }}
            >
              Daily Quantity
            </Text>
            <View
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                justifyContent: 'space-between',
                backgroundColor: COLORS.background,
                borderRadius: BORDER_RADIUS.sm,
                padding: 20,
              }}
            >
              <TouchableOpacity
                style={{
                  width: 40,
                  height: 40,
                  borderRadius: BORDER_RADIUS.md,
                  backgroundColor: COLORS.white,
                  alignItems: 'center',
                  justifyContent: 'center',
                  ...SHADOWS.sm,
                }}
                onPress={() => quantity > 1 && setQuantity(quantity - 1)}
              >
                <Minus size={20} color={COLORS.secondary} />
              </TouchableOpacity>
              <Text
                style={{
                  fontSize: 24,
                  fontWeight: '700',
                  color: COLORS.secondary,
                }}
              >
                {quantity} Bottles
              </Text>
              <TouchableOpacity
                style={{
                  width: 40,
                  height: 40,
                  borderRadius: BORDER_RADIUS.md,
                  backgroundColor: COLORS.primary,
                  alignItems: 'center',
                  justifyContent: 'center',
                  ...SHADOWS.primary,
                }}
                onPress={() => setQuantity(quantity + 1)}
              >
                <Plus size={20} color={COLORS.white} />
              </TouchableOpacity>
            </View>
          </View>

          {/* Frequency Selector */}
          <View style={{ marginBottom: SPACING.xxxl }}>
            <Text
              style={{
                fontSize: 16,
                fontWeight: '600',
                color: COLORS.secondary,
                marginBottom: 16,
              }}
            >
              Delivery Frequency
            </Text>
            {frequencies.map((freq) => (
              <TouchableOpacity
                key={freq.id}
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: 16,
                  borderRadius: BORDER_RADIUS.sm,
                  backgroundColor: frequency === freq.id ? '#FFF0D2' : COLORS.white,
                  borderWidth: frequency === freq.id ? 2 : 1,
                  borderColor: frequency === freq.id ? COLORS.primary : COLORS.border,
                  marginBottom: 12,
                }}
                onPress={() => setFrequency(freq.id)}
              >
                <Text
                  style={{
                    fontSize: 15,
                    fontWeight: '600',
                    color: COLORS.secondary,
                  }}
                >
                  {freq.label}
                </Text>
                {frequency === freq.id && (
                  <View
                    style={{
                      width: 20,
                      height: 20,
                      borderRadius: 10,
                      backgroundColor: COLORS.primary,
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}
                  >
                    <View
                      style={{
                        width: 8,
                        height: 8,
                        borderRadius: 4,
                        backgroundColor: COLORS.white,
                      }}
                    />
                  </View>
                )}
              </TouchableOpacity>
            ))}
          </View>

          {/* Cost Summary */}
          <View
            style={{
              backgroundColor: COLORS.background,
              borderRadius: BORDER_RADIUS.sm,
              padding: 20,
              marginBottom: SPACING.xxl,
            }}
          >
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8 }}>
              <Text style={{ fontSize: 14, color: COLORS.text.secondary }}>
                Price per bottle
              </Text>
              <Text style={{ fontSize: 14, fontWeight: '600', color: COLORS.secondary }}>
                {formatCurrency(PRODUCT.price)}
              </Text>
            </View>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
              <Text style={{ fontSize: 16, fontWeight: '700', color: COLORS.secondary }}>
                Daily Cost
              </Text>
              <Text style={{ fontSize: 18, fontWeight: '700', color: COLORS.primary }}>
                {formatCurrency(PRODUCT.price * quantity)}
              </Text>
            </View>
          </View>

          {/* Save Button */}
          <TouchableOpacity
            style={{
              backgroundColor: loading ? COLORS.text.secondary : COLORS.primary,
              paddingVertical: 18,
              borderRadius: BORDER_RADIUS.sm,
              alignItems: 'center',
              marginBottom: 12,
            }}
            onPress={handleSave}
            disabled={loading}
          >
            <Text
              style={{ color: COLORS.white, fontWeight: '700', fontSize: 16 }}
            >
              {loading ? 'Saving...' : 'Save Changes'}
            </Text>
          </TouchableOpacity>

          {/* Cancel Button */}
          <TouchableOpacity
            style={{ paddingVertical: 16, alignItems: 'center' }}
            onPress={onClose}
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