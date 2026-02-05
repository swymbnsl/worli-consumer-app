import Button from "@/components/ui/Button"
import TextInput from "@/components/ui/TextInput"
import { useAuth } from "@/hooks/useAuth"
import { useRouter } from "expo-router"
import React, { useState } from "react"
import { Alert, ScrollView, Text, View } from "react-native"
import Animated, { FadeInDown, FadeInUp } from "react-native-reanimated"

export default function CompleteProfileScreen() {
  const router = useRouter()
  const { user, updateUser } = useAuth()
  const [fullName, setFullName] = useState("")
  const [email, setEmail] = useState("")
  const [isLoading, setIsLoading] = useState(false)

  const validateEmail = (email: string): boolean => {
    if (!email.trim()) return true // Email is optional
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    return emailRegex.test(email)
  }

  const handleContinue = async () => {
    // Validate full name
    if (!fullName.trim()) {
      Alert.alert("Error", "Please enter your full name")
      return
    }

    if (fullName.trim().length < 2) {
      Alert.alert("Error", "Name must be at least 2 characters long")
      return
    }

    // Validate email if provided
    if (email.trim() && !validateEmail(email)) {
      Alert.alert("Error", "Please enter a valid email address")
      return
    }

    setIsLoading(true)
    try {
      const updates: { full_name: string; email?: string } = {
        full_name: fullName.trim(),
      }

      if (email.trim()) {
        updates.email = email.trim()
      }

      const success = await updateUser(updates)

      if (success) {
        Alert.alert("Success", "Profile completed successfully!", [
          {
            text: "OK",
            onPress: () => router.replace("/(tabs)/home"),
          },
        ])
      } else {
        Alert.alert("Error", "Failed to update profile. Please try again.")
      }
    } catch (error) {
      console.error("Error completing profile:", error)
      Alert.alert("Error", "An error occurred. Please try again.")
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <View className="flex-1 bg-neutral-lightCream">
      <ScrollView
        className="flex-1"
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 40 }}
      >
        {/* Header Section */}
        <Animated.View
          entering={FadeInDown.duration(600).delay(100)}
          className="bg-primary-navy px-6 pt-16 pb-12"
        >
          <View className="items-center mb-6">
            <View className="w-20 h-20 rounded-3xl bg-primary-orange items-center justify-center mb-4 shadow-lg">
              <Text className="text-5xl">👤</Text>
            </View>
          </View>

          <Text className="font-sofia-bold text-3xl text-white text-center mb-3">
            Complete Your Profile
          </Text>
          <Text className="font-comfortaa text-sm text-white/80 text-center">
            Help us personalize your experience
          </Text>
        </Animated.View>

        {/* Form Section */}
        <Animated.View
          entering={FadeInUp.duration(600).delay(200)}
          className="px-6 mt-8"
        >
          <View className="bg-white rounded-2xl p-6 shadow-md mb-6">
            <Text className="font-sofia-bold text-lg text-primary-navy mb-6">
              Basic Information
            </Text>

            <TextInput
              label="Full Name *"
              value={fullName}
              onChangeText={setFullName}
              placeholder="Enter your full name"
              containerClassName="mb-4"
              autoFocus
              autoCapitalize="words"
            />

            <TextInput
              label="Email Address (Optional)"
              value={email}
              onChangeText={setEmail}
              placeholder="Enter your email"
              keyboardType="email-address"
              autoCapitalize="none"
              containerClassName="mb-2"
            />

            <Text className="font-comfortaa text-xs text-neutral-gray mt-2">
              We'll use this to send you order confirmations and updates
            </Text>
          </View>

          {/* Phone Number Info */}
          <View className="bg-primary-cream rounded-2xl p-4 mb-6">
            <Text className="font-sofia-bold text-sm text-primary-navy mb-2">
              📱 Registered Phone Number
            </Text>
            <Text className="font-comfortaa text-base text-primary-navy">
              {user?.phone_number || "Not available"}
            </Text>
          </View>

          {/* Requirements */}
          <View className="bg-white rounded-2xl p-5 shadow-sm mb-8">
            <Text className="font-sofia-bold text-sm text-primary-navy mb-3">
              ℹ️ Requirements
            </Text>
            <View className="space-y-2">
              <Text className="font-comfortaa text-xs text-neutral-gray leading-5">
                • Full name is required (at least 2 characters)
              </Text>
              <Text className="font-comfortaa text-xs text-neutral-gray leading-5">
                • Email is optional but recommended for updates
              </Text>
              <Text className="font-comfortaa text-xs text-neutral-gray leading-5">
                • You can update this information later from your profile
              </Text>
            </View>
          </View>

          {/* Continue Button */}
          <Button
            title={isLoading ? "Saving..." : "Continue"}
            onPress={handleContinue}
            disabled={isLoading}
            isLoading={isLoading}
          />
        </Animated.View>
      </ScrollView>
    </View>
  )
}
