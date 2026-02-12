import { Address } from "@/types/database.types"
import { formatFullDate } from "@/utils/dateUtils"
import { MapPin, MoreVertical } from "lucide-react-native"
import React, { useState } from "react"
import { Alert, Modal, Text, TouchableOpacity, View } from "react-native"

interface AddressCardProps {
  address: Address
  onEdit: () => void
  onDelete: () => void
  onSetDefault: () => void
}

export default function AddressCard({
  address,
  onEdit,
  onDelete,
  onSetDefault,
}: AddressCardProps) {
  const [showActions, setShowActions] = useState(false)

  const handleDelete = () => {
    setShowActions(false)
    Alert.alert(
      "Delete Address",
      "Are you sure you want to delete this address?",
      [
        { text: "Cancel", style: "cancel" },
        { text: "Delete", style: "destructive", onPress: onDelete },
      ],
    )
  }

  const handleSetDefault = () => {
    setShowActions(false)
    onSetDefault()
  }

  const handleEdit = () => {
    setShowActions(false)
    onEdit()
  }

  return (
    <>
      <View className="bg-white rounded-2xl p-4 mb-4 shadow-sm">
        {/* Header with Status */}
        <View className="flex-row justify-between items-start mb-3">
          <View className="flex-1">
            <Text className="font-sofia-bold text-base text-primary-navy mb-1">
              {address.name || "Home"}
            </Text>
          </View>
          <View className="flex-row items-center gap-2">
            {address.is_default && (
              <View className="bg-functional-success/10 px-3 py-1.5 rounded-full border border-functional-success/30">
                <Text className="font-sofia-bold text-xs text-functional-success uppercase tracking-wide">
                  Default
                </Text>
              </View>
            )}
            <TouchableOpacity
              onPress={() => setShowActions(true)}
              className="p-1 active:opacity-70"
            >
              <MoreVertical size={20} color="#101B53" />
            </TouchableOpacity>
          </View>
        </View>

        {/* Address Content */}
        <View className="flex-row">
          <View className="mt-0.5 mr-3">
            <MapPin size={20} color="#638C5F" />
          </View>
          <View className="flex-1">
            <Text className="font-comfortaa text-sm text-neutral-darkGray leading-5 mb-1">
              {address.address_line1}
              {address.address_line2 ? `, ${address.address_line2}` : ""}
              {address.landmark ? `, ${address.landmark}` : ""}
              {`, ${address.city}, ${address.state}-${address.pincode}`}
            </Text>
            {address.created_at && (
              <Text className="font-comfortaa text-xs text-neutral-gray mt-2">
                Added on: {formatFullDate(address.created_at)}
              </Text>
            )}
          </View>
        </View>
      </View>

      {/* Actions Modal */}
      <Modal
        visible={showActions}
        transparent
        animationType="fade"
        onRequestClose={() => setShowActions(false)}
      >
        <TouchableOpacity
          activeOpacity={1}
          onPress={() => setShowActions(false)}
          className="flex-1 bg-black/50 justify-end"
        >
          <View className="bg-white rounded-t-3xl p-6">
            <View className="w-12 h-1 bg-neutral-gray/30 rounded-full self-center mb-6" />

            <Text className="font-sofia-bold text-lg text-primary-navy mb-4">
              Address Actions
            </Text>

            {!address.is_default && (
              <TouchableOpacity
                onPress={handleSetDefault}
                className="flex-row items-center py-4 border-b border-neutral-lightGray active:opacity-70"
              >
                <View className="w-10 h-10 rounded-full bg-secondary-sage/10 items-center justify-center mr-3">
                  <Text className="text-lg">✓</Text>
                </View>
                <Text className="font-comfortaa text-base text-primary-navy flex-1">
                  Set as Default
                </Text>
              </TouchableOpacity>
            )}

            <TouchableOpacity
              onPress={handleEdit}
              className="flex-row items-center py-4 border-b border-neutral-lightGray active:opacity-70"
            >
              <View className="w-10 h-10 rounded-full bg-secondary-skyBlue/20 items-center justify-center mr-3">
                <Text className="text-lg">✏️</Text>
              </View>
              <Text className="font-comfortaa text-base text-primary-navy flex-1">
                Edit Address
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              onPress={handleDelete}
              className="flex-row items-center py-4 active:opacity-70"
            >
              <View className="w-10 h-10 rounded-full bg-functional-error/10 items-center justify-center mr-3">
                <Text className="text-lg">🗑️</Text>
              </View>
              <Text className="font-comfortaa text-base text-functional-error flex-1">
                Delete Address
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              onPress={() => setShowActions(false)}
              className="mt-6 bg-neutral-lightGray rounded-xl py-4 items-center active:opacity-70"
            >
              <Text className="font-sofia-bold text-base text-neutral-darkGray">
                Cancel
              </Text>
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </Modal>
    </>
  )
}
