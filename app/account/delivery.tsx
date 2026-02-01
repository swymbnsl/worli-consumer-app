import { useRouter } from 'expo-router';
import { CheckCircle, ChevronLeft } from 'lucide-react-native';
import React from 'react';
import { Text, TouchableOpacity, View } from 'react-native';
import { BORDER_RADIUS, COLORS, SHADOWS, SPACING } from '@/constants/theme';
import { useAuth } from '@/hooks/useAuth';

export default function DeliveryPreferencesScreen() {
  const router = useRouter();
  const { user, updateUser } = useAuth();

  const preferences = [
    {
      id: 'ring_doorbell',
      label: 'Ring Doorbell',
      description: 'Delivery person will ring the doorbell',
    },
    {
      id: 'drop_at_door',
      label: 'Drop at Door',
      description: 'Leave the order at your doorstep',
    },
    {
      id: 'hand_delivery',
      label: 'In-hand Delivery',
      description: 'Hand over the order directly to you',
    },
  ];

  const handleSelect = async (prefId: string) => {
    await updateUser({ delivery_preference: prefId as any });
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
        <TouchableOpacity onPress={() => router.back()} style={{ marginRight: 16 }}>
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
            PREFERENCES
          </Text>
          <Text style={{ color: COLORS.white, fontSize: 24, fontWeight: '700' }}>
            Delivery
          </Text>
        </View>
      </View>

      <View style={{ paddingHorizontal: SPACING.xxl, paddingTop: SPACING.xxl }}>
        {preferences.map((pref) => (
          <TouchableOpacity
            key={pref.id}
            style={{
              backgroundColor: COLORS.white,
              borderRadius: BORDER_RADIUS.md,
              padding: 24,
              marginBottom: 16,
              ...SHADOWS.md,
              flexDirection: 'row',
              justifyContent: 'space-between',
              alignItems: 'center',
              borderWidth: user?.delivery_preference === pref.id ? 2 : 0,
              borderColor: COLORS.primary,
            }}
            onPress={() => handleSelect(pref.id)}
          >
            <View style={{ flex: 1 }}>
              <Text
                style={{
                  fontWeight: '700',
                  fontSize: 16,
                  color: COLORS.secondary,
                  marginBottom: 4,
                }}
              >
                {pref.label}
              </Text>
              <Text style={{ fontSize: 13, color: COLORS.text.secondary, lineHeight: 18 }}>
                {pref.description}
              </Text>
            </View>
            {user?.delivery_preference === pref.id && (
              <CheckCircle size={28} color={COLORS.primary} />
            )}
          </TouchableOpacity>
        ))}
      </View>
    </View>
  );
}