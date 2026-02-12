import { useAuth } from "@/hooks/useAuth"
import { supabase } from "@/lib/supabase"
import { Address } from "@/types/database.types"
import { validatePincode } from "@/utils/validators"
import React, { useEffect, useState } from "react"
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
} from "react-native"

interface AddEditAddressModalProps {
  visible: boolean
  onClose: () => void
  address: Address | null
  onSuccess: () => void
}

export default function AddEditAddressModal({
  visible,
  onClose,
  address,
  onSuccess,
}: AddEditAddressModalProps) {
  const { user } = useAuth()
  const [name, setName] = useState("Home")
  const [line1, setLine1] = useState("")
  const [line2, setLine2] = useState("")
  const [city, setCity] = useState("")
  const [state, setState] = useState("")
  const [pincode, setPincode] = useState("")
  const [landmark, setLandmark] = useState("")
  const [deliveryInstructions, setDeliveryInstructions] = useState("")
  const [isDefault, setIsDefault] = useState(false)
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (address) {
      setName(address.name || "Home")
      setLine1(address.address_line1 || "")
      setLine2(address.address_line2 || "")
      setCity(address.city || "")
      setState(address.state || "")
      setPincode(address.pincode || "")
      setLandmark(address.landmark || "")
      setDeliveryInstructions(address.delivery_instructions || "")
      setIsDefault(address.is_default || false)
    } else {
      resetForm()
    }
  }, [address, visible])

  const resetForm = () => {
    setName("Home")
    setLine1("")
    setLine2("")
    setCity("")
    setState("")
    setPincode("")
    setLandmark("")
    setDeliveryInstructions("")
    setIsDefault(false)
  }

  const handleSave = async () => {
    // Validation
    if (!line1.trim()) {
      Alert.alert("Error", "Please enter address line 1")
      return
    }
    if (!city.trim()) {
      Alert.alert("Error", "Please enter city")
      return
    }
    if (!state.trim()) {
      Alert.alert("Error", "Please enter state")
      return
    }
    if (!validatePincode(pincode)) {
      Alert.alert("Error", "Please enter a valid 6-digit pincode")
      return
    }

    if (!user) return

    setLoading(true)
    try {
      const addressData = {
        user_id: user.id,
        name: name.trim() || "Home",
        address_line1: line1.trim(),
        address_line2: line2.trim() || null,
        city: city.trim(),
        state: state.trim(),
        pincode: pincode.trim(),
        landmark: landmark.trim() || null,
        delivery_instructions: deliveryInstructions.trim() || null,
        is_default: isDefault,
      }

      if (address) {
        // Update existing address
        // If setting as default, clear all other defaults first
        if (isDefault) {
          await supabase
            .from("addresses")
            .update({ is_default: false })
            .eq("user_id", user.id)
        }

        const { error } = await supabase
          .from("addresses")
          .update(addressData)
          .eq("id", address.id)

        if (error) throw error
        Alert.alert("Success", "Address updated successfully")
      } else {
        // Create new address
        // If this is the first address or set as default, update others
        if (isDefault) {
          await supabase
            .from("addresses")
            .update({ is_default: false })
            .eq("user_id", user.id)
        }

        const { error } = await supabase.from("addresses").insert([addressData])

        if (error) throw error
        Alert.alert("Success", "Address added successfully")
      }

      onSuccess()
      handleClose()
    } catch (error) {
      console.error("Error saving address:", error)
      Alert.alert("Error", "Failed to save address")
    } finally {
      setLoading(false)
    }
  }

  const handleClose = () => {
    resetForm()
    onClose()
  }

  return (
    <Modal visible={visible} transparent animationType="slide">
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        className="flex-1"
      >
        <View className="flex-1 bg-black/50 justify-end">
          <View className="bg-white rounded-t-3xl px-6 pt-4 pb-8 max-h-[90%]">
            {/* Handle Bar */}
            <View className="w-10 h-1 bg-neutral-lightGray rounded-full self-center mb-6" />

            <Text className="font-sofia-bold text-2xl text-primary-navy mb-2">
              {address ? "Edit Address" : "Add New Address"}
            </Text>
            <Text className="font-comfortaa text-sm text-neutral-gray mb-6">
              {address
                ? "Update your delivery address"
                : "Add a new delivery address"}
            </Text>

            <ScrollView showsVerticalScrollIndicator={false}>
              {/* Address Name / Label */}
              <Text className="font-sofia-bold text-sm text-primary-navy mb-3">
                Address Name
              </Text>
              <View className="flex-row gap-2 mb-4">
                {["Home", "Work", "Other"].map((label) => (
                  <TouchableOpacity
                    key={label}
                    onPress={() => setName(label)}
                    className={`px-4 py-2.5 rounded-xl border-2 ${
                      name === label
                        ? "border-primary-navy bg-primary-navy"
                        : "border-neutral-lightGray bg-white"
                    }`}
                  >
                    <Text
                      className={`font-sofia-bold text-sm ${
                        name === label ? "text-white" : "text-primary-navy"
                      }`}
                    >
                      {label}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
              {name === "Other" && (
                <TextInput
                  className="border-2 border-neutral-lightGray rounded-xl px-4 py-3.5 text-base text-primary-navy mb-4 font-comfortaa"
                  placeholder="E.g., Mom's Place, Gym"
                  placeholderTextColor="#9CA3AF"
                  value={name === "Other" ? "" : name}
                  onChangeText={(text) => setName(text || "Other")}
                />
              )}

              {/* Address Line 1 */}
              <Text className="font-sofia-bold text-sm text-primary-navy mb-3">
                Address Line 1 *
              </Text>
              <TextInput
                className="border-2 border-neutral-lightGray rounded-xl px-4 py-3.5 text-base text-primary-navy mb-4 font-comfortaa"
                placeholder="House/Flat No, Building Name"
                placeholderTextColor="#9CA3AF"
                value={line1}
                onChangeText={setLine1}
              />

              {/* Address Line 2 */}
              <Text className="font-sofia-bold text-sm text-primary-navy mb-3">
                Address Line 2
              </Text>
              <TextInput
                className="border-2 border-neutral-lightGray rounded-xl px-4 py-3.5 text-base text-primary-navy mb-4 font-comfortaa"
                placeholder="Area, Street, Locality (Optional)"
                placeholderTextColor="#9CA3AF"
                value={line2}
                onChangeText={setLine2}
              />

              {/* City */}
              <Text className="font-sofia-bold text-sm text-primary-navy mb-3">
                City *
              </Text>
              <TextInput
                className="border-2 border-neutral-lightGray rounded-xl px-4 py-3.5 text-base text-primary-navy mb-4 font-comfortaa"
                placeholder="Enter city"
                placeholderTextColor="#9CA3AF"
                value={city}
                onChangeText={setCity}
              />

              {/* State */}
              <Text className="font-sofia-bold text-sm text-primary-navy mb-3">
                State *
              </Text>
              <TextInput
                className="border-2 border-neutral-lightGray rounded-xl px-4 py-3.5 text-base text-primary-navy mb-4 font-comfortaa"
                placeholder="Enter state"
                placeholderTextColor="#9CA3AF"
                value={state}
                onChangeText={setState}
              />

              {/* Pincode */}
              <Text className="font-sofia-bold text-sm text-primary-navy mb-3">
                Pincode *
              </Text>
              <TextInput
                className="border-2 border-neutral-lightGray rounded-xl px-4 py-3.5 text-base text-primary-navy mb-4 font-comfortaa"
                placeholder="6-digit pincode"
                placeholderTextColor="#9CA3AF"
                keyboardType="numeric"
                maxLength={6}
                value={pincode}
                onChangeText={setPincode}
              />

              {/* Landmark */}
              <Text className="font-sofia-bold text-sm text-primary-navy mb-3">
                Landmark (Optional)
              </Text>
              <TextInput
                className="border-2 border-neutral-lightGray rounded-xl px-4 py-3.5 text-base text-primary-navy mb-4 font-comfortaa"
                placeholder="Nearby landmark for easy location"
                placeholderTextColor="#9CA3AF"
                value={landmark}
                onChangeText={setLandmark}
              />

              {/* Delivery Instructions */}
              <Text className="font-sofia-bold text-sm text-primary-navy mb-3">
                Delivery Instructions (Optional)
              </Text>
              <TextInput
                className="border-2 border-neutral-lightGray rounded-xl px-4 py-3.5 text-base text-primary-navy mb-6 font-comfortaa"
                placeholder="E.g., Ring the doorbell twice, Leave at door"
                placeholderTextColor="#9CA3AF"
                value={deliveryInstructions}
                onChangeText={setDeliveryInstructions}
                multiline
                numberOfLines={2}
                textAlignVertical="top"
              />

              {/* Set as Default */}
              <View className="mb-6">
                <Text className="font-sofia-bold text-sm text-primary-navy mb-3">
                  Preferences
                </Text>
                <TouchableOpacity
                  className="flex-row items-center justify-between p-4 rounded-2xl bg-neutral-lightCream/50 border-2 border-neutral-lightGray/50"
                  onPress={() => setIsDefault(!isDefault)}
                  activeOpacity={0.7}
                >
                  <View className="flex-1 mr-4">
                    <Text className="font-sofia-bold text-sm text-primary-navy mb-1">
                      Set as default address
                    </Text>
                    <Text className="font-comfortaa text-xs text-neutral-gray">
                      This address will be used for all deliveries
                    </Text>
                  </View>
                  <View
                    className={`w-6 h-6 rounded-full border-2 items-center justify-center ${
                      isDefault
                        ? "border-primary-navy bg-primary-navy"
                        : "border-neutral-gray bg-white"
                    }`}
                  >
                    {isDefault && (
                      <View className="w-3 h-3 rounded-full bg-white" />
                    )}
                  </View>
                </TouchableOpacity>
              </View>

              {/* Save Button */}
              <TouchableOpacity
                className={`py-3.5 rounded-2xl items-center mb-3 shadow-md ${
                  loading ? "bg-neutral-gray" : "bg-primary-navy"
                }`}
                onPress={handleSave}
                disabled={loading}
                activeOpacity={0.8}
              >
                <Text className="font-sofia-bold text-sm text-white">
                  {loading
                    ? "Saving..."
                    : address
                      ? "Update Address"
                      : "Add Address"}
                </Text>
              </TouchableOpacity>

              {/* Cancel Button */}
              <TouchableOpacity
                className="py-3.5 items-center mb-4"
                onPress={handleClose}
                activeOpacity={0.7}
              >
                <Text className="font-comfortaa text-sm text-neutral-gray">
                  Cancel
                </Text>
              </TouchableOpacity>
            </ScrollView>
          </View>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  )
}
