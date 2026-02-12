import Button from "@/components/ui/Button"
import { COLORS } from "@/constants/theme"
import { useAuth } from "@/hooks/useAuth"
import { createAddress, updateAddress } from "@/lib/supabase-service"
import { Address } from "@/types/database.types"
import {
  BottomSheetBackdrop,
  BottomSheetModal,
  BottomSheetScrollView,
} from "@gorhom/bottom-sheet"
import React, {
  forwardRef,
  useCallback,
  useImperativeHandle,
  useMemo,
  useRef,
  useState,
} from "react"
import { Alert, Text, TextInput, TouchableOpacity, View } from "react-native"

// ─── Types ─────────────────────────────────────────────────────────────────────

export interface AddressDetailsSheetRef {
  open: (
    location: {
      latitude: number
      longitude: number
      addressLine1: string
      addressLine2?: string
      city?: string
      state?: string
      pincode?: string
    },
    editAddress?: Address,
  ) => void
  close: () => void
}

interface AddressDetailsSheetProps {
  onSaved: () => void
}

// ─── Name Label Presets ────────────────────────────────────────────────────────

const NAME_PRESETS = ["Home", "Work", "Other"]

// ─── Component ─────────────────────────────────────────────────────────────────

const AddressDetailsSheet = forwardRef<
  AddressDetailsSheetRef,
  AddressDetailsSheetProps
>(({ onSaved }, ref) => {
  const bottomSheetRef = useRef<BottomSheetModal>(null)
  const { user } = useAuth()

  const [name, setName] = useState("Home")
  const [customName, setCustomName] = useState("")
  const [line1, setLine1] = useState("")
  const [line2, setLine2] = useState("")
  const [city, setCity] = useState("")
  const [state, setState] = useState("")
  const [pincode, setPincode] = useState("")
  const [landmark, setLandmark] = useState("")
  const [deliveryInstructions, setDeliveryInstructions] = useState("")
  const [isDefault, setIsDefault] = useState(false)
  const [latitude, setLatitude] = useState(0)
  const [longitude, setLongitude] = useState(0)
  const [saving, setSaving] = useState(false)
  const [editingAddress, setEditingAddress] = useState<Address | null>(null)

  const snapPoints = useMemo(() => ["75%", "92%"], [])

  // ─── Imperative Handle ──────────────────────────────────────────────

  useImperativeHandle(ref, () => ({
    open: (location, editAddress) => {
      setLatitude(location.latitude)
      setLongitude(location.longitude)
      setLine1(location.addressLine1 || "")
      setLine2(location.addressLine2 || "")
      setCity(location.city || "")
      setState(location.state || "")
      setPincode(location.pincode || "")

      if (editAddress) {
        setEditingAddress(editAddress)
        setName(
          NAME_PRESETS.includes(editAddress.name || "")
            ? editAddress.name!
            : "Other",
        )
        setCustomName(
          NAME_PRESETS.includes(editAddress.name || "")
            ? ""
            : editAddress.name || "",
        )
        setLandmark(editAddress.landmark || "")
        setDeliveryInstructions(editAddress.delivery_instructions || "")
        setIsDefault(editAddress.is_default || false)
      } else {
        setEditingAddress(null)
        setName("Home")
        setCustomName("")
        setLandmark("")
        setDeliveryInstructions("")
        setIsDefault(false)
      }

      bottomSheetRef.current?.present()
    },
    close: () => {
      bottomSheetRef.current?.dismiss()
    },
  }))

  // ─── Save Handler ───────────────────────────────────────────────────

  const handleSave = async () => {
    if (!user?.id) return

    if (!line1.trim()) {
      Alert.alert("Error", "Please enter the complete address")
      return
    }

    const finalName = name === "Other" ? customName.trim() || "Other" : name

    setSaving(true)
    try {
      const addressData = {
        user_id: user.id,
        name: finalName,
        address_line1: line1.trim(),
        address_line2: line2.trim() || null,
        city: city.trim() || null,
        state: state.trim() || null,
        pincode: pincode.trim() || null,
        landmark: landmark.trim() || null,
        delivery_instructions: deliveryInstructions.trim() || null,
        latitude,
        longitude,
        is_default: isDefault,
      }

      if (editingAddress) {
        await updateAddress(editingAddress.id, user.id, addressData)
      } else {
        await createAddress(addressData)
      }

      bottomSheetRef.current?.dismiss()
      onSaved()
    } catch (err: any) {
      Alert.alert("Error", err.message || "Failed to save address")
    } finally {
      setSaving(false)
    }
  }

  // ─── Backdrop ───────────────────────────────────────────────────────

  const renderBackdrop = useCallback(
    (props: any) => (
      <BottomSheetBackdrop
        {...props}
        disappearsOnIndex={-1}
        appearsOnIndex={0}
        opacity={0.5}
      />
    ),
    [],
  )

  // ─── Render ─────────────────────────────────────────────────────────

  return (
    <BottomSheetModal
      ref={bottomSheetRef}
      index={0}
      snapPoints={snapPoints}
      enablePanDownToClose
      backdropComponent={renderBackdrop}
      backgroundStyle={{
        backgroundColor: COLORS.neutral.white,
        borderTopLeftRadius: 24,
        borderTopRightRadius: 24,
      }}
      handleIndicatorStyle={{
        backgroundColor: COLORS.neutral.lightGray,
        width: 40,
      }}
      keyboardBehavior="interactive"
      keyboardBlurBehavior="restore"
      android_keyboardInputMode="adjustResize"
    >
      <BottomSheetScrollView
        contentContainerStyle={{ padding: 20, paddingBottom: 40 }}
        showsVerticalScrollIndicator={false}
      >
        {/* Title */}
        <Text className="font-sofia-bold text-xl text-primary-navy mb-1">
          {editingAddress ? "Edit Address" : "Complete Address"}
        </Text>
        <Text className="font-comfortaa text-sm text-neutral-gray mb-6">
          Add details for easy delivery
        </Text>

        {/* Address Name / Label */}
        <Text className="font-sofia-bold text-sm text-primary-navy mb-2">
          Save as
        </Text>
        <View className="flex-row gap-2 mb-4">
          {NAME_PRESETS.map((label) => (
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
                {label === "Home"
                  ? "🏠 Home"
                  : label === "Work"
                    ? "💼 Work"
                    : "📍 Other"}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
        {name === "Other" && (
          <TextInput
            className="border-2 border-neutral-lightGray rounded-xl px-4 py-3 text-base text-primary-navy mb-4 font-comfortaa"
            placeholder="E.g., Mom's Place, Gym"
            placeholderTextColor="#9CA3AF"
            value={customName}
            onChangeText={setCustomName}
          />
        )}

        {/* Address Line 1 */}
        <Text className="font-sofia-bold text-sm text-primary-navy mb-2">
          House / Flat / Floor No. *
        </Text>
        <TextInput
          className="border-2 border-neutral-lightGray rounded-xl px-4 py-3 text-base text-primary-navy mb-4 font-comfortaa"
          placeholder="E.g., Flat 301, 3rd Floor"
          placeholderTextColor="#9CA3AF"
          value={line1}
          onChangeText={setLine1}
        />

        {/* Address Line 2 */}
        <Text className="font-sofia-bold text-sm text-primary-navy mb-2">
          Building / Area / Street
        </Text>
        <TextInput
          className="border-2 border-neutral-lightGray rounded-xl px-4 py-3 text-base text-primary-navy mb-4 font-comfortaa"
          placeholder="E.g., ABC Apartments, MG Road"
          placeholderTextColor="#9CA3AF"
          value={line2}
          onChangeText={setLine2}
        />

        {/* City + State */}
        <View className="flex-row gap-3 mb-4">
          <View className="flex-1">
            <Text className="font-sofia-bold text-sm text-primary-navy mb-2">
              City
            </Text>
            <TextInput
              className="border-2 border-neutral-lightGray rounded-xl px-4 py-3 text-base text-primary-navy font-comfortaa"
              placeholder="City"
              placeholderTextColor="#9CA3AF"
              value={city}
              onChangeText={setCity}
            />
          </View>
          <View className="flex-1">
            <Text className="font-sofia-bold text-sm text-primary-navy mb-2">
              Pincode
            </Text>
            <TextInput
              className="border-2 border-neutral-lightGray rounded-xl px-4 py-3 text-base text-primary-navy font-comfortaa"
              placeholder="Pincode"
              placeholderTextColor="#9CA3AF"
              keyboardType="numeric"
              maxLength={6}
              value={pincode}
              onChangeText={setPincode}
            />
          </View>
        </View>

        {/* Landmark */}
        <Text className="font-sofia-bold text-sm text-primary-navy mb-2">
          Landmark (Optional)
        </Text>
        <TextInput
          className="border-2 border-neutral-lightGray rounded-xl px-4 py-3 text-base text-primary-navy mb-4 font-comfortaa"
          placeholder="E.g., Near Big Bazaar"
          placeholderTextColor="#9CA3AF"
          value={landmark}
          onChangeText={setLandmark}
        />

        {/* Delivery Instructions */}
        <Text className="font-sofia-bold text-sm text-primary-navy mb-2">
          Delivery Instructions (Optional)
        </Text>
        <TextInput
          className="border-2 border-neutral-lightGray rounded-xl px-4 py-3 text-base text-primary-navy mb-5 font-comfortaa"
          placeholder="E.g., Ring the doorbell twice"
          placeholderTextColor="#9CA3AF"
          value={deliveryInstructions}
          onChangeText={setDeliveryInstructions}
          multiline
          numberOfLines={2}
          textAlignVertical="top"
        />

        {/* Set as Default */}
        <TouchableOpacity
          className="flex-row items-center justify-between p-4 rounded-2xl bg-neutral-lightCream/50 border-2 border-neutral-lightGray/50 mb-6"
          onPress={() => setIsDefault(!isDefault)}
          activeOpacity={0.7}
        >
          <View className="flex-1 mr-4">
            <Text className="font-sofia-bold text-sm text-primary-navy mb-0.5">
              Set as default address
            </Text>
            <Text className="font-comfortaa text-xs text-neutral-gray">
              Used for all new deliveries
            </Text>
          </View>
          <View
            className={`w-6 h-6 rounded-full border-2 items-center justify-center ${
              isDefault
                ? "border-primary-navy bg-primary-navy"
                : "border-neutral-gray bg-white"
            }`}
          >
            {isDefault && <View className="w-3 h-3 rounded-full bg-white" />}
          </View>
        </TouchableOpacity>

        {/* Save Button */}
        <Button
          title={
            saving
              ? "Saving..."
              : editingAddress
                ? "Update Address"
                : "Save Address"
          }
          onPress={handleSave}
          variant="navy"
          size="large"
          disabled={saving}
        />
      </BottomSheetScrollView>
    </BottomSheetModal>
  )
})

AddressDetailsSheet.displayName = "AddressDetailsSheet"

export default AddressDetailsSheet
