import AddEditAddressModal from "@/components/addresses/AddEditAddressModal"
import AddressCard from "@/components/addresses/AddressCard"
import { useAuth } from "@/hooks/useAuth"
import { supabase } from "@/lib/supabase"
import { Address } from "@/types/database.types"
import { useRouter } from "expo-router"
import { ChevronLeft, Plus } from "lucide-react-native"
import React, { useEffect, useState } from "react"
import {
  Alert,
  RefreshControl,
  ScrollView,
  StatusBar,
  Text,
  TouchableOpacity,
  View,
} from "react-native"
import { SafeAreaView } from "react-native-safe-area-context"

export default function AddressesScreen() {
  const router = useRouter()
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
      const { data, error } = await supabase
        .from("addresses")
        .select("*")
        .eq("user_id", user.id)
        .order("is_default", { ascending: false })

      if (error) throw error
      setAddresses(data || [])
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
    Alert.alert(
      "Delete Address",
      "Are you sure you want to delete this address?",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: async () => {
            try {
              const { error } = await supabase
                .from("addresses")
                .delete()
                .eq("id", addressId)

              if (error) throw error

              Alert.alert("Success", "Address deleted successfully")
              fetchAddresses()
            } catch (error) {
              console.error("Error deleting address:", error)
              Alert.alert("Error", "Failed to delete address")
            }
          },
        },
      ],
    )
  }

  const handleSetDefault = async (addressId: string) => {
    if (!user) return

    try {
      // First, set all addresses to non-default
      await supabase
        .from("addresses")
        .update({ is_default: false })
        .eq("user_id", user.id)

      // Then set the selected address as default
      const { error } = await supabase
        .from("addresses")
        .update({ is_default: true })
        .eq("id", addressId)

      if (error) throw error

      fetchAddresses()
    } catch (error) {
      console.error("Error setting default:", error)
      Alert.alert("Error", "Failed to set default address")
    }
  }

  return (
    <SafeAreaView
      className="flex-1 bg-neutral-lightCream"
      edges={["top", "bottom"]}
    >
      <StatusBar barStyle="dark-content" backgroundColor="#F5F5F0" />

      {/* Header */}
      <View className="bg-primary-navy px-6 pt-10 pb-6 flex-row items-center">
        <TouchableOpacity
          onPress={() => router.back()}
          className="mr-4 active:opacity-70"
        >
          <ChevronLeft size={24} color="#FFFFFF" />
        </TouchableOpacity>
        <View>
          <Text className="font-comfortaa text-xs text-primary-cream uppercase tracking-widest mb-1">
            Locations
          </Text>
          <Text className="font-sofia-bold text-2xl text-white">Addresses</Text>
        </View>
      </View>

      <ScrollView
        className="flex-1 px-6 pt-6"
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor="#101B53"
          />
        }
      >
        {addresses.length === 0 && !loading ? (
          <View className="items-center py-16">
            <Text className="text-5xl mb-4">📍</Text>
            <Text className="font-sofia-bold text-lg text-primary-navy mb-2">
              No Addresses Added
            </Text>
            <Text className="font-comfortaa text-sm text-neutral-gray text-center">
              Add a delivery address to get started
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
        <TouchableOpacity
          className="bg-primary-orange rounded-xl p-6 items-center mb-8 flex-row justify-center shadow-md active:opacity-90"
          onPress={handleAddAddress}
        >
          <Plus size={24} color="#FFFFFF" />
          <Text className="font-sofia-bold text-base text-white ml-2">
            Add New Address
          </Text>
        </TouchableOpacity>
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
    </SafeAreaView>
  )
}
