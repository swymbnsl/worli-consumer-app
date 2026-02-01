import { useLocalSearchParams, useRouter } from 'expo-router';
import { ChevronLeft } from 'lucide-react-native';
import React, { useEffect, useState } from 'react';
import {
    Alert,
    ScrollView,
    Text,
    TouchableOpacity,
    View,
} from 'react-native';
import { PRODUCT } from '@/constants/product';
import { BORDER_RADIUS, COLORS, SHADOWS, SPACING } from '@/constants/theme';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/lib/supabase';
import { Order } from '@/types/database.types';
import { formatFullDate } from '@/utils/dateUtils';
import { formatCurrency } from '@/utils/formatters';

export default function OrderDetailScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams();
  const { user } = useAuth();
  const [order, setOrder] = useState<Order | null>(null);
  const [loading, setLoading] = useState(true);
  const [markingReturned, setMarkingReturned] = useState(false);

  useEffect(() => {
    fetchOrder();
  }, [id]);

  const fetchOrder = async () => {
    if (!user || !id) return;

    try {
      const { data, error } = await supabase
        .from('orders')
        .select('*')
        .eq('id', id)
        .eq('user_id', user.id)
        .single();

      if (error) throw error;
      setOrder(data);
    } catch (error) {
      console.error('Error fetching order:', error);
      Alert.alert('Error', 'Failed to load order details');
      router.back();
    } finally {
      setLoading(false);
    }
  };

  const handleMarkReturned = async () => {
    if (!order) return;

    Alert.alert(
      'Confirm Return',
      'Have you returned the empty bottles?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Yes, Mark as Returned',
          onPress: async () => {
            setMarkingReturned(true);
            try {
              const { error } = await supabase
                .from('orders')
                .update({ bottle_returned: true })
                .eq('id', order.id);

              if (error) throw error;

              setOrder({ ...order, bottle_returned: true });
              Alert.alert('Success', 'Bottles marked as returned');
            } catch (error) {
              console.error('Error marking returned:', error);
              Alert.alert('Error', 'Failed to update bottle status');
            } finally {
              setMarkingReturned(false);
            }
          },
        },
      ]
    );
  };

  if (loading || !order) {
    return (
      <View style={{ flex: 1, backgroundColor: COLORS.background, justifyContent: 'center', alignItems: 'center' }}>
        <Text style={{ color: COLORS.text.secondary }}>Loading...</Text>
      </View>
    );
  }

  const getStatusColor = () => {
    switch (order.status) {
      case 'delivered':
        return { bg: '#E8F5E9', text: COLORS.accent };
      case 'pending':
        return { bg: '#FFF0D2', text: COLORS.primary };
      case 'cancelled':
        return { bg: '#FFE0E0', text: COLORS.error };
      default:
        return { bg: COLORS.border, text: COLORS.text.secondary };
    }
  };

  const statusColors = getStatusColor();

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
            ORDER DETAILS
          </Text>
          <Text style={{ color: COLORS.white, fontSize: 24, fontWeight: '700' }}>
            #{order.id}
          </Text>
        </View>
      </View>

      <ScrollView
        style={{ flex: 1, paddingHorizontal: SPACING.xxl, paddingTop: SPACING.xxl }}
        showsVerticalScrollIndicator={false}
      >
        {/* Order Summary Card */}
        <View
          style={{
            backgroundColor: COLORS.white,
            borderRadius: BORDER_RADIUS.lg,
            padding: 28,
            marginBottom: SPACING.xxl,
            ...SHADOWS.md,
          }}
        >
          <View
            style={{
              flexDirection: 'row',
              justifyContent: 'space-between',
              alignItems: 'center',
              marginBottom: SPACING.xxl,
            }}
          >
            <Text
              style={{ fontSize: 20, fontWeight: '700', color: COLORS.secondary }}
            >
              Order Summary
            </Text>
            <View
              style={{
                backgroundColor: statusColors.bg,
                paddingHorizontal: 16,
                paddingVertical: 6,
                borderRadius: BORDER_RADIUS.xs,
              }}
            >
              <Text
                style={{
                  color: statusColors.text,
                  fontSize: 12,
                  fontWeight: '700',
                  letterSpacing: 0.5,
                  textTransform: 'uppercase',
                }}
              >
                {order.status}
              </Text>
            </View>
          </View>

          {/* Order Details */}
          <View
            style={{
              backgroundColor: COLORS.background,
              borderRadius: BORDER_RADIUS.sm,
              padding: 20,
            }}
          >
            <DetailRow label="Order Date" value={formatFullDate(order.date)} />
            <Divider />
            <DetailRow label="Delivery Time" value={order.delivery_time || '06:30 AM'} />
            <Divider />
            <DetailRow label="Product" value={PRODUCT.name} />
            <Divider />
            <DetailRow label="Quantity" value={`${order.quantity} Bottles`} />
            <Divider />
            <DetailRow 
              label="Amount Paid" 
              value={formatCurrency(order.amount)}
              valueColor={COLORS.primary}
              valueWeight="700"
              valueFontSize={16}
            />
            <Divider />
            <DetailRow 
              label="Bottle Status" 
              value={order.bottle_returned ? 'Returned' : 'Pending'}
              valueColor={order.bottle_returned ? COLORS.accent : COLORS.primary}
            />
          </View>

          {/* Mark as Returned Button */}
          {!order.bottle_returned && order.status === 'delivered' && (
            <TouchableOpacity
              style={{
                backgroundColor: markingReturned ? COLORS.text.secondary : COLORS.primary,
                paddingVertical: 18,
                borderRadius: BORDER_RADIUS.sm,
                alignItems: 'center',
                marginTop: SPACING.xxl,
                ...SHADOWS.primary,
              }}
              onPress={handleMarkReturned}
              disabled={markingReturned}
            >
              <Text
                style={{
                  color: COLORS.white,
                  fontWeight: '700',
                  fontSize: 16,
                }}
              >
                {markingReturned ? 'Updating...' : 'Mark as Returned'}
              </Text>
            </TouchableOpacity>
          )}
        </View>

        {/* Product Info Card */}
        <View
          style={{
            backgroundColor: COLORS.white,
            borderRadius: BORDER_RADIUS.md,
            padding: SPACING.xxl,
            marginBottom: SPACING.xxxl,
            ...SHADOWS.md,
          }}
        >
          <Text
            style={{
              fontSize: 18,
              fontWeight: '700',
              color: COLORS.secondary,
              marginBottom: 16,
            }}
          >
            Product Information
          </Text>
          <View style={{ flexDirection: 'row', alignItems: 'center' }}>
            <View
              style={{
                width: 64,
                height: 64,
                borderRadius: BORDER_RADIUS.md,
                backgroundColor: '#FFF0D2',
                alignItems: 'center',
                justifyContent: 'center',
                marginRight: 16,
              }}
            >
              <Text style={{ fontSize: 36 }}>{PRODUCT.image}</Text>
            </View>
            <View style={{ flex: 1 }}>
              <Text
                style={{
                  fontSize: 16,
                  fontWeight: '700',
                  color: COLORS.secondary,
                  marginBottom: 4,
                }}
              >
                {PRODUCT.name}
              </Text>
              <Text style={{ fontSize: 14, color: COLORS.text.secondary }}>
                {PRODUCT.size} • {formatCurrency(PRODUCT.price)} per bottle
              </Text>
            </View>
          </View>
        </View>
      </ScrollView>
    </View>
  );
}

// Helper Components
function DetailRow({ 
  label, 
  value, 
  valueColor = COLORS.secondary,
  valueWeight = '600',
  valueFontSize = 14,
}: { 
  label: string; 
  value: string;
  valueColor?: string;
  valueWeight?: string;
  valueFontSize?: number;
}) {
  return (
    <View
      style={{
        flexDirection: 'row',
        justifyContent: 'space-between',
        paddingVertical: 12,
      }}
    >
      <Text style={{ color: COLORS.text.secondary, fontSize: 14 }}>
        {label}
      </Text>
      <Text
        style={{
          fontWeight: valueWeight as any,
          color: valueColor,
          fontSize: valueFontSize,
        }}
      >
        {value}
      </Text>
    </View>
  );
}

function Divider() {
  return (
    <View
      style={{
        height: 1,
        backgroundColor: '#E0E0E0',
        marginVertical: 4,
      }}
    />
  );
}