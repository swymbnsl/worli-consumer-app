import { useAuth } from "@/hooks/useAuth"
import * as Clipboard from "expo-clipboard"
import { Stack, useRouter } from "expo-router"
import { Copy, Gift, Share2, Users } from "lucide-react-native"
import React from "react"
import {
    Alert,
    ScrollView,
    Share,
    Text,
    TouchableOpacity,
    View,
} from "react-native"

export default function ReferScreen() {
  const router = useRouter()
  const { user } = useAuth()
  const referralCode = user?.id.slice(0, 8).toUpperCase() || "FRESH123"

  const handleCopyCode = async () => {
    await Clipboard.setStringAsync(referralCode)
    Alert.alert("Copied!", "Referral code copied to clipboard")
  }

  const handleShare = async () => {
    try {
      await Share.share({
        message: `Join FreshMilk using my referral code ${referralCode} and get ₹100 off on your first order! Download the app now.`,
      })
    } catch (error) {
      console.error("Share error:", error)
    }
  }

  return (
    <View className="flex-1 bg-neutral-lightCream">
      <Stack.Screen options={{ title: "Refer & Earn" }} />

      <ScrollView
        className="flex-1 px-6 pt-6"
        showsVerticalScrollIndicator={false}
      >
        {/* Referral Code Card */}
        <View className="bg-primary-navy rounded-2xl p-7 mb-6 relative overflow-hidden shadow-lg">
          {/* Background decorations */}
          <View className="absolute -top-10 -right-10 w-36 h-36 rounded-full bg-primary-cream opacity-10" />
          <View className="absolute -bottom-8 -left-8 w-28 h-28 rounded-full bg-secondary-skyBlue opacity-20" />

          <View className="w-16 h-16 rounded-2xl bg-white items-center justify-center mb-5 shadow-sm">
            <Gift size={32} color="#101B53" />
          </View>

          <Text className="font-comfortaa text-xs text-primary-cream mb-3 tracking-widest opacity-90">
            YOUR REFERRAL CODE
          </Text>
          <Text className="font-sofia-bold text-4xl text-primary-cream mb-8 tracking-wider">
            {referralCode}
          </Text>

          <View className="flex-row gap-3">
            <TouchableOpacity
              className="flex-1 bg-primary-orange py-4 rounded-xl flex-row items-center justify-center active:opacity-90 shadow-sm"
              onPress={handleCopyCode}
            >
              <Copy size={18} color="#FFFFFF" />
              <Text className="font-sofia-bold text-sm text-white ml-2">
                Copy Code
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              className="flex-1 bg-white/10 py-4 rounded-xl flex-row items-center justify-center border border-white/20 active:opacity-80"
              onPress={handleShare}
            >
              <Share2 size={18} color="#FFFFFF" />
              <Text className="font-sofia-bold text-sm text-white ml-2">
                Share
              </Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* How it Works */}
        <View className="bg-white rounded-2xl p-6 mb-6 shadow-md">
          <Text className="font-sofia-bold text-lg text-primary-navy mb-5">
            How it Works
          </Text>

          {[
            {
              step: "1",
              text: "Share your unique referral code with friends and family",
            },
            {
              step: "2",
              text: "They sign up and place their first order using your code",
            },
            { step: "3", text: "You both get ₹100 credited to your wallets!" },
          ].map((item, index) => (
            <View key={index} className={`flex-row ${index < 2 ? "mb-5" : ""}`}>
              <View className="w-8 h-8 rounded-full bg-primary-orange items-center justify-center mr-4">
                <Text className="font-sofia-bold text-base text-white">
                  {item.step}
                </Text>
              </View>
              <Text className="flex-1 font-comfortaa text-sm text-neutral-darkGray leading-5 pt-1.5">
                {item.text}
              </Text>
            </View>
          ))}
        </View>

        {/* Stats Card */}
        <View className="bg-white rounded-2xl p-6 mb-8 shadow-md">
          <View className="flex-row items-center mb-4">
            <View className="w-11 h-11 rounded-xl bg-secondary-sage bg-opacity-10 items-center justify-center mr-3">
              <Users size={22} color="#638C5F" />
            </View>
            <Text className="font-sofia-bold text-lg text-primary-navy">
              Your Referrals
            </Text>
          </View>
          <View className="flex-row justify-around pt-3">
            <View className="items-center">
              <Text className="font-sofia-bold text-3xl text-primary-orange mb-1">
                0
              </Text>
              <Text className="font-comfortaa text-xs text-neutral-gray">
                Total Referrals
              </Text>
            </View>
            <View className="w-px bg-neutral-lightGray" />
            <View className="items-center">
              <Text className="font-sofia-bold text-3xl text-secondary-sage mb-1">
                ₹0
              </Text>
              <Text className="font-comfortaa text-xs text-neutral-gray">
                Total Earned
              </Text>
            </View>
          </View>
        </View>
      </ScrollView>
    </View>
  )
}
