import Button from "@/components/ui/Button"
import TextInput from "@/components/ui/TextInput"
import { COLORS } from "@/constants/theme"
import { useAuth } from "@/hooks/useAuth"
import { useRouter } from "expo-router"
import { Camera, Mail, Phone, User } from "lucide-react-native"
import React, { useState } from "react"
import { KeyboardAvoidingView, Platform, ScrollView, Text, TouchableOpacity, View } from "react-native"
import Animated, { FadeInUp } from "react-native-reanimated"
import {
  showErrorToast,
  showSuccessToast,
} from "@/components/ui/Toast"

export default function ProfileScreen() {
  const router = useRouter()
  const { user, updateUser } = useAuth()
  const [name, setName] = useState(user?.full_name || "")
  const [email, setEmail] = useState(user?.email || "")
  const [loading, setLoading] = useState(false)

  const initials = (user?.full_name || "U")
    .split(" ")
    .map((w) => w[0])
    .join("")
    .toUpperCase()
    .slice(0, 2)

  const handleSave = async () => {
    if (!name.trim()) {
      showErrorToast("Error", "Name cannot be empty")
      return
    }

    setLoading(true)
    try {
      const success = await updateUser({ full_name: name, email })
      if (success) {
        showSuccessToast("Success", "Profile updated successfully")
        router.back()
      } else {
        showErrorToast("Error", "Failed to update profile")
      }
    } catch (error) {
      showErrorToast("Error", "An error occurred")
    } finally {
      setLoading(false)
    }
  }

  const hasChanges =
    name !== (user?.full_name || "") || email !== (user?.email || "")

  return (
    <View className="flex-1 bg-neutral-lightCream">
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        className="flex-1"
      >
        <ScrollView
          className="flex-1"
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{ paddingBottom: 40 }}
          keyboardShouldPersistTaps="handled"
        >
          {/* Avatar Section */}
          <Animated.View
            entering={FadeInUp.duration(400).springify().damping(18)}
            className="items-center pt-6 pb-2"
          >
            <View className="relative">
              <View
                className="w-24 h-24 rounded-full items-center justify-center"
                style={{ backgroundColor: COLORS.primary.navy }}
              >
                <Text className="font-sofia-bold text-3xl text-white">
                  {initials}
                </Text>
              </View>
              <TouchableOpacity
                className="absolute bottom-0 right-0 w-8 h-8 rounded-full bg-white items-center justify-center"
                style={{
                  shadowColor: "#000",
                  shadowOffset: { width: 0, height: 2 },
                  shadowOpacity: 0.1,
                  shadowRadius: 4,
                  elevation: 3,
                }}
                activeOpacity={0.7}
              >
                <Camera size={14} color={COLORS.primary.navy} strokeWidth={2.5} />
              </TouchableOpacity>
            </View>
            <Text className="font-sofia-bold text-lg text-primary-navy mt-3">
              {user?.full_name || "User"}
            </Text>
            <Text className="font-comfortaa text-sm text-neutral-gray mt-0.5">
              {user?.phone_number}
            </Text>
          </Animated.View>

          {/* Form */}
          <Animated.View
            entering={FadeInUp.duration(400).delay(100).springify().damping(18)}
            className="mx-5 mt-6"
          >
            <Text className="font-sofia-bold text-xs text-neutral-gray uppercase tracking-wider mb-3 ml-1">
              Personal Information
            </Text>
            <View
              className="bg-white rounded-2xl p-5"
              style={{
                shadowColor: "#000",
                shadowOffset: { width: 0, height: 2 },
                shadowOpacity: 0.05,
                shadowRadius: 8,
                elevation: 2,
              }}
            >
              <TextInput
                label="Full Name"
                value={name}
                onChangeText={setName}
                placeholder="Enter your name"
                containerClassName="mb-4"
                prefix={<User size={18} color={COLORS.neutral.gray} strokeWidth={2} />}
              />

              <TextInput
                label="Phone Number"
                value={user?.phone_number}
                editable={false}
                containerClassName="mb-4"
                prefix={<Phone size={18} color={COLORS.neutral.gray} strokeWidth={2} />}
                className="bg-neutral-lightCream text-neutral-gray"
              />

              <TextInput
                label="Email Address"
                value={email}
                onChangeText={setEmail}
                keyboardType="email-address"
                placeholder="Enter your email (optional)"
                prefix={<Mail size={18} color={COLORS.neutral.gray} strokeWidth={2} />}
              />
            </View>
          </Animated.View>

          {/* Save Button */}
          <Animated.View
            entering={FadeInUp.duration(400).delay(200).springify().damping(18)}
            className="mx-5 mt-8"
          >
            <Button
              title={loading ? "Saving..." : "Save Changes"}
              onPress={handleSave}
              disabled={loading || !hasChanges}
              isLoading={loading}
              variant="navy"
            />
          </Animated.View>
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  )
}
