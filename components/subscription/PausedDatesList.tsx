import { X } from 'lucide-react-native';
import React from 'react';
import { Alert, Text, TouchableOpacity, View } from 'react-native';
import { BORDER_RADIUS, COLORS, SHADOWS, SPACING } from '@/constants/theme';
import { supabase } from '@/lib/supabase';
import { formatFullDate } from '@/utils/dateUtils';

interface PausedDatesListProps {
  pausedDates: string[];
  subscriptionId: string;
  onUpdate: () => void;
}

export default function PausedDatesList({ pausedDates, subscriptionId, onUpdate }: PausedDatesListProps) {
  const handleRemovePause = async (date: string) => {
    try {
      const newPausedDates = pausedDates.filter(d => d !== date);
      
      const { error } = await supabase
        .from('subscriptions')
        .update({ paused_dates: newPausedDates })
        .eq('id', subscriptionId);

      if (error) throw error;

      onUpdate();
      Alert.alert('Success', 'Pause removed successfully');
    } catch (error) {
      console.error('Error removing pause:', error);
      Alert.alert('Error', 'Failed to remove pause');
    }
  };

  return (
    <View
      style={{
        backgroundColor: COLORS.white,
        marginHorizontal: SPACING.xxl,
        marginTop: 16,
        borderRadius: BORDER_RADIUS.md,
        padding: SPACING.xxl,
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
        Paused Dates
      </Text>
      {pausedDates.map((date, idx) => (
        <View
          key={idx}
          style={{
            flexDirection: 'row',
            justifyContent: 'space-between',
            alignItems: 'center',
            paddingVertical: 14,
            borderBottomWidth: idx < pausedDates.length - 1 ? 1 : 0,
            borderBottomColor: COLORS.border,
          }}
        >
          <Text
            style={{
              color: COLORS.secondary,
              fontSize: 14,
              fontWeight: '500',
            }}
          >
            {formatFullDate(date)}
          </Text>
          <TouchableOpacity onPress={() => handleRemovePause(date)}>
            <X size={20} color={COLORS.primary} />
          </TouchableOpacity>
        </View>
      ))}
    </View>
  );
}
