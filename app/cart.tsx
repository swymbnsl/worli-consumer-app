import { useRouter } from 'expo-router';
import { AlertCircle, Calendar, ChevronLeft, Edit2, MapPin, Minus, Plus, Wallet } from 'lucide-react-native';
import React, { useEffect, useState } from 'react';
import {
  Alert,
  ScrollView,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import DatePickerModal from '../components/cart/DatePickerModal';
import { PRODUCT } from '../constants/product';
import { BORDER_RADIUS, COLORS, SHADOWS, SPACING } from '../constants/theme';
import { useAuth } from '../hooks/useAuth';
import { useCart } from '../hooks/useCart';
import { useWallet } from '../hooks/useWallet';
import { supabase } from '../lib/supabase';
import { Address } from '../types/database.types';
import { formatFullDate } from '../utils/dateUtils';
import { formatCurrency } from '../utils/formatters';

export default function CartScreen() {
  const router = useRouter();
  const { user } = useAuth();
  const { wallet, deductFromWallet } = useWallet();
  const { cart, updateQuantity, updateDate, clearCart } = useCart();
  const [addresses, setAddresses] = useState<Address[]>([]);
  const [loading, setLoading] = useState(false);
  const [datePickerVisible, setDatePickerVisible] = useState(false);

  useEffect(() => {
    fetchAddresses();
    // console.log(wallet)
  }, [user]);

  const fetchAddresses = async () => {
    if (!user) return;

    try {
      const { data, error } = await supabase
        .from('addresses')
        .select('*')
        .eq('user_id', user.id)
        .order('is_default', { ascending: false });

      if (error) throw error;
      setAddresses(data || []);
    } catch (error) {
      console.error('Error fetching addresses:', error);
    }
  };

  const defaultAddress = addresses.find(a => a.is_default) || addresses[0];
  const totalCost = PRODUCT.price * cart.quantity;
  const canDeliver = wallet && wallet.balance >= totalCost;

  const handlePlaceOrder = async () => {
    console.log("hie")
    console.log(user, wallet, defaultAddress)
    if (!user || !wallet || !defaultAddress) return;

    if (!canDeliver) {
      Alert.alert(
        'Insufficient Balance',
        `You need ${formatCurrency(totalCost - wallet.balance)} more in your wallet.`,
        [
          { text: 'Cancel', style: 'cancel' },
          { text: 'Add Money', onPress: () => router.push('/(tabs)/wallet') },
        ]
      );
      return;
    }

    Alert.alert(
      'Confirm Order',
      `Place order for ${cart.quantity} bottle${cart.quantity > 1 ? 's' : ''} on ${formatFullDate(cart.date)}?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Confirm',
          onPress: async () => {
            setLoading(true);
            try {
              // Create order ID
              const orderId = `ORD${Date.now()}`;

              // Create order
              const { error: orderError } = await supabase
                .from('orders')
                .insert([
                  {
                    id: orderId,
                    user_id: user.id,
                    date: cart.date,
                    quantity: cart.quantity,
                    amount: totalCost,
                    status: 'pending',
                    bottle_returned: false,
                    delivery_time: '06:30 AM',
                  },
                ]);

              if (orderError) throw orderError;

              // Deduct from wallet
              const success = await deductFromWallet(totalCost, `Order #${orderId}`);
              if (!success) throw new Error('Failed to deduct from wallet');

              Alert.alert(
                'Order Placed!',
                `Your order has been placed successfully. Order ID: ${orderId}`,
                [
                  {
                    text: 'View Orders',
                    onPress: () => {
                      clearCart();
                      router.replace('/(tabs)/orders');
                    },
                  },
                ]
              );
            } catch (error) {
              console.error('Error placing order:', error);
              Alert.alert('Error', 'Failed to place order. Please try again.');
            } finally {
              setLoading(false);
            }
          },
        },
      ]
    );
  };

  return (
    <View style={{ flex: 1, backgroundColor: COLORS.background }}>
      {/* Header */}
      <View
        style={{
          backgroundColor: COLORS.secondary,
          paddingHorizontal: SPACING.xxl,
          paddingTop: 56,
          paddingBottom: SPACING.xxxl,
          flexDirection: 'row',
          alignItems: 'center',
        }}
      >
        <TouchableOpacity
          onPress={() => router.back()}
          style={{ marginRight: 16 }}
        >
          <ChevronLeft size={24} color={COLORS.white} />
        </TouchableOpacity>
        <View>
          <Text
            style={{
              color: COLORS.text.bright,
              fontSize: 13,
              letterSpacing: 1,
              marginBottom: 4,
            }}
          >
            CHECKOUT
          </Text>
          <Text style={{ color: COLORS.white, fontSize: 24, fontWeight: '700' }}>
            Your Cart
          </Text>
        </View>
      </View>

      <ScrollView style={{ flex: 1, paddingHorizontal: SPACING.xxl, paddingTop: SPACING.xxl }}>
        {/* Product Card */}
        <View
          style={{
            backgroundColor: COLORS.white,
            borderRadius: BORDER_RADIUS.lg,
            padding: 28,
            marginBottom: 20,
            ...SHADOWS.md,
          }}
        >
          <View
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              marginBottom: SPACING.xxl,
            }}
          >
            <View
              style={{
                width: 80,
                height: 80,
                borderRadius: BORDER_RADIUS.md,
                backgroundColor: '#FFF0D2',
                alignItems: 'center',
                justifyContent: 'center',
                marginRight: 20,
              }}
            >
              <Text style={{ fontSize: 48 }}>{PRODUCT.image}</Text>
            </View>
            <View style={{ flex: 1 }}>
              <Text
                style={{
                  fontSize: 18,
                  fontWeight: '700',
                  color: COLORS.secondary,
                  marginBottom: 4,
                }}
              >
                {PRODUCT.name}
              </Text>
              <Text style={{ fontSize: 14, color: COLORS.text.secondary, marginBottom: 8 }}>
                {PRODUCT.size}
              </Text>
              <Text
                style={{ fontSize: 22, fontWeight: '700', color: COLORS.primary }}
              >
                {formatCurrency(PRODUCT.price)}
              </Text>
            </View>
          </View>

          {/* Quantity Selector */}
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
            <Text
              style={{ color: COLORS.secondary, fontWeight: '600', fontSize: 15 }}
            >
              Quantity
            </Text>
            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
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
                onPress={() => cart.quantity > 1 && updateQuantity(cart.quantity - 1)}
              >
                <Minus size={20} color={COLORS.secondary} />
              </TouchableOpacity>
              <Text
                style={{
                  marginHorizontal: 24,
                  fontSize: 20,
                  fontWeight: '700',
                  color: COLORS.secondary,
                }}
              >
                {cart.quantity}
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
                onPress={() => updateQuantity(cart.quantity + 1)}
              >
                <Plus size={20} color={COLORS.white} />
              </TouchableOpacity>
            </View>
          </View>
        </View>

        {/* Delivery Date Card */}
        <View
          style={{
            backgroundColor: COLORS.white,
            borderRadius: BORDER_RADIUS.md,
            padding: SPACING.xxl,
            marginBottom: 20,
            ...SHADOWS.md,
          }}
        >
          <View
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              justifyContent: 'space-between',
              marginBottom: 16,
            }}
          >
            <Text
              style={{ fontWeight: '700', fontSize: 16, color: COLORS.secondary }}
            >
              Delivery Date
            </Text>
            <TouchableOpacity onPress={() => setDatePickerVisible(true)}>
              <Calendar size={20} color={COLORS.primary} />
            </TouchableOpacity>
          </View>
          <Text style={{ fontSize: 15, color: COLORS.secondary, marginBottom: 12 }}>
            {formatFullDate(cart.date)}
          </Text>
          <View
            style={{
              backgroundColor: '#FFF0D2',
              borderRadius: BORDER_RADIUS.xs,
              padding: 12,
              flexDirection: 'row',
              alignItems: 'center',
            }}
          >
            <AlertCircle size={16} color={COLORS.primary} />
            <Text
              style={{ fontSize: 12, color: COLORS.text.secondary, marginLeft: 8, flex: 1 }}
            >
              Modify before 7 PM for next day delivery
            </Text>
          </View>
        </View>

        {/* Delivery Address Card */}
        <View
          style={{
            backgroundColor: COLORS.white,
            borderRadius: BORDER_RADIUS.md,
            padding: SPACING.xxl,
            marginBottom: 20,
            ...SHADOWS.md,
          }}
        >
          <View
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              justifyContent: 'space-between',
              marginBottom: 16,
            }}
          >
            <Text
              style={{ fontWeight: '700', fontSize: 16, color: COLORS.secondary }}
            >
              Delivery Address
            </Text>
            {/* @ts-ignore */}
            <TouchableOpacity onPress={() => router.push('/account/addresses')}>
              <Edit2 size={18} color={COLORS.primary} />
            </TouchableOpacity>
          </View>
          {defaultAddress ? (
            <>
              <View
                style={{
                  backgroundColor: '#FFF0D2',
                  paddingHorizontal: 12,
                  paddingVertical: 6,
                  borderRadius: BORDER_RADIUS.xs,
                  alignSelf: 'flex-start',
                  marginBottom: 12,
                }}
              >
                <Text
                  style={{
                    color: COLORS.primary,
                    fontSize: 11,
                    fontWeight: '700',
                    letterSpacing: 0.3,
                  }}
                >
                  {defaultAddress.type}
                </Text>
              </View>
              <Text
                style={{ color: COLORS.secondary, fontSize: 14, marginBottom: 4 }}
              >
                {defaultAddress.line1}
              </Text>
              {defaultAddress.line2 && (
                <Text
                  style={{ color: COLORS.secondary, fontSize: 14, marginBottom: 4 }}
                >
                  {defaultAddress.line2}
                </Text>
              )}
              <Text style={{ color: COLORS.text.secondary, fontSize: 14 }}>
                {defaultAddress.city}, {defaultAddress.pincode}
              </Text>
            </>
          ) : (
            <View
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                padding: 12,
                backgroundColor: '#FFE0E0',
                borderRadius: BORDER_RADIUS.xs,
              }}
            >
              <MapPin size={16} color={COLORS.error} />
              <Text style={{ fontSize: 13, color: COLORS.error, marginLeft: 8, flex: 1 }}>
                No address added. Please add a delivery address.
              </Text>
            </View>
          )}
        </View>

        {/* Payment Summary Card */}
        <View
          style={{
            backgroundColor: COLORS.white,
            borderRadius: BORDER_RADIUS.md,
            padding: SPACING.xxl,
            marginBottom: 20,
            ...SHADOWS.md,
          }}
        >
          <Text
            style={{
              fontWeight: '700',
              fontSize: 16,
              color: COLORS.secondary,
              marginBottom: 20,
            }}
          >
            Payment Summary
          </Text>
          <View
            style={{
              flexDirection: 'row',
              justifyContent: 'space-between',
              marginBottom: 16,
            }}
          >
            <Text style={{ color: COLORS.text.secondary, fontSize: 15 }}>Item Total</Text>
            <Text
              style={{ fontWeight: '600', color: COLORS.secondary, fontSize: 15 }}
            >
              {formatCurrency(totalCost)}
            </Text>
          </View>
          <View
            style={{
              height: 1,
              backgroundColor: COLORS.border,
              marginBottom: 16,
            }}
          />
          <View
            style={{ flexDirection: 'row', justifyContent: 'space-between' }}
          >
            <Text
              style={{ fontWeight: '700', fontSize: 18, color: COLORS.secondary }}
            >
              Total Amount
            </Text>
            <Text
              style={{ fontWeight: '700', fontSize: 20, color: COLORS.primary }}
            >
              {formatCurrency(totalCost)}
            </Text>
          </View>
        </View>

        {/* Wallet Balance Card */}
        <View
          style={{
            backgroundColor: canDeliver ? '#E8F5E9' : '#FFE0E0',
            borderRadius: BORDER_RADIUS.md,
            padding: 20,
            marginBottom: 20,
            borderWidth: 1,
            borderColor: canDeliver ? COLORS.accent : COLORS.error,
            flexDirection: 'row',
            alignItems: 'center',
          }}
        >
          <View
            style={{
              width: 44,
              height: 44,
              borderRadius: BORDER_RADIUS.lg,
              backgroundColor: canDeliver ? COLORS.accent : COLORS.error,
              alignItems: 'center',
              justifyContent: 'center',
              marginRight: 16,
            }}
          >
            <Wallet size={22} color={COLORS.white} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={{ fontSize: 13, color: COLORS.text.secondary, marginBottom: 4 }}>
              Wallet Balance
            </Text>
            <Text
              style={{
                fontSize: 18,
                fontWeight: '700',
                color: canDeliver ? COLORS.accent : COLORS.error,
              }}
            >
              {formatCurrency(wallet?.balance || 0)}
            </Text>
          </View>
        </View>

        {/* Insufficient Balance Alert */}
        {!canDeliver && wallet && (
          <View
            style={{
              backgroundColor: '#FFE0E0',
              borderRadius: BORDER_RADIUS.md,
              padding: 20,
              marginBottom: 20,
              borderWidth: 1,
              borderColor: COLORS.error,
            }}
          >
            <View style={{ flexDirection: 'row', alignItems: 'flex-start' }}>
              <AlertCircle size={20} color={COLORS.error} />
              <View style={{ marginLeft: 12, flex: 1 }}>
                <Text
                  style={{
                    color: COLORS.error,
                    fontWeight: '700',
                    fontSize: 15,
                    marginBottom: 4,
                  }}
                >
                  Insufficient Balance
                </Text>
                <Text style={{ color: COLORS.text.secondary, fontSize: 13, lineHeight: 18 }}>
                  Please add {formatCurrency(totalCost - wallet.balance)} to your wallet to
                  complete this order.
                </Text>
              </View>
            </View>
          </View>
        )}

        {/* Place Order Button */}
        <TouchableOpacity
          style={{
            backgroundColor: canDeliver && !loading ? COLORS.primary : COLORS.text.secondary,
            borderRadius: BORDER_RADIUS.sm,
            paddingVertical: 20,
            alignItems: 'center',
            marginBottom: SPACING.xxxl,
            ...SHADOWS.primary,
          }}
          disabled={!canDeliver || loading || !defaultAddress}
          onPress={handlePlaceOrder}
        >
          <Text
            style={{
              color: COLORS.white,
              fontWeight: '700',
              fontSize: 18,
            }}
          >
            {loading ? 'Placing Order...' : canDeliver ? 'Place Order' : 'Add Money to Wallet'}
          </Text>
        </TouchableOpacity>
      </ScrollView>

      {/* Date Picker Modal */}
      <DatePickerModal
        visible={datePickerVisible}
        onClose={() => setDatePickerVisible(false)}
        selectedDate={cart.date}
        onSelectDate={(date) => {
          updateDate(date);
          setDatePickerVisible(false);
        }}
      />
    </View>
  );
}