import { Calendar } from 'lucide-react-native';
import React, { useState } from 'react';
import {
    Modal,
    ScrollView,
    Text,
    TouchableOpacity,
    View,
} from 'react-native';
import { BORDER_RADIUS, COLORS, SPACING } from '@/constants/theme';
import { supabase } from '@/lib/supabase';
import { Subscription } from '@/types/database.types';
import { formatDate, getDaysArray } from '@/utils/dateUtils';
import { showErrorToast, showSuccessToast } from '@/components/ui/Toast';

interface PauseModalProps {
  visible: boolean;
  onClose: () => void;
  subscription: Subscription;
  onUpdate: () => void;
}

export default function PauseModal({ visible, onClose, subscription, onUpdate }: PauseModalProps) {
  const [selectedDates, setSelectedDates] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);

  const futureDays = getDaysArray(14, 1); // Next 14 days

  const toggleDate = (date: string) => {
    if (selectedDates.includes(date)) {
      setSelectedDates(selectedDates.filter(d => d !== date));
    } else {
      setSelectedDates([...selectedDates, date]);
    }
  };

  const handleConfirmPause = async () => {
    if (selectedDates.length === 0) {
      showErrorToast('No Dates Selected', 'Please select at least one date to pause');
      return;
    }

    setLoading(true);
    try {
      const existingPaused = subscription.paused_dates || [];
      const newPausedDates = [...new Set([...existingPaused, ...selectedDates])];

      const { error } = await supabase
        .from('subscriptions')
        .update({ paused_dates: newPausedDates })
        .eq('id', subscription.id);

      if (error) throw error;

      showSuccessToast('Success', `${selectedDates.length} date(s) paused successfully`);
      setSelectedDates([]);
      onUpdate();
      onClose();
    } catch (error) {
      console.error('Error pausing dates:', error);
      showErrorToast('Error', 'Failed to pause dates');
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    setSelectedDates([]);
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
            maxHeight: '80%',
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
            Pause Delivery
          </Text>
          <Text style={{ fontSize: 14, color: COLORS.text.secondary, marginBottom: SPACING.xxl }}>
            Select dates to pause your subscription
          </Text>

          {/* Date Selection */}
          <ScrollView style={{ marginBottom: SPACING.xxl }} showsVerticalScrollIndicator={false}>
            {futureDays.map((date, idx) => {
              const isSelected = selectedDates.includes(date);
              const isPaused = subscription.paused_dates?.includes(date);
              const dateObj = new Date(date);
              const dayName = dateObj.toLocaleDateString('en-IN', { weekday: 'long' });

              return (
                <TouchableOpacity
                  key={idx}
                  style={{
                    flexDirection: 'row',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    padding: 16,
                    borderRadius: BORDER_RADIUS.sm,
                    backgroundColor: isSelected ? '#FFF0D2' : isPaused ? COLORS.border : COLORS.white,
                    borderWidth: isSelected ? 2 : 1,
                    borderColor: isSelected ? COLORS.primary : COLORS.border,
                    marginBottom: 12,
                  }}
                  onPress={() => !isPaused && toggleDate(date)}
                  disabled={isPaused}
                >
                  <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                    <View
                      style={{
                        width: 40,
                        height: 40,
                        borderRadius: BORDER_RADIUS.sm,
                        backgroundColor: isSelected ? COLORS.primary : isPaused ? COLORS.text.light : '#E8F5E9',
                        alignItems: 'center',
                        justifyContent: 'center',
                        marginRight: 12,
                      }}
                    >
                      <Calendar size={20} color={isSelected || isPaused ? COLORS.white : COLORS.accent} />
                    </View>
                    <View>
                      <Text
                        style={{
                          fontSize: 15,
                          fontWeight: '600',
                          color: isPaused ? COLORS.text.light : COLORS.secondary,
                        }}
                      >
                        {formatDate(date)}
                      </Text>
                      <Text
                        style={{
                          fontSize: 12,
                          color: isPaused ? COLORS.text.light : COLORS.text.secondary,
                        }}
                      >
                        {dayName}
                      </Text>
                    </View>
                  </View>
                  {isPaused && (
                    <Text style={{ fontSize: 11, color: COLORS.text.light, fontWeight: '600' }}>
                      ALREADY PAUSED
                    </Text>
                  )}
                </TouchableOpacity>
              );
            })}
          </ScrollView>

          {/* Confirm Button */}
          <TouchableOpacity
            style={{
              backgroundColor: loading ? COLORS.text.secondary : COLORS.primary,
              paddingVertical: 18,
              borderRadius: BORDER_RADIUS.sm,
              alignItems: 'center',
              marginBottom: 12,
            }}
            onPress={handleConfirmPause}
            disabled={loading || selectedDates.length === 0}
          >
            <Text
              style={{ color: COLORS.white, fontWeight: '700', fontSize: 16 }}
            >
              {loading ? 'Pausing...' : `Confirm Pause ${selectedDates.length > 0 ? `(${selectedDates.length})` : ''}`}
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