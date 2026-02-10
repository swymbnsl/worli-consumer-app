import AddEditAddressModal from "@/components/addresses/AddEditAddressModal"
import AddressCard from "@/components/addresses/AddressCard"
import Button from "@/components/ui/Button"
import { COLORS } from "@/constants/theme"
import { useAuth } from "@/hooks/useAuth"
import {
  deleteAddress as deleteAddr,
  fetchUserAddresses,
  setDefaultAddress,
} from "@/lib/supabase-service"
import { Address } from "@/types/database.types"
import React, { useEffect, useState } from "react"
import { Alert, RefreshControl, ScrollView, Text, View } from "react-native"

export default function AddressesScreen() {
  const { user } = useAuth()
  const [addresses, setAddresses] = useState<Address[]>([])
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [modalVisible, setModalVisible] = useState(false)
  const [editingAddress, setEditingAddress] = useState<Address | null>(null)

  useEffect(() => {
    fetchAddresses()
  }, [user])

  const fetchAddresses = async () => {
    if (!user) return

    try {
      const data = await fetchUserAddresses(user.id)
      setAddresses(data)
    } catch (error) {
      console.error("Error fetching addresses:", error)
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }

  const onRefresh = () => {
    setRefreshing(true)
    fetchAddresses()
  }

  const handleAddAddress = () => {
    setEditingAddress(null)
    setModalVisible(true)
  }

  const handleEditAddress = (address: Address) => {
    setEditingAddress(address)
    setModalVisible(true)
  }

  const handleDeleteAddress = async (addressId: string) => {
    try {
      await deleteAddr(addressId)
      Alert.alert("Success", "Address deleted successfully")
      fetchAddresses()
    } catch (error) {
      console.error("Error deleting address:", error)
      Alert.alert("Error", "Failed to delete address")
    }
  }

  const handleSetDefault = async (addressId: string) => {
    if (!user) return

    try {
      await setDefaultAddress(user.id, addressId)
      fetchAddresses()
    } catch (error) {
      console.error("Error setting default:", error)
      Alert.alert("Error", "Failed to set default address")
    }
  }

  return (
    <View className="flex-1 bg-neutral-lightCream">
      <ScrollView
        className="flex-1 px-4 pt-4"
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={COLORS.primary.navy}
          />
        }
      >
        {addresses.length === 0 && !loading ? (
          <View className="items-center py-20">
            <View className="w-24 h-24 rounded-full bg-secondary-skyBlue/20 items-center justify-center mb-6">
              <Text className="text-5xl">📍</Text>
            </View>
            <Text className="font-sofia-bold text-xl text-primary-navy mb-3">
              No Addresses Yet
            </Text>
            <Text className="font-comfortaa text-sm text-neutral-gray text-center px-8 leading-5">
              Add your delivery address to get started with orders
            </Text>
          </View>
        ) : (
          addresses.map((address) => (
            <AddressCard
              key={address.id}
              address={address}
              onEdit={() => handleEditAddress(address)}
              onDelete={() => handleDeleteAddress(address.id)}
              onSetDefault={() => handleSetDefault(address.id)}
            />
          ))
        )}

        {/* Add New Address Button */}
        <View className="mb-8">
          <Button
            title="Add New Address"
            onPress={handleAddAddress}
            variant="navy"
            size="medium"
          />
        </View>
      </ScrollView>

      {/* Add/Edit Address Modal */}
      <AddEditAddressModal
        visible={modalVisible}
        onClose={() => {
          setModalVisible(false)
          setEditingAddress(null)
        }}
        address={editingAddress}
        onSuccess={fetchAddresses}
      />
    </View>
  )
}
