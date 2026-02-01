import { useRouter } from 'expo-router';
import { AlertTriangle, ChevronLeft } from 'lucide-react-native';
import React, { useState } from 'react';
import { Alert, ScrollView, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { BORDER_RADIUS, COLORS, SHADOWS, SPACING } from '../../constants/theme';
import { useAuth } from '../../hooks/useAuth';

export default function DeleteAccountScreen() {
  const router = useRouter();
  const { user, logout } = useAuth();
  const [confirmText, setConfirmText] = useState('');
  const [loading, setLoading] = useState(false);

  const handleDelete = async () => {
    if (confirmText !== 'DELETE') {
      Alert.alert('Error', 'Please type DELETE to confirm');
      return;
    }

    Alert.alert(
      'Final Confirmation',
      'Are you absolutely sure? This action cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete Forever',
          style: 'destructive',
          onPress: async () => {
            setLoading(true);
            try {
              // In a real app, you would:
              // 1. Delete user data from database
              // 2. Cancel active subscriptions
              // 3. Process refunds if any
              // 4. Delete user account from auth
              
              // For now, just logout
              await logout();
              Alert.alert('Account Deleted', 'Your account has been successfully deleted.');
              router.replace('/(auth)/login');
            } catch (error) {
              console.error('Delete error:', error);
              Alert.alert('Error', 'Failed to delete account. Please try again.');
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
            DANGER ZONE
          </Text>
          <Text style={{ color: COLORS.white, fontSize: 24, fontWeight: '700' }}>
            Delete Account
          </Text>
        </View>
      </View>

      <ScrollView style={{ flex: 1, paddingHorizontal: SPACING.xxl, paddingTop: SPACING.xxl }}>
        {/* Warning Card */}
        <View
          style={{
            backgroundColor: '#FFE0E0',
            borderRadius: BORDER_RADIUS.md,
            padding: 24,
            marginBottom: 24,
            borderWidth: 2,
            borderColor: COLORS.error,
          }}
        >
          <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 16 }}>
            <View
              style={{
                width: 48,
                height: 48,
                borderRadius: BORDER_RADIUS.md,
                backgroundColor: COLORS.error,
                alignItems: 'center',
                justifyContent: 'center',
                marginRight: 16,
              }}
            >
              <AlertTriangle size={24} color={COLORS.white} />
            </View>
            <Text style={{ flex: 1, fontSize: 18, fontWeight: '700', color: COLORS.error }}>
              Warning
            </Text>
          </View>
          <Text style={{ fontSize: 14, color: COLORS.text.secondary, lineHeight: 20 }}>
            This action is permanent and cannot be undone. All your data will be deleted.
          </Text>
        </View>

        {/* What will be deleted */}
        <View
          style={{
            backgroundColor: COLORS.white,
            borderRadius: BORDER_RADIUS.md,
            padding: 24,
            marginBottom: 24,
            ...SHADOWS.md,
          }}
        >
          <Text style={{ fontSize: 18, fontWeight: '700', color: COLORS.secondary, marginBottom: 16 }}>
            What will be deleted:
          </Text>
          {[
            'Your profile and personal information',
            'All order history and transactions',
            'Active subscriptions',
            'Wallet balance (non-refundable)',
            'Saved addresses',
            'Referral rewards',
          ].map((item, index) => (
            <View key={index} style={{ flexDirection: 'row', marginBottom: 12 }}>
              <Text style={{ color: COLORS.error, marginRight: 8 }}>•</Text>
              <Text style={{ flex: 1, fontSize: 14, color: COLORS.text.secondary }}>
                {item}
              </Text>
            </View>
          ))}
        </View>

        {/* Confirmation */}
        <View
          style={{
            backgroundColor: COLORS.white,
            borderRadius: BORDER_RADIUS.md,
            padding: 24,
            marginBottom: SPACING.xxxl,
            ...SHADOWS.md,
          }}
        >
          <Text style={{ fontSize: 16, fontWeight: '700', color: COLORS.secondary, marginBottom: 12 }}>
            Type DELETE to confirm
          </Text>
          <Text style={{ fontSize: 14, color: COLORS.text.secondary, marginBottom: 16, lineHeight: 20 }}>
            Please type the word DELETE in capital letters to proceed with account deletion.
          </Text>
          <TextInput
            style={{
              borderWidth: 2,
              borderColor: confirmText === 'DELETE' ? COLORS.error : COLORS.border,
              borderRadius: BORDER_RADIUS.sm,
              paddingHorizontal: 20,
              paddingVertical: 16,
              marginBottom: 20,
              fontSize: 16,
              color: COLORS.secondary,
              fontWeight: '600',
            }}
            value={confirmText}
            onChangeText={setConfirmText}
            placeholder="Type DELETE here"
            autoCapitalize="characters"
          />

          <TouchableOpacity
            style={{
              backgroundColor: confirmText === 'DELETE' && !loading ? COLORS.error : COLORS.text.secondary,
              paddingVertical: 18,
              borderRadius: BORDER_RADIUS.sm,
              alignItems: 'center',
              marginBottom: 12,
            }}
            onPress={handleDelete}
            disabled={confirmText !== 'DELETE' || loading}
          >
            <Text style={{ color: COLORS.white, fontWeight: '700', fontSize: 16 }}>
              {loading ? 'Deleting Account...' : 'Delete My Account Forever'}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={{
              paddingVertical: 16,
              alignItems: 'center',
            }}
            onPress={() => router.back()}
          >
            <Text style={{ color: COLORS.text.secondary, fontWeight: '600', fontSize: 14 }}>
              Cancel
            </Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </View>
  );
}

