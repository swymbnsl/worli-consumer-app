import Button from "@/components/ui/Button"
import PageHeader from "@/components/ui/PageHeader"
import TextInput from "@/components/ui/TextInput"
import { useAuth } from "@/hooks/useAuth"
import { useRouter } from "expo-router"
import React, { useState } from "react"
import { Alert, ScrollView, View } from "react-native"

export default function ProfileScreen() {
  const router = useRouter()
  const { user, updateUser } = useAuth()
  const [name, setName] = useState(user?.full_name || "")
  const [email, setEmail] = useState(user?.email || "")
  const [loading, setLoading] = useState(false)

  const handleSave = async () => {
    if (!name.trim()) {
      Alert.alert("Error", "Name cannot be empty")
      return
    }

    setLoading(true)
    try {
      const success = await updateUser({ full_name: name, email })
      if (success) {
        Alert.alert("Success", "Profile updated successfully")
        router.back()
      } else {
        Alert.alert("Error", "Failed to update profile")
      }
    } catch (error) {
      Alert.alert("Error", "An error occurred")
    } finally {
      setLoading(false)
    }
  }

  return (
    <View className="flex-1 bg-neutral-lightCream">
      {/* Header */}
      <PageHeader
        title="Edit Profile"
        subtitle="Settings"
        showBackButton={true}
        onBackPress={() => router.back()}
      />

      <ScrollView
        className="flex-1 px-6 pt-6"
        showsVerticalScrollIndicator={false}
      >
        <View className="bg-white rounded-2xl p-7 mb-8 shadow-md">
          <TextInput
            label="Full Name"
            value={name}
            onChangeText={setName}
            placeholder="Enter your name"
            containerClassName="mb-2"
          />

          <TextInput
            label="Phone Number"
            value={user?.phone_number}
            editable={false}
            className="bg-neutral-lightGray text-neutral-gray"
            containerClassName="mb-2"
          />

          <TextInput
            label="Email Address"
            value={email}
            onChangeText={setEmail}
            keyboardType="email-address"
            placeholder="Enter your email"
            containerClassName="mb-4"
          />

          <Button
            title={loading ? "Saving..." : "Save Changes"}
            onPress={handleSave}
            disabled={loading}
            isLoading={loading}
            variant="primary"
          />
        </View>
      </ScrollView>
    </View>
  )
}
