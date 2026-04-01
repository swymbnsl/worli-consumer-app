import Button from "@/components/ui/Button"
import TextInput from "@/components/ui/TextInput"
import { showErrorToast, showSuccessToast } from "@/components/ui/Toast"
import { COLORS } from "@/constants/theme"
import { useAuth } from "@/hooks/useAuth"
import { createBottleReturn, fetchUserAddresses } from "@/lib/supabase-service"
import { Address } from "@/types/database.types"
import { useRouter } from "expo-router"
import { Calendar, MapPin, Package } from "lucide-react-native"
import React, { useEffect, useState } from "react"
import {
  ActivityIndicator,
  ScrollView,
  Text,
  TouchableOpacity,
  View,
} from "react-native"

export default function RequestBottleReturnScreen() {
  const { user } = useAuth()
  const router = useRouter()
  const [addresses, setAddresses] = useState<Address[]>([])
  const [selectedAddress, setSelectedAddress] = useState<Address | null>(null)
  const [quantity, setQuantity] = useState("")
  const [returnDate, setReturnDate] = useState("")
  const [notes, setNotes] = useState("")
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    fetchAddresses()
    // Set default return date to tomorrow
    const tomorrow = new Date()
    tomorrow.setDate(tomorrow.getDate() + 1)
    setReturnDate(tomorrow.toISOString().split("T")[0])
  }, [user])

  const fetchAddresses = async () => {
    if (!user) return

    try {
      const data = await fetchUserAddresses(user.id)
      setAddresses(data)
      if (data.length > 0) {
        setSelectedAddress(data[0])
      }
    } catch (error) {
      console.error("Error fetching addresses:", error)
      showErrorToast("Error", "Failed to load addresses")
    } finally {
      setLoading(false)
    }
  }

  const handleSubmit = async () => {
    if (!user) return

    // Validation
    if (!selectedAddress) {
      showErrorToast("Missing Address", "Please select a delivery address")
      return
    }

    const qty = parseInt(quantity)
    if (!qty || qty <= 0) {
      showErrorToast(
        "Invalid Quantity",
        "Please enter a valid number of bottles",
      )
      return
    }

    if (!returnDate) {
      showErrorToast("Missing Date", "Please select a return date")
      return
    }

    setSubmitting(true)
    try {
      await createBottleReturn({
        user_id: user.id,
        address_id: selectedAddress.id,
        quantity: qty,
        return_date: returnDate,
        notes: notes.trim() || undefined,
      })

      showSuccessToast("Success", "Bottle return requested successfully")
      router.back()
    } catch (error) {
      console.error("Error creating bottle return:", error)
      showErrorToast("Error", "Failed to request bottle return")
    } finally {
      setSubmitting(false)
    }
  }

  if (loading) {
    return (
      <View className="flex-1 bg-neutral-lightCream">
        <View className="flex-1 justify-center items-center">
          <ActivityIndicator size="large" color={COLORS.primary.navy} />
        </View>
      </View>
    )
  }

  if (addresses.length === 0) {
    return (
      <View className="flex-1 bg-neutral-lightCream">
        <View className="flex-1 justify-center items-center px-8">
          <View className="bg-primary-navy/5 p-6 rounded-full mb-4">
            <MapPin size={48} color={COLORS.primary.navy} strokeWidth={1.5} />
          </View>
          <Text className="font-sofia-bold text-lg text-neutral-darkGray mb-2 text-center">
            No addresses found
          </Text>
          <Text className="font-comfortaa text-sm text-neutral-gray text-center mb-6">
            Please add an address to request bottle returns
          </Text>
          <Button
            title="Add Address"
            onPress={() => router.push("/add-address")}
            variant="navy"
            size="medium"
          />
        </View>
      </View>
    )
  }

  return (
    <View className="flex-1 bg-neutral-lightCream">
      <ScrollView
        className="flex-1"
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 100 }}
      >
        {/* Info Card */}
        <View
          className="mx-4 mt-4 bg-secondary-skyBlue/10 p-4 rounded-xl flex-row items-start"
          style={{
            borderWidth: 1,
            borderColor: COLORS.secondary.skyBlue + "30",
          }}
        >
          <Package size={20} color={COLORS.secondary.skyBlue} strokeWidth={2} />
          <Text className="flex-1 ml-3 font-comfortaa text-xs text-primary-navy leading-5">
            Our delivery person will collect your empty bottles on the scheduled
            date at the selected address.
          </Text>
        </View>

        {/* Form */}
        <View className="mx-4 mt-6">
          {/* Quantity Input */}
          <View className="mb-6">
            <Text className="font-sofia-bold text-sm text-primary-navy mb-2">
              Number of Bottles
            </Text>
            <TextInput
              placeholder="Enter number of bottles"
              value={quantity}
              onChangeText={setQuantity}
              keyboardType="number-pad"
            />
          </View>

          {/* Return Date */}
          <View className="mb-6">
            <Text className="font-sofia-bold text-sm text-primary-navy mb-2">
              Collection Date
            </Text>
            <View className="bg-white rounded-xl p-4 border border-neutral-lightGray">
              <View className="flex-row items-center">
                <Calendar size={18} color={COLORS.neutral.gray} />
                <Text className="font-comfortaa text-sm text-primary-navy ml-3">
                  {new Date(returnDate).toLocaleDateString("en-IN", {
                    day: "numeric",
                    month: "long",
                    year: "numeric",
                  })}
                </Text>
              </View>
            </View>
            <Text className="font-comfortaa text-xs text-neutral-gray mt-2">
              Bottles will be collected tomorrow during your regular delivery
              time
            </Text>
          </View>

          {/* Address Selection */}
          <View className="mb-6">
            <Text className="font-sofia-bold text-sm text-primary-navy mb-2">
              Collection Address
            </Text>
            {addresses.map((address) => {
              const isSelected = selectedAddress?.id === address.id

              return (
                <TouchableOpacity
                  key={address.id}
                  className={`mb-3 bg-white rounded-xl p-4 border-2 ${
                    isSelected
                      ? "border-primary-orange"
                      : "border-neutral-lightGray"
                  }`}
                  onPress={() => setSelectedAddress(address)}
                  activeOpacity={0.7}
                >
                  <View className="flex-row items-start">
                    <View
                      className={`w-5 h-5 rounded-full border-2 items-center justify-center mr-3 mt-0.5 ${
                        isSelected
                          ? "border-primary-orange bg-primary-orange"
                          : "border-neutral-gray"
                      }`}
                    >
                      {isSelected && (
                        <View className="w-2 h-2 rounded-full bg-white" />
                      )}
                    </View>

                    <View className="flex-1">
                      <Text className="font-sofia-bold text-sm text-primary-navy mb-1">
                        {address.name || "Address"}
                      </Text>
                      <Text className="font-comfortaa text-xs text-neutral-darkGray">
                        {address.address_line1}
                        {address.address_line2 && `, ${address.address_line2}`}
                        {address.city && `, ${address.city}`}
                      </Text>
                    </View>
                  </View>
                </TouchableOpacity>
              )
            })}

            <TouchableOpacity
              className="py-3"
              onPress={() => router.push("/add-address")}
            >
              <Text className="font-sofia-bold text-sm text-primary-orange text-center">
                + Add New Address
              </Text>
            </TouchableOpacity>
          </View>

          {/* Notes */}
          <View className="mb-6">
            <Text className="font-sofia-bold text-sm text-primary-navy mb-2">
              Additional Notes (Optional)
            </Text>
            <TextInput
              placeholder="E.g., Keep bottles near the door"
              value={notes}
              onChangeText={setNotes}
              multiline
              numberOfLines={3}
            />
          </View>

          {/* Submit Button */}
          <Button
            title={submitting ? "Requesting..." : "Request Bottle Return"}
            onPress={handleSubmit}
            variant="navy"
            size="large"
            isLoading={submitting}
            disabled={submitting}
          />
        </View>
      </ScrollView>
    </View>
  )
}
