import React, { useEffect, useState } from 'react';
import {
    Alert,
    KeyboardAvoidingView,
    Modal,
    Platform,
    ScrollView,
    Text,
    TextInput,
    TouchableOpacity,
    View,
} from 'react-native';
import { BORDER_RADIUS, COLORS, SPACING } from '../../constants/theme';
import { useAuth } from '../../hooks/useAuth';
import { supabase } from '../../lib/supabase';
import { Address } from '../../types/database.types';
import { validatePincode } from '../../utils/validators';

interface AddEditAddressModalProps {
  visible: boolean;
  onClose: () => void;
  address: Address | null;
  onSuccess: () => void;
}

export default function AddEditAddressModal({
  visible,
  onClose,
  address,
  onSuccess,
}: AddEditAddressModalProps) {
  const { user } = useAuth();
  const [type, setType] = useState('Home');
  const [line1, setLine1] = useState('');
  const [line2, setLine2] = useState('');
  const [city, setCity] = useState('');
  const [state, setState] = useState('');
  const [pincode, setPincode] = useState('');
  const [isDefault, setIsDefault] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (address) {
      setType(address.type);
      setLine1(address.line1);
      setLine2(address.line2 || '');
      setCity(address.city);
      setState(address.state);
      setPincode(address.pincode);
      setIsDefault(address.is_default);
    } else {
      resetForm();
    }
  }, [address, visible]);

  const resetForm = () => {
    setType('Home');
    setLine1('');
    setLine2('');
    setCity('');
    setState('');
    setPincode('');
    setIsDefault(false);
  };

  const handleSave = async () => {
    // Validation
    if (!line1.trim()) {
      Alert.alert('Error', 'Please enter address line 1');
      return;
    }
    if (!city.trim()) {
      Alert.alert('Error', 'Please enter city');
      return;
    }
    if (!state.trim()) {
      Alert.alert('Error', 'Please enter state');
      return;
    }
    if (!validatePincode(pincode)) {
      Alert.alert('Error', 'Please enter a valid 6-digit pincode');
      return;
    }

    if (!user) return;

    setLoading(true);
    try {
      const addressData = {
        user_id: user.id,
        type,
        line1: line1.trim(),
        line2: line2.trim() || null,
        city: city.trim(),
        state: state.trim(),
        pincode: pincode.trim(),
        is_default: isDefault,
      };

      if (address) {
        // Update existing address
        const { error } = await supabase
          .from('addresses')
          .update(addressData)
          .eq('id', address.id);

        if (error) throw error;
        Alert.alert('Success', 'Address updated successfully');
      } else {
        // Create new address
        // If this is the first address or set as default, update others
        if (isDefault) {
          await supabase
            .from('addresses')
            .update({ is_default: false })
            .eq('user_id', user.id);
        }

        const { error } = await supabase
          .from('addresses')
          .insert([addressData]);

        if (error) throw error;
        Alert.alert('Success', 'Address added successfully');
      }

      onSuccess();
      handleClose();
    } catch (error) {
      console.error('Error saving address:', error);
      Alert.alert('Error', 'Failed to save address');
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    resetForm();
    onClose();
  };

  const addressTypes = ['Home', 'Office', 'Other'];

  return (
    <Modal visible={visible} transparent animationType="slide">
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={{ flex: 1 }}
      >
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
              maxHeight: '90%',
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
              {address ? 'Edit Address' : 'Add New Address'}
            </Text>
            <Text style={{ fontSize: 14, color: COLORS.text.secondary, marginBottom: SPACING.xxl }}>
              {address ? 'Update your delivery address' : 'Add a new delivery address'}
            </Text>

            <ScrollView showsVerticalScrollIndicator={false}>
              {/* Address Type */}
              <Text
                style={{
                  fontSize: 14,
                  fontWeight: '600',
                  color: COLORS.secondary,
                  marginBottom: 12,
                }}
              >
                Address Type
              </Text>
              <View style={{ flexDirection: 'row', marginBottom: SPACING.xxl }}>
                {addressTypes.map((t) => (
                  <TouchableOpacity
                    key={t}
                    style={{
                      flex: 1,
                      paddingVertical: 12,
                      borderRadius: BORDER_RADIUS.xs,
                      backgroundColor: type === t ? '#FFF0D2' : COLORS.white,
                      borderWidth: type === t ? 2 : 1,
                      borderColor: type === t ? COLORS.primary : COLORS.border,
                      marginRight: 8,
                      alignItems: 'center',
                    }}
                    onPress={() => setType(t)}
                  >
                    <Text
                      style={{
                        fontSize: 14,
                        fontWeight: '600',
                        color: type === t ? COLORS.primary : COLORS.text.secondary,
                      }}
                    >
                      {t}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>

              {/* Address Line 1 */}
              <Text
                style={{
                  fontSize: 14,
                  fontWeight: '600',
                  color: COLORS.secondary,
                  marginBottom: 12,
                }}
              >
                Address Line 1 *
              </Text>
              <TextInput
                style={{
                  borderWidth: 2,
                  borderColor: COLORS.border,
                  borderRadius: BORDER_RADIUS.xs,
                  paddingHorizontal: 16,
                  paddingVertical: 14,
                  fontSize: 15,
                  color: COLORS.secondary,
                  marginBottom: SPACING.lg,
                }}
                placeholder="House/Flat No, Building Name"
                value={line1}
                onChangeText={setLine1}
              />

              {/* Address Line 2 */}
              <Text
                style={{
                  fontSize: 14,
                  fontWeight: '600',
                  color: COLORS.secondary,
                  marginBottom: 12,
                }}
              >
                Address Line 2
              </Text>
              <TextInput
                style={{
                  borderWidth: 2,
                  borderColor: COLORS.border,
                  borderRadius: BORDER_RADIUS.xs,
                  paddingHorizontal: 16,
                  paddingVertical: 14,
                  fontSize: 15,
                  color: COLORS.secondary,
                  marginBottom: SPACING.lg,
                }}
                placeholder="Area, Street (Optional)"
                value={line2}
                onChangeText={setLine2}
              />

              {/* City */}
              <Text
                style={{
                  fontSize: 14,
                  fontWeight: '600',
                  color: COLORS.secondary,
                  marginBottom: 12,
                }}
              >
                City *
              </Text>
              <TextInput
                style={{
                  borderWidth: 2,
                  borderColor: COLORS.border,
                  borderRadius: BORDER_RADIUS.xs,
                  paddingHorizontal: 16,
                  paddingVertical: 14,
                  fontSize: 15,
                  color: COLORS.secondary,
                  marginBottom: SPACING.lg,
                }}
                placeholder="Enter city"
                value={city}
                onChangeText={setCity}
              />

              {/* State */}
              <Text
                style={{
                  fontSize: 14,
                  fontWeight: '600',
                  color: COLORS.secondary,
                  marginBottom: 12,
                }}
              >
                State *
              </Text>
              <TextInput
                style={{
                  borderWidth: 2,
                  borderColor: COLORS.border,
                  borderRadius: BORDER_RADIUS.xs,
                  paddingHorizontal: 16,
                  paddingVertical: 14,
                  fontSize: 15,
                  color: COLORS.secondary,
                  marginBottom: SPACING.lg,
                }}
                placeholder="Enter state"
                value={state}
                onChangeText={setState}
              />

              {/* Pincode */}
              <Text
                style={{
                  fontSize: 14,
                  fontWeight: '600',
                  color: COLORS.secondary,
                  marginBottom: 12,
                }}
              >
                Pincode *
              </Text>
              <TextInput
                style={{
                  borderWidth: 2,
                  borderColor: COLORS.border,
                  borderRadius: BORDER_RADIUS.xs,
                  paddingHorizontal: 16,
                  paddingVertical: 14,
                  fontSize: 15,
                  color: COLORS.secondary,
                  marginBottom: SPACING.xxl,
                }}
                placeholder="6-digit pincode"
                keyboardType="numeric"
                maxLength={6}
                value={pincode}
                onChangeText={setPincode}
              />

              {/* Set as Default */}
              <TouchableOpacity
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: 16,
                  borderRadius: BORDER_RADIUS.xs,
                  backgroundColor: COLORS.background,
                  marginBottom: SPACING.xxl,
                }}
                onPress={() => setIsDefault(!isDefault)}
              >
                <Text
                  style={{
                    fontSize: 15,
                    fontWeight: '600',
                    color: COLORS.secondary,
                  }}
                >
                  Set as default address
                </Text>
                <View
                  style={{
                    width: 24,
                    height: 24,
                    borderRadius: 12,
                    borderWidth: 2,
                    borderColor: isDefault ? COLORS.primary : COLORS.border,
                    backgroundColor: isDefault ? COLORS.primary : COLORS.white,
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  {isDefault && (
                    <View
                      style={{
                        width: 12,
                        height: 12,
                        borderRadius: 6,
                        backgroundColor: COLORS.white,
                      }}
                    />
                  )}
                </View>
              </TouchableOpacity>

              {/* Save Button */}
              <TouchableOpacity
                style={{
                  backgroundColor: loading ? COLORS.text.secondary : COLORS.primary,
                  paddingVertical: 18,
                  borderRadius: BORDER_RADIUS.sm,
                  alignItems: 'center',
                  marginBottom: 12,
                }}
                onPress={handleSave}
                disabled={loading}
              >
                <Text
                  style={{ color: COLORS.white, fontWeight: '700', fontSize: 16 }}
                >
                  {loading ? 'Saving...' : address ? 'Update Address' : 'Add Address'}
                </Text>
              </TouchableOpacity>

              {/* Cancel Button */}
              <TouchableOpacity
                style={{ paddingVertical: 16, alignItems: 'center', marginBottom: SPACING.lg }}
                onPress={handleClose}
              >
                <Text
                  style={{ color: COLORS.text.secondary, fontWeight: '600', fontSize: 14 }}
                >
                  Cancel
                </Text>
              </TouchableOpacity>
            </ScrollView>
          </View>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}