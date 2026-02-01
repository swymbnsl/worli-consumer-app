import { Calendar } from 'lucide-react-native';
import React from 'react';
import {
    Modal,
    ScrollView,
    Text,
    TouchableOpacity,
    View,
} from 'react-native';
import { BORDER_RADIUS, COLORS, SPACING } from '../../constants/theme';
import { formatDate, getDaysArray } from '../../utils/dateUtils';

interface DatePickerModalProps {
  visible: boolean;
  onClose: () => void;
  selectedDate: string;
  onSelectDate: (date: string) => void;
}

export default function DatePickerModal({
  visible,
  onClose,
  selectedDate,
  onSelectDate,
}: DatePickerModalProps) {
  const futureDays = getDaysArray(14, 1); // Next 14 days

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
            maxHeight: '70%',
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
            Select Delivery Date
          </Text>
          <Text style={{ fontSize: 14, color: COLORS.text.secondary, marginBottom: SPACING.xxl }}>
            Choose a date for your delivery
          </Text>

          {/* Date Selection */}
          <ScrollView showsVerticalScrollIndicator={false}>
            {futureDays.map((date, idx) => {
              const isSelected = selectedDate === date;
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
                    backgroundColor: isSelected ? '#FFF0D2' : COLORS.white,
                    borderWidth: isSelected ? 2 : 1,
                    borderColor: isSelected ? COLORS.primary : COLORS.border,
                    marginBottom: 12,
                  }}
                  onPress={() => onSelectDate(date)}
                >
                  <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                    <View
                      style={{
                        width: 40,
                        height: 40,
                        borderRadius: BORDER_RADIUS.sm,
                        backgroundColor: isSelected ? COLORS.primary : '#E8F5E9',
                        alignItems: 'center',
                        justifyContent: 'center',
                        marginRight: 12,
                      }}
                    >
                      <Calendar size={20} color={isSelected ? COLORS.white : COLORS.accent} />
                    </View>
                    <View>
                      <Text
                        style={{
                          fontSize: 15,
                          fontWeight: '600',
                          color: COLORS.secondary,
                        }}
                      >
                        {formatDate(date)}
                      </Text>
                      <Text
                        style={{
                          fontSize: 12,
                          color: COLORS.text.secondary,
                        }}
                      >
                        {dayName}
                      </Text>
                    </View>
                  </View>
                  {isSelected && (
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
              );
            })}
          </ScrollView>

          {/* Close Button */}
          <TouchableOpacity
            style={{
              paddingVertical: 16,
              alignItems: 'center',
              marginTop: SPACING.lg,
            }}
            onPress={onClose}
          >
            <Text
              style={{ color: COLORS.text.secondary, fontWeight: '600', fontSize: 14 }}
            >
              Close
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}