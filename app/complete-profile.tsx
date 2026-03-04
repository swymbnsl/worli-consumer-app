import Button from "@/components/ui/Button"
import TextInput from "@/components/ui/TextInput"
import { showErrorToast, showSuccessToast } from "@/components/ui/Toast"
import { COLORS } from "@/constants/theme"
import { useAuth } from "@/hooks/useAuth"
import { applyReferralCode, checkReferralCode } from "@/lib/supabase-service"
import { useRouter } from "expo-router"
import { CheckCircle, XCircle } from "lucide-react-native"
import React, { useState } from "react"
import { ActivityIndicator, ScrollView, Text, View } from "react-native"
import Animated, { FadeInDown, FadeInUp } from "react-native-reanimated"

export default function CompleteProfileScreen() {
  const router = useRouter()
  const { user, updateUser } = useAuth()
  const [fullName, setFullName] = useState("")
  const [email, setEmail] = useState("")
  const [referralCode, setReferralCode] = useState("")
  const [referralStatus, setReferralStatus] = useState<
    "idle" | "checking" | "valid" | "invalid"
  >("idle")
  const [referralError, setReferralError] = useState("")
  const [isLoading, setIsLoading] = useState(false)

  const handleReferralCodeChange = (text: string) => {
    setReferralCode(text.toUpperCase())
    // Reset verification whenever the text changes
    if (referralStatus !== "idle") {
      setReferralStatus("idle")
      setReferralError("")
    }
  }

  const handleVerifyReferralCode = async () => {
    if (!referralCode.trim()) return
    setReferralStatus("checking")
    setReferralError("")
    try {
      const result = await checkReferralCode(referralCode.trim())
      if (result.valid) {
        setReferralStatus("valid")
      } else {
        setReferralStatus("invalid")
        setReferralError(result.error ?? "Invalid referral code.")
      }
    } catch (e) {
      console.error("Referral check error:", e)
      setReferralStatus("invalid")
      setReferralError("Could not verify code. Please try again.")
    }
  }

  const validateEmail = (email: string): boolean => {
    if (!email.trim()) return true // Email is optional
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    return emailRegex.test(email)
  }

  const handleContinue = async () => {
    // Validate full name
    if (!fullName.trim()) {
      showErrorToast("Error", "Please enter your full name")
      return
    }

    if (fullName.trim().length < 2) {
      showErrorToast("Error", "Name must be at least 2 characters long")
      return
    }

    // Validate email if provided
    if (email.trim() && !validateEmail(email)) {
      showErrorToast("Error", "Please enter a valid email address")
      return
    }

    // Block submission if a code was entered but not verified
    if (referralCode.trim() && referralStatus !== "valid") {
      showErrorToast(
        "Verify Referral Code",
        "Please verify your referral code before continuing, or clear it to skip.",
      )
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

      if (!success) {
        showErrorToast("Error", "Failed to update profile. Please try again.")
        return
      }

      // Apply referral code if provided (non-blocking: profile is already saved)
      if (referralCode.trim()) {
        try {
          const result = await applyReferralCode(referralCode.trim())
          if (result.success) {
            showSuccessToast(
              "Referral Applied! 🎉",
              `You’ll both earn ₹${result.reward_amount} when your first order is delivered.`,
            )
          } else {
            // Non-fatal: show the reason but still continue to home
            showErrorToast("Referral Code", result.error)
          }
        } catch (referralError) {
          console.error("Referral code error:", referralError)
          // Don't block navigation — profile was saved successfully
        }
      }

      showSuccessToast("Profile Completed", "Welcome aboard!")
      router.replace("/(tabs)/home")
    } catch (error) {
      console.error("Error completing profile:", error)
      showErrorToast("Error", "An error occurred. Please try again.")
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
            <View className="w-20 h-20 rounded-full bg-white items-center justify-center mb-4 shadow-lg">
              <Text className="text-4xl">👤</Text>
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
              containerClassName="mb-4"
            />

            <TextInput
              label="Referral Code (Optional)"
              value={referralCode}
              onChangeText={handleReferralCodeChange}
              placeholder="e.g. RAHUL423"
              autoCapitalize="characters"
              autoCorrect={false}
              containerClassName="mb-3"
              editable={referralStatus !== "valid" && referralStatus !== "checking"}
            />

            {/* Status message */}
            {referralStatus === "valid" ? (
              <View className="flex-row items-center gap-2 bg-primary-navy/5 border border-primary-navy/15 rounded-xl px-4 py-3 mb-3">
                <CheckCircle size={15} color={COLORS.primary.navy} />
                <Text className="font-comfortaa text-xs text-primary-navy flex-1 leading-4">
                  Valid code! You'll both earn wallet credits after your first delivery.
                </Text>
              </View>
            ) : referralStatus === "invalid" ? (
              <View className="flex-row items-center gap-2 mb-3">
                <XCircle size={15} color={COLORS.functional.error} />
                <Text className="font-comfortaa text-xs text-functional-error flex-1 leading-4">
                  {referralError}
                </Text>
              </View>
            ) : referralStatus === "checking" ? (
              <View className="flex-row items-center gap-2 mb-3">
                <ActivityIndicator size="small" color={COLORS.primary.navy} />
                <Text className="font-comfortaa text-xs text-neutral-gray">
                  Verifying code...
                </Text>
              </View>
            ) : (
              <Text className="font-comfortaa text-xs text-neutral-gray mb-3">
                Enter a friend's code to earn rewards on your first delivery.
              </Text>
            )}

            {/* Verify button — always visible; greyed when empty or already valid */}
            {referralStatus !== "valid" && (
              <Button
                title="Verify Code"
                onPress={handleVerifyReferralCode}
                variant="outline"
                size="medium"
                isLoading={referralStatus === "checking"}
                disabled={referralCode.trim() === "" || referralStatus === "checking"}
              />
            )}
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
                • Email is optional but recommended for order updates
              </Text>
              <Text className="font-comfortaa text-xs text-neutral-gray leading-5">
                • Referral code is optional — both you and your friend earn
                wallet credits on your first delivery
              </Text>
              <Text className="font-comfortaa text-xs text-neutral-gray leading-5">
                • You can update your name and email later from your profile
              </Text>
            </View>
          </View>

          {/* Continue Button */}
          <Button
            title={isLoading ? "Saving..." : "Continue"}
            onPress={handleContinue}
            disabled={isLoading}
            isLoading={isLoading}
            variant="navy"
          />
        </Animated.View>
      </ScrollView>
    </View>
  )
}
