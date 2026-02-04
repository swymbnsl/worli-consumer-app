import { useAuth } from "@/hooks/useAuth"
import * as Clipboard from "expo-clipboard"
import { useRouter } from "expo-router"
import { ChevronLeft, Copy, Gift, Share2, Users } from "lucide-react-native"
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
            Rewards
          </Text>
          <Text className="font-sofia-bold text-2xl text-white">
            Refer & Earn
          </Text>
        </View>
      </View>

      <ScrollView
        className="flex-1 px-6 pt-6"
        showsVerticalScrollIndicator={false}
      >
        {/* Referral Code Card */}
        <View className="bg-primary-navy rounded-2xl p-7 mb-6 relative overflow-hidden">
          {/* Background decorations */}
          <View className="absolute -top-8 -right-8 w-32 h-32 rounded-3xl bg-secondary-gold opacity-15" />
          <View className="absolute -bottom-5 -left-5 w-28 h-28 rounded-3xl bg-primary-cream opacity-10" />

          <View className="w-16 h-16 rounded-2xl bg-primary-orange items-center justify-center mb-5">
            <Gift size={32} color="#FFFFFF" />
          </View>

          <Text className="font-comfortaa text-xs text-primary-cream mb-3 tracking-widest">
            YOUR REFERRAL CODE
          </Text>
          <Text className="font-sofia-bold text-3xl text-white mb-6 tracking-widest">
            {referralCode}
          </Text>

          <View className="flex-row gap-3">
            <TouchableOpacity
              className="flex-1 bg-primary-orange py-3.5 rounded-xl flex-row items-center justify-center active:opacity-90"
              onPress={handleCopyCode}
            >
              <Copy size={18} color="#FFFFFF" />
              <Text className="font-sofia-bold text-sm text-white ml-2">
                Copy
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              className="flex-1 bg-white bg-opacity-15 py-3.5 rounded-xl flex-row items-center justify-center border border-white border-opacity-20 active:opacity-80"
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
