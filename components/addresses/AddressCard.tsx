
import React from 'react';
import { Text, TouchableOpacity, View } from 'react-native';
import { BORDER_RADIUS, COLORS, SHADOWS, SPACING } from '../../constants/theme';
import { Address } from '../../types/database.types';

interface AddressCardProps {
  address: Address;
  onEdit: () => void;
  onDelete: () => void;
  onSetDefault: () => void;
}

export default function AddressCard({ address, onEdit, onDelete, onSetDefault }: AddressCardProps) {
  return (
    <View
      style={{
        backgroundColor: COLORS.white,
        borderRadius: BORDER_RADIUS.md,
        padding: SPACING.xxl,
        marginBottom: 16,
        ...SHADOWS.md,
      }}
    >
      <View
        style={{
          flexDirection: 'row',
          justifyContent: 'space-between',
          marginBottom: 16,
        }}
      >
        <View
          style={{
            backgroundColor: '#FFF0D2',
            paddingHorizontal: 14,
            paddingVertical: 6,
            borderRadius: BORDER_RADIUS.xs,
          }}
        >
          <Text
            style={{
              color: COLORS.primary,
              fontSize: 12,
              fontWeight: '700',
              letterSpacing: 0.3,
            }}
          >
            {address.type}
          </Text>
        </View>
        {address.is_default && (
          <View
            style={{
              backgroundColor: '#E8F5E9',
              paddingHorizontal: 14,
              paddingVertical: 6,
              borderRadius: BORDER_RADIUS.xs,
            }}
          >
            <Text
              style={{
                color: COLORS.accent,
                fontSize: 12,
                fontWeight: '700',
                letterSpacing: 0.3,
              }}
            >
              DEFAULT
            </Text>
          </View>
        )}
      </View>

      <Text
        style={{
          color: COLORS.secondary,
          fontSize: 15,
          fontWeight: '600',
          marginBottom: 4,
        }}
      >
        {address.line1}
      </Text>
      {address.line2 && (
        <Text
          style={{ color: COLORS.secondary, fontSize: 15, marginBottom: 4 }}
        >
          {address.line2}
        </Text>
      )}
      <Text style={{ color: COLORS.text.secondary, fontSize: 14, marginBottom: 4 }}>
        {address.city}, {address.state}
      </Text>
      <Text style={{ color: COLORS.text.secondary, fontSize: 14 }}>
        Pincode: {address.pincode}
      </Text>

      <View
        style={{
          flexDirection: 'row',
          marginTop: 16,
          paddingTop: 16,
          borderTopWidth: 1,
          borderTopColor: COLORS.border,
        }}
      >
        {!address.is_default && (
          <TouchableOpacity
            style={{
              flex: 1,
              backgroundColor: '#E8F5E9',
              paddingVertical: 12,
              borderRadius: BORDER_RADIUS.xs,
              marginRight: 8,
              alignItems: 'center',
              borderWidth: 1,
              borderColor: COLORS.accent,
            }}
            onPress={onSetDefault}
          >
            <Text
              style={{
                color: COLORS.accent,
                fontWeight: '700',
                fontSize: 14,
              }}
            >
              Set Default
            </Text>
          </TouchableOpacity>
        )}
        <TouchableOpacity
          style={{
            flex: 1,
            backgroundColor: '#FFF0D2',
            paddingVertical: 12,
            borderRadius: BORDER_RADIUS.xs,
            marginRight: 8,
            alignItems: 'center',
            borderWidth: 1,
            borderColor: COLORS.primary,
          }}
          onPress={onEdit}
        >
          <Text
            style={{
              color: COLORS.primary,
              fontWeight: '700',
              fontSize: 14,
            }}
          >
            Edit
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={{
            flex: 1,
            backgroundColor: '#FFE0E0',
            paddingVertical: 12,
            borderRadius: BORDER_RADIUS.xs,
            alignItems: 'center',
            borderWidth: 1,
            borderColor: COLORS.error,
          }}
          onPress={onDelete}
        >
          <Text
            style={{
              color: COLORS.error,
              fontWeight: '700',
              fontSize: 14,
            }}
          >
            Delete
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}