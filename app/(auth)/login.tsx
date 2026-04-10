import Button from "@/components/ui/Button"
import TextInput from "@/components/ui/TextInput"
import { showErrorToast, showInfoToast } from "@/components/ui/Toast"
import { useAuth } from "@/hooks/useAuth"
import { formatPhone } from "@/utils/formatters"
import { router } from "expo-router"
import React, { useEffect, useRef, useState } from "react"
import {
  KeyboardAvoidingView,
  Platform,
  TextInput as RNTextInput,
  ScrollView,
  Text,
  TouchableOpacity,
  View,
} from "react-native"

export default function LoginScreen() {
  const [phoneNumber, setPhoneNumber] = useState("")
  const [otp, setOtp] = useState("")
  const [otpSent, setOtpSent] = useState(false)
  const [loading, setLoading] = useState(false)
  const [resendTimer, setResendTimer] = useState(0)

  const { login, sendOTP, isLoggedIn } = useAuth()

  // Create refs for OTP inputs
  const otpRefs = useRef<Array<RNTextInput | null>>([])

  // Redirect to home if already logged in
  useEffect(() => {
    if (isLoggedIn) {
      router.replace("/(tabs)/home")
    }
  }, [isLoggedIn])

  // Focus first OTP input when OTP screen is shown
  useEffect(() => {
    if (otpSent && otpRefs.current[0]) {
      setTimeout(() => otpRefs.current[0]?.focus(), 100)
    }
  }, [otpSent])

  // Timer countdown logic
  useEffect(() => {
    let interval: ReturnType<typeof setInterval>
    if (resendTimer > 0) {
      interval = setInterval(() => {
        setResendTimer((prev) => prev - 1)
      }, 1000)
    }
    return () => {
      if (interval) clearInterval(interval)
    }
  }, [resendTimer])

  const handleSendOTP = async () => {
    if (phoneNumber.length !== 10) {
      showErrorToast(
        "Invalid Phone",
        "Please enter a valid 10-digit phone number",
      )
      return
    }

    setLoading(true)
    try {
      const fullPhone = `+91${phoneNumber}`
      const success = await sendOTP(fullPhone)

      if (success) {
        setOtpSent(true)
        setOtp("") // Clear OTP when sending new one
        setResendTimer(30) // Start 30 second countdown
        showInfoToast(
          "OTP Sent",
          "Please check your phone for the verification code",
        )
      } else {
        showErrorToast("Error", "Failed to send OTP. Please try again.")
      }
    } catch (error) {
      console.error("OTP Error:", error)
      showErrorToast("Error", "An error occurred. Please try again.")
    } finally {
      setLoading(false)
    }
  }

  const handleVerifyOTP = async () => {
    if (otp.length !== 6) {
      showErrorToast("Invalid OTP", "Please enter the 6-digit OTP")
      return
    }

    setLoading(true)
    try {
      const fullPhone = `+91${phoneNumber}`
      console.log(otp)
      const success = await login(fullPhone, otp)

      if (success) {
        // Navigation will be handled by the useEffect watching isLoggedIn
        router.replace("/(tabs)/home")
      } else {
        showErrorToast(
          "Invalid OTP",
          "The OTP you entered is incorrect. Please try again.",
        )
      }
    } catch (error) {
      console.error("Verification Error:", error)
      showErrorToast("Error", "Failed to verify OTP. Please try again.")
    } finally {
      setLoading(false)
    }
  }

  const handleResendOTP = async () => {
    if (resendTimer > 0) return
    setOtp("")
    await handleSendOTP()
  }

  // Handle OTP input with auto-focus
  const handleOTPChange = (value: string, index: number) => {
    if (value.length > 1) return // Prevent multiple digits

    const newOtp = otp.split("")
    newOtp[index] = value
    const updatedOtp = newOtp.join("")
    setOtp(updatedOtp)

    // Auto-focus next input
    if (value && index < 5) {
      otpRefs.current[index + 1]?.focus()
    }
  }

  // Handle backspace for better UX
  const handleOTPKeyPress = (key: string, index: number) => {
    if (key === "Backspace" && !otp[index] && index > 0) {
      otpRefs.current[index - 1]?.focus()
    }
  }

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === "ios" ? "padding" : "height"}
      // className="justify-center"
      style={{ flex: 1 }}
    >
      <ScrollView
        contentContainerStyle={{ flexGrow: 1, paddingBottom: 40 }}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <View className="flex-1 justify-center px-6 pt-12 pb-8">
          {/* Logo Section */}
          <View className="items-center mb-12">
            <Text className="font-sofia-bold text-4xl text-primary-navy mb-2 tracking-wider">
              Worli Dairy
            </Text>
            <Text className="font-comfortaa text-sm text-neutral-gray tracking-widest uppercase">
              Farm Fresh Desi Milk
            </Text>
          </View>

          {/* Login Form Card */}
          <View className="bg-white rounded-2xl p-8 shadow-lg mb-6">
            <Text className="font-sofia-bold text-2xl text-primary-navy mb-2">
              {otpSent ? "Verify OTP" : "Welcome Back"}
            </Text>
            {otpSent && (
              <Text className="font-comfortaa text-sm text-neutral-gray mb-8">
                Enter the code sent to {formatPhone(phoneNumber)}
              </Text>
            )}

            {otpSent && (
              <TouchableOpacity
                onPress={() => {
                  setOtpSent(false)
                  setResendTimer(0)
                }}
                className="self-start mb-6 active:opacity-70"
              >
                <Text className="font-comfortaa text-sm text-primary-navy font-semibold">
                  ← Change Phone Number
                </Text>
              </TouchableOpacity>
            )}

            {!otpSent ? (
              <>
                {/* Phone Number Input */}
                <TextInput
                  label="Phone Number"
                  prefix="+91"
                  placeholder="98765 43210"
                  keyboardType="phone-pad"
                  maxLength={10}
                  value={phoneNumber}
                  onChangeText={setPhoneNumber}
                  editable={!loading}
                  containerClassName="mb-6"
                />

                {/* Send OTP Button */}
                <Button
                  title={loading ? "Sending..." : "Send OTP"}
                  onPress={handleSendOTP}
                  disabled={loading || phoneNumber.length !== 10}
                  isLoading={loading}
                  variant="navy"
                />
              </>
            ) : (
              <>
                {/* OTP Input */}
                <Text className="font-comfortaa text-xs font-semibold text-primary-navy mb-4 uppercase tracking-wide">
                  Enter OTP
                </Text>
                <View className="flex-row justify-between mb-4 gap-1">
                  {[0, 1, 2, 3, 4, 5].map((index) => (
                    <RNTextInput
                      key={index}
                      ref={(ref) => {
                        otpRefs.current[index] = ref
                      }}
                      className="flex-1 h-14 bg-neutral-lightCream border-2 border-neutral-lightGray rounded-xl text-center font-sofia-bold text-xl text-primary-navy"
                      style={{ maxWidth: 56 }}
                      keyboardType="number-pad"
                      maxLength={1}
                      value={otp[index] || ""}
                      onChangeText={(value) => handleOTPChange(value, index)}
                      onKeyPress={({ nativeEvent }) =>
                         handleOTPKeyPress(nativeEvent.key, index)
                      }
                      editable={!loading}
                    />
                  ))}
                </View>

                {/* Verify Button */}
                <Button
                  title={loading ? "Verifying..." : "Verify OTP"}
                  onPress={handleVerifyOTP}
                  disabled={loading || otp.length !== 6}
                  isLoading={loading}
                  variant="navy"
                  className="mb-4"
                />

                {/* Resend OTP */}
                <TouchableOpacity
                  onPress={handleResendOTP}
                  disabled={loading || resendTimer > 0}
                  className={`py-2 active:opacity-70 ${
                    resendTimer > 0 ? "opacity-50" : ""
                  }`}
                >
                  <Text className="font-comfortaa text-sm text-primary-navy text-center font-medium">
                    Didn't receive code?{" "}
                    {resendTimer > 0 ? (
                      <Text className="text-primary-navy font-semibold">
                        Resend in {resendTimer}s
                      </Text>
                    ) : (
                      <Text className="text-primary-navy font-semibold underline">
                        Resend
                      </Text>
                    )}
                  </Text>
                </TouchableOpacity>
              </>
            )}
          </View>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  )
}
