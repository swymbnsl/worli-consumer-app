import React from 'react';
import { Text, TouchableOpacity, View } from 'react-native';
import { PRODUCT } from '@/constants/product';
import { BORDER_RADIUS, COLORS, SHADOWS, SPACING } from '@/constants/theme';
import { Subscription } from '@/types/database.types';
import { formatDate } from '@/utils/dateUtils';
import { formatCurrency } from '@/utils/formatters';

interface SubscriptionCardProps {
  subscription: Subscription;
  onEdit: () => void;
  onPause: () => void;
}

export default function SubscriptionCard({ subscription, onEdit, onPause }: SubscriptionCardProps) {
  return (
    <View
      style={{
        backgroundColor: COLORS.white,
        marginHorizontal: SPACING.xxl,
        marginTop: -20,
        borderRadius: BORDER_RADIUS.lg,
        padding: 28,
        ...SHADOWS.lg,
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
          Active Plan
        </Text>
        <View
          style={{
            backgroundColor: '#E8F5E9',
            paddingHorizontal: 16,
            paddingVertical: 6,
            borderRadius: BORDER_RADIUS.xs,
          }}
        >
          <Text
            style={{
              color: COLORS.accent,
              fontSize: 12,
              fontWeight: '700',
              letterSpacing: 0.5,
              textTransform: 'uppercase',
            }}
          >
            ACTIVE
          </Text>
        </View>
      </View>

      {/* Subscription Details */}
      <View
        style={{
          backgroundColor: COLORS.background,
          borderRadius: BORDER_RADIUS.sm,
          padding: 20,
          marginBottom: 20,
        }}
      >
        <DetailRow label="Product" value={PRODUCT.name} />
        <Divider />
        <DetailRow label="Daily Quantity" value={`${subscription.quantity} Bottles`} />
        <Divider />
        <DetailRow 
          label="Frequency" 
          value={subscription.frequency.charAt(0).toUpperCase() + subscription.frequency.slice(1)} 
        />
        <Divider />
        <DetailRow 
          label="Next Delivery" 
          value={subscription.next_delivery ? formatDate(subscription.next_delivery) : 'N/A'} 
        />
        <Divider />
        <DetailRow
          label="Daily Cost"
          value={formatCurrency(PRODUCT.price * subscription.quantity)}
          valueColor={COLORS.primary}
          valueWeight="700"
          valueFontSize={16}
        />
      </View>

      {/* Action Buttons */}
      <View style={{ flexDirection: 'row', marginTop: 8 }}>
        <TouchableOpacity
          style={{
            flex: 1,
            backgroundColor: COLORS.secondary,
            paddingVertical: 16,
            borderRadius: BORDER_RADIUS.sm,
            marginRight: 8,
            alignItems: 'center',
          }}
          onPress={onEdit}
        >
          <Text style={{ color: COLORS.white, fontWeight: '700', fontSize: 14 }}>
            Edit Plan
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={{
            flex: 1,
            backgroundColor: '#FFF0D2',
            paddingVertical: 16,
            borderRadius: BORDER_RADIUS.sm,
            marginLeft: 8,
            alignItems: 'center',
            borderWidth: 1,
            borderColor: COLORS.primary,
          }}
          onPress={onPause}
        >
          <Text style={{ color: COLORS.primary, fontWeight: '700', fontSize: 14 }}>
            Pause
          </Text>
        </TouchableOpacity>
      </View>
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

