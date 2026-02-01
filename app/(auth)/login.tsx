
import { Phone } from 'lucide-react-native';
import React, { useEffect, useRef, useState } from "react";
import {
    Alert,
    KeyboardAvoidingView,
    Platform,
    ScrollView,
    StatusBar,
    Text,
    TextInput,
    TouchableOpacity,
    View,
} from "react-native";
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAuth } from "../../hooks/useAuth";

export default function LoginScreen() {
  const [phoneNumber, setPhoneNumber] = useState("");
  const [otp, setOtp] = useState("");
  const [otpSent, setOtpSent] = useState(false);
  const [loading, setLoading] = useState(false);
  
  const { login, sendOTP } = useAuth();

  // Create refs for OTP inputs
  const otpRefs = useRef<Array<TextInput | null>>([]);

  // Focus first OTP input when OTP screen is shown
  useEffect(() => {
    if (otpSent && otpRefs.current[0]) {
      setTimeout(() => otpRefs.current[0]?.focus(), 100);
    }
  }, [otpSent]);

  const handleSendOTP = async () => {
    if (phoneNumber.length !== 10) {
      Alert.alert("Invalid Phone", "Please enter a valid 10-digit phone number");
      return;
    }

    setLoading(true);
    try {
      const fullPhone = `+91${phoneNumber}`;
      const success = await sendOTP(fullPhone);
      
      if (success) {
        setOtpSent(true);
        setOtp(""); // Clear OTP when sending new one
        Alert.alert("OTP Sent", "Please check your phone for the verification code");
      } else {
        Alert.alert("Error", "Failed to send OTP. Please try again.");
      }
    } catch (error) {
      console.error("OTP Error:", error);
      Alert.alert("Error", "An error occurred. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyOTP = async () => {
    if (otp.length !== 6) {
      Alert.alert("Invalid OTP", "Please enter the 6-digit OTP");
      return;
    }

    setLoading(true);
    try {
      const fullPhone = `+91${phoneNumber}`;
      console.log(otp)
      const success = await login(fullPhone, otp);
      
      if (!success) {
        Alert.alert("Invalid OTP", "The OTP you entered is incorrect. Please try again.");
      }
      // If successful, the AuthContext will handle the redirect
    } catch (error) {
      console.error("Verification Error:", error);
      Alert.alert("Error", "Failed to verify OTP. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleResendOTP = async () => {
    setOtp("");
    await handleSendOTP();
  };

  // Handle OTP input with auto-focus
  const handleOTPChange = (value: string, index: number) => {
    if (value.length > 1) return; // Prevent multiple digits
    
    const newOtp = otp.split("");
    newOtp[index] = value;
    const updatedOtp = newOtp.join("");
    setOtp(updatedOtp);

    // Auto-focus next input
    if (value && index < 5) {
      otpRefs.current[index + 1]?.focus();
    }
  };

  // Handle backspace for better UX
  const handleOTPKeyPress = (key: string, index: number) => {
    if (key === 'Backspace' && !otp[index] && index > 0) {
      otpRefs.current[index - 1]?.focus();
    }
  };

  return (
    <SafeAreaView className="flex-1 bg-neutral-lightCream" edges={['top', 'bottom']}>
      <StatusBar barStyle="dark-content" backgroundColor="#F5F5F0" />

      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        className="flex-1"
      >
        <ScrollView
          contentContainerStyle={{ flexGrow: 1 }}
          keyboardShouldPersistTaps="handled"
          className="flex-1"
          showsVerticalScrollIndicator={false}
        >
          <View className="flex-1 justify-center px-6 py-8">
            {/* Logo Section */}
            <View className="items-center mb-12">
              <View className="w-20 h-20 rounded-2xl bg-primary-orange items-center justify-center mb-6 shadow-md">
                <Text className="text-5xl">🥛</Text>
              </View>
              <Text className="font-sofia-bold text-4xl text-primary-navy mb-2 tracking-wider">
                Worli Dairy
              </Text>
              <Text className="font-comfortaa text-sm text-neutral-gray tracking-widest uppercase">
                Premium Fresh Milk
              </Text>
            </View>

            {/* Login Form Card */}
            <View className="bg-white rounded-2xl p-8 shadow-lg mb-6">
              <Text className="font-sofia-bold text-2xl text-primary-navy mb-2">
                {otpSent ? "Verify OTP" : "Welcome Back"}
              </Text>
              <Text className="font-comfortaa text-sm text-neutral-gray mb-8">
                {otpSent
                  ? `Enter the code sent to +91${phoneNumber}`
                  : "Sign in to continue your subscription"}
              </Text>

              {otpSent && (
                <TouchableOpacity
                  onPress={() => setOtpSent(false)}
                  className="self-start mb-6 active:opacity-70"
                >
                  <Text className="font-comfortaa text-sm text-primary-orange font-semibold">
                    ← Change Phone Number
                  </Text>
                </TouchableOpacity>
              )}

            {!otpSent ? (
              <>
                {/* Phone Number Input */}
                <Text className="font-comfortaa text-xs font-semibold text-primary-navy mb-3 uppercase tracking-wide">
                  Phone Number
                </Text>
                <View className="flex-row items-center bg-white border-2 border-neutral-lightGray rounded-xl px-4 py-4 mb-6">
                  <View className="mr-3">
                    <Phone size={20} color="#101B53" />
                  </View>
                  <Text className="font-comfortaa text-base text-neutral-darkGray font-medium mr-2">
                    +91
                  </Text>
                  <TextInput
                    className="flex-1 font-comfortaa text-base text-neutral-nearBlack"
                    placeholder="98765 43210"
                    placeholderTextColor="#B3B3B3"
                    keyboardType="phone-pad"
                    maxLength={10}
                    value={phoneNumber}
                    onChangeText={setPhoneNumber}
                    editable={!loading}
                  />
                </View>

                {/* Send OTP Button */}
                <TouchableOpacity
                  className={`rounded-xl py-4 items-center shadow-md ${
                    loading || phoneNumber.length !== 10
                      ? 'bg-neutral-gray opacity-50'
                      : 'bg-primary-orange active:opacity-90'
                  }`}
                  onPress={handleSendOTP}
                  disabled={loading || phoneNumber.length !== 10}
                >
                  <Text className="font-sofia-bold text-base text-white">
                    {loading ? "Sending..." : "Send OTP"}
                  </Text>
                </TouchableOpacity>
              </>
            ) : (
              <>
                {/* OTP Input */}
                <Text className="font-comfortaa text-xs font-semibold text-primary-navy mb-4 uppercase tracking-wide">
                  Enter OTP
                </Text>
                <View className="flex-row justify-between mb-6">
                  {[0, 1, 2, 3, 4, 5].map((index) => (
                    <TextInput
                      key={index}
                      ref={(ref) => (otpRefs.current[index] = ref)}
                      className="w-12 h-14 bg-neutral-lightCream border-2 border-neutral-lightGray rounded-xl text-center font-sofia-bold text-xl text-primary-navy"
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
                <TouchableOpacity
                  className={`rounded-xl py-4 items-center shadow-md mb-4 ${
                    loading || otp.length !== 6
                      ? 'bg-neutral-gray opacity-50'
                      : 'bg-primary-orange active:opacity-90'
                  }`}
                  onPress={handleVerifyOTP}
                  disabled={loading || otp.length !== 6}
                >
                  <Text className="font-sofia-bold text-base text-white">
                    {loading ? "Verifying..." : "Verify OTP"}
                  </Text>
                </TouchableOpacity>

                {/* Resend OTP */}
                <TouchableOpacity
                  onPress={handleResendOTP}
                  disabled={loading}
                  className="py-2 active:opacity-70"
                >
                  <Text className="font-comfortaa text-sm text-primary-navy text-center font-medium">
                    Didn't receive code? <Text className="text-primary-orange font-semibold">Resend</Text>
                  </Text>
                </TouchableOpacity>
              </>
            )}
          </View>

            {/* Demo Info */}
            <View className="bg-secondary-gold bg-opacity-10 border border-secondary-gold rounded-xl p-4">
              <Text className="font-comfortaa text-xs text-neutral-darkGray text-center mb-2 font-semibold uppercase tracking-wide">
                Demo Mode
              </Text>
              <Text className="font-comfortaa text-xs text-neutral-gray text-center leading-5">
                Use any 10-digit number{"\n"}OTP will be sent to your phone
              </Text>
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}