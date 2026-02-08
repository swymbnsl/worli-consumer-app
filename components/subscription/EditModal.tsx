import { supabase } from '@/lib/supabase';
import { Subscription } from '@/types/database.types';
import { formatCurrency } from '@/utils/formatters';
import { Clock, Minus, Plus } from 'lucide-react-native';
import React, { useEffect, useState } from 'react';
import {
    Alert,
    Modal,
    ScrollView,
    Text,
    TouchableOpacity,
    View,
} from 'react-native';

interface EditModalProps {
  visible: boolean;
  onClose: () => void;
  subscription: Subscription;
  onUpdate: () => void;
}

export default function EditModal({ visible, onClose, subscription, onUpdate }: EditModalProps) {
  const [quantity, setQuantity] = useState(subscription.quantity);
  const [frequency, setFrequency] = useState(subscription.frequency);
  const [deliveryTime, setDeliveryTime] = useState(subscription.delivery_time || '7:00 AM - 8:00 AM');
  const [productPrice, setProductPrice] = useState(0);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    setQuantity(subscription.quantity);
    setFrequency(subscription.frequency);
    setDeliveryTime(subscription.delivery_time || '7:00 AM - 8:00 AM');
    
    // Fetch product price from database
    const fetchProductPrice = async () => {
      if (subscription.product_id) {
        const { data, error } = await supabase
          .from('products')
          .select('price')
          .eq('id', subscription.product_id)
          .single();
        
        if (data && !error) {
          setProductPrice(data.price);
        }
      }
    };
    
    if (visible) {
      fetchProductPrice();
    }
  }, [subscription, visible]);

  const frequencies = [
    { id: 'daily', label: 'Daily' },
    { id: 'alternate', label: 'Alternate Days' },
    { id: 'weekly', label: 'Weekly' },
  ];

  const deliveryTimes = [
    { id: '6:00 AM - 7:00 AM', label: '6:00 AM - 7:00 AM' },
    { id: '7:00 AM - 8:00 AM', label: '7:00 AM - 8:00 AM' },
    { id: '8:00 AM - 9:00 AM', label: '8:00 AM - 9:00 AM' },
    { id: '9:00 AM - 10:00 AM', label: '9:00 AM - 10:00 AM' },
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
          delivery_time: deliveryTime,
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
      <View className="flex-1 bg-black/50 justify-end">
        <View className="bg-white rounded-t-3xl px-6 pt-4 pb-8">
          {/* Handle Bar */}
          <View className="w-10 h-1 bg-neutral-lightGray rounded-full self-center mb-6" />

          <Text className="font-sofia-bold text-2xl text-primary-navy mb-2">
            Edit Subscription
          </Text>
          <Text className="font-comfortaa text-sm text-neutral-gray mb-6">
            Modify your subscription details
          </Text>

          <ScrollView 
            showsVerticalScrollIndicator={false}
            contentContainerStyle={{ paddingBottom: 20 }}
          >
            {/* Quantity Selector */}
            <View className="mb-6">
              <Text className="font-sofia-bold text-base text-primary-navy mb-3">
                Daily Quantity
              </Text>
              <View className="flex-row items-center justify-between bg-neutral-lightCream/50 rounded-2xl p-5">
                <TouchableOpacity
                  className="w-10 h-10 rounded-xl bg-white items-center justify-center shadow-sm"
                  onPress={() => quantity > 1 && setQuantity(quantity - 1)}
                  activeOpacity={0.7}
                >
                  <Minus size={20} color="#101B53" strokeWidth={2.5} />
                </TouchableOpacity>
                <Text className="font-sofia-bold text-2xl text-primary-navy">
                  {quantity} Bottles
                </Text>
                <TouchableOpacity
                  className="w-10 h-10 rounded-xl bg-primary-navy items-center justify-center shadow-md"
                  onPress={() => setQuantity(quantity + 1)}
                  activeOpacity={0.8}
                >
                  <Plus size={20} color="white" strokeWidth={2.5} />
                </TouchableOpacity>
              </View>
            </View>

            {/* Frequency Selector */}
            <View className="mb-6">
              <Text className="font-sofia-bold text-base text-primary-navy mb-3">
                Delivery Frequency
              </Text>
              {frequencies.map((freq) => (
                <TouchableOpacity
                  key={freq.id}
                  className={`flex-row items-center justify-between p-4 rounded-2xl mb-3 ${
                    frequency === freq.id 
                      ? 'bg-primary-navy/5 border-2 border-primary-navy' 
                      : 'bg-white border border-neutral-lightGray'
                  }`}
                  onPress={() => setFrequency(freq.id)}
                  activeOpacity={0.7}
                >
                  <Text className={`font-sofia-bold text-base ${
                    frequency === freq.id ? 'text-primary-navy' : 'text-neutral-darkGray'
                  }`}>
                    {freq.label}
                  </Text>
                  {frequency === freq.id && (
                    <View className="w-5 h-5 rounded-full bg-primary-navy items-center justify-center">
                      <View className="w-2 h-2 rounded-full bg-white" />
                    </View>
                  )}
                </TouchableOpacity>
              ))}
            </View>

            {/* Delivery Time Selector */}
            <View className="mb-6">
              <View className="flex-row items-center mb-3">
                <Clock size={18} color="#101B53" strokeWidth={2} />
                <Text className="font-sofia-bold text-base text-primary-navy ml-2">
                  Delivery Time
                </Text>
              </View>
              {deliveryTimes.map((time) => (
                <TouchableOpacity
                  key={time.id}
                  className={`flex-row items-center justify-between p-4 rounded-2xl mb-3 ${
                    deliveryTime === time.id 
                      ? 'bg-secondary-sage/10 border-2 border-secondary-sage' 
                      : 'bg-white border border-neutral-lightGray'
                  }`}
                  onPress={() => setDeliveryTime(time.id)}
                  activeOpacity={0.7}
                >
                  <Text className={`font-sofia-bold text-base ${
                    deliveryTime === time.id ? 'text-secondary-sage' : 'text-neutral-darkGray'
                  }`}>
                    {time.label}
                  </Text>
                  {deliveryTime === time.id && (
                    <View className="w-5 h-5 rounded-full bg-secondary-sage items-center justify-center">
                      <View className="w-2 h-2 rounded-full bg-white" />
                    </View>
                  )}
                </TouchableOpacity>
              ))}
            </View>

            {/* Cost Summary */}
            <View className="bg-neutral-lightCream/50 rounded-2xl p-5 mb-6">
              <View className="flex-row justify-between mb-2">
                <Text className="font-comfortaa text-sm text-neutral-gray">
                  Price per bottle
                </Text>
                <Text className="font-sofia-bold text-sm text-neutral-darkGray">
                  {formatCurrency(productPrice)}
                </Text>
              </View>
              <View className="flex-row justify-between pt-2 border-t border-neutral-lightGray">
                <Text className="font-sofia-bold text-base text-primary-navy">
                  Daily Cost
                </Text>
                <Text className="font-sofia-bold text-xl text-primary-navy">
                  {formatCurrency(productPrice * quantity)}
                </Text>
              </View>
            </View>

            {/* Save Button */}
            <TouchableOpacity
              className={`py-4 rounded-2xl items-center mb-3 shadow-md ${
                loading ? 'bg-neutral-gray' : 'bg-primary-navy'
              }`}
              onPress={handleSave}
              disabled={loading}
              activeOpacity={0.8}
            >
              <Text className="font-sofia-bold text-base text-white">
                {loading ? 'Saving...' : 'Save Changes'}
              </Text>
            </TouchableOpacity>

            {/* Cancel Button */}
            <TouchableOpacity
              className="py-4 items-center"
              onPress={onClose}
              activeOpacity={0.7}
            >
              <Text className="font-sofia-bold text-sm text-neutral-gray">
                Cancel
              </Text>
            </TouchableOpacity>
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}