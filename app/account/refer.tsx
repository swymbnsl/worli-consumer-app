import Button from "@/components/ui/Button"
import TextInput from "@/components/ui/TextInput"
import { showErrorToast, showSuccessToast } from "@/components/ui/Toast"
import { COLORS } from "@/constants/theme"
import { useAuth } from "@/hooks/useAuth"
import {
  applyReferralCode,
  getReferralStats,
  ReferralDetail,
  ReferralStats,
} from "@/lib/supabase-service"
import * as Clipboard from "expo-clipboard"
import { useFocusEffect } from "expo-router"
import {
  CheckCircle,
  Clock,
  Copy,
  Gift,
  Share2,
  Tag,
  User,
  Users,
} from "lucide-react-native"
import React, { useCallback, useState } from "react"
import {
  ActivityIndicator,
  ScrollView,
  Share,
  Text,
  TouchableOpacity,
  View,
} from "react-native"
import Animated, { FadeInDown, FadeInUp } from "react-native-reanimated"

export default function ReferScreen() {
  const { user, updateUser } = useAuth()

  // ── Referral code (from DB, with fallback while trigger hasn't run yet) ──
  const referralCode = user?.referral_code ?? "..."

  // ── Stats ────────────────────────────────────────────────────────────────
  const [stats, setStats] = useState<ReferralStats>({
    totalReferrals: 0,
    successfulReferrals: 0,
    pendingReferrals: 0,
    totalEarned: 0,
    referrals: [],
  })
  const [statsLoading, setStatsLoading] = useState(true)

  const loadStats = useCallback(async () => {
    if (!user?.id) return
    try {
      setStatsLoading(true)
      const s = await getReferralStats(user.id)
      setStats(s)
    } catch (e) {
      console.error("Failed to load referral stats:", e)
    } finally {
      setStatsLoading(false)
    }
  }, [user?.id])

  useFocusEffect(
    useCallback(() => {
      loadStats()
    }, [loadStats]),
  )

  // ── Enter-a-code section ─────────────────────────────────────────────────
  const alreadyReferred = !!user?.referred_by
  const [inputCode, setInputCode] = useState("")
  const [applyLoading, setApplyLoading] = useState(false)

  const handleApplyCode = async () => {
    if (!inputCode.trim()) {
      showErrorToast("Missing Code", "Please enter a referral code.")
      return
    }
    setApplyLoading(true)
    try {
      const result = await applyReferralCode(inputCode.trim())
      if (result.success) {
        await updateUser({ referred_by: result.referrer_id } as any)
        showSuccessToast(
          "Referral Applied!",
          `You'll both earn ₹${result.reward_amount} on your first wallet recharge.`,
        )
        setInputCode("")
        loadStats()
      } else {
        showErrorToast("Invalid Code", result.error)
      }
    } catch (e) {
      console.error("Apply referral error:", e)
      showErrorToast("Error", "Something went wrong. Please try again.")
    } finally {
      setApplyLoading(false)
    }
  }

  // ── Share / Copy ─────────────────────────────────────────────────────────
  const handleCopyCode = async () => {
    await Clipboard.setStringAsync(referralCode)
    showSuccessToast("Copied!", "Referral code copied to clipboard")
  }

  const handleShare = async () => {
    try {
      await Share.share({
        message: `Join FreshMilk using my referral code ${referralCode} and we both get ₹50 wallet credit on your first wallet recharge! Download the app now.`,
      })
    } catch (error) {
      console.error("Share error:", error)
    }
  }

  // ── Format date helper ───────────────────────────────────────────────────
  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr)
    return date.toLocaleDateString("en-IN", {
      day: "numeric",
      month: "short",
      year: "numeric",
    })
  }

  // ── Mask phone number ────────────────────────────────────────────────────
  const maskPhone = (phone: string | null) => {
    if (!phone) return "Unknown"
    if (phone.length < 4) return phone
    return `****${phone.slice(-4)}`
  }

  // ── Get status badge color ───────────────────────────────────────────────
  const getStatusColor = (status: string) => {
    switch (status) {
      case "rewarded":
        return { bg: "#E8F5E9", text: COLORS.functional.success }
      case "pending":
        return { bg: "#FFF3E0", text: COLORS.primary.orange }
      case "expired":
      case "cancelled":
        return { bg: "#FFEBEE", text: COLORS.functional.error }
      default:
        return { bg: COLORS.neutral.lightGray, text: COLORS.neutral.darkGray }
    }
  }

  return (
    <View className="flex-1 bg-neutral-lightCream">
      <ScrollView
        className="flex-1"
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 40 }}
      >
        {/* ── Hero / Referral Code Card ── */}
        <Animated.View
          entering={FadeInDown.duration(500).delay(50)}
          className="bg-primary-navy mx-6 mt-6 rounded-3xl p-7 relative overflow-hidden shadow-lg"
        >
          {/* Decorative circles */}
          <View className="absolute -top-12 -right-12 w-44 h-44 rounded-full bg-secondary-skyBlue opacity-10" />
          <View className="absolute top-6 right-6 w-16 h-16 rounded-full bg-secondary-skyBlue opacity-5" />
          <View className="absolute -bottom-10 -left-10 w-36 h-36 rounded-full bg-white opacity-5" />

          {/* Icon */}
          <View className="w-14 h-14 rounded-2xl bg-secondary-skyBlue/20 border border-secondary-skyBlue/30 items-center justify-center mb-5">
            <Gift size={28} color={COLORS.secondary.skyBlue} />
          </View>

          <Text className="font-comfortaa text-xs text-secondary-skyBlue mb-2 tracking-widest uppercase opacity-80">
            Your Referral Code
          </Text>
          <Text className="font-sofia-bold text-5xl text-white mb-2 tracking-widest">
            {referralCode}
          </Text>
          <Text className="font-comfortaa text-xs text-white/50 mb-7">
            Share this code with friends to earn rewards
          </Text>

          <View className="flex-row gap-3">
            <TouchableOpacity
              className="flex-1 bg-secondary-skyBlue py-3.5 rounded-xl flex-row items-center justify-center active:opacity-80"
              onPress={handleCopyCode}
            >
              <Copy size={16} color={COLORS.primary.navy} />
              <Text className="font-sofia-bold text-sm text-primary-navy ml-2">
                Copy Code
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              className="flex-1 bg-white/10 py-3.5 rounded-xl flex-row items-center justify-center border border-white/20 active:opacity-70"
              onPress={handleShare}
            >
              <Share2 size={16} color={COLORS.neutral.white} />
              <Text className="font-sofia-bold text-sm text-white ml-2">
                Share
              </Text>
            </TouchableOpacity>
          </View>
        </Animated.View>

        {/* ── Stats Card ── */}
        <Animated.View
          entering={FadeInUp.duration(500).delay(100)}
          className="mx-6 mt-4"
        >
          <View className="bg-white rounded-2xl shadow-md overflow-hidden">
            <View className="px-6 py-4 flex-row items-center gap-3 border-b border-neutral-lightGray">
              <View className="w-9 h-9 rounded-xl bg-primary-navy/10 items-center justify-center">
                <Users size={18} color={COLORS.primary.navy} />
              </View>
              <Text className="font-sofia-bold text-base text-primary-navy">
                Your Referrals
              </Text>
            </View>

            {statsLoading ? (
              <View className="py-8 items-center">
                <ActivityIndicator size="small" color={COLORS.primary.navy} />
              </View>
            ) : (
              <View className="flex-row">
                <View className="flex-1 items-center py-5">
                  <Text className="font-sofia-bold text-3xl text-primary-navy mb-1">
                    {stats.totalReferrals}
                  </Text>
                  <Text className="font-comfortaa text-xs text-neutral-gray">
                    Total
                  </Text>
                </View>
                <View className="w-px bg-neutral-lightGray my-4" />
                <View className="flex-1 items-center py-5">
                  <Text className="font-sofia-bold text-3xl text-functional-success mb-1">
                    {stats.successfulReferrals}
                  </Text>
                  <Text className="font-comfortaa text-xs text-neutral-gray">
                    Successful
                  </Text>
                </View>
                <View className="w-px bg-neutral-lightGray my-4" />
                <View className="flex-1 items-center py-5">
                  <Text className="font-sofia-bold text-3xl text-secondary-skyBlue mb-1">
                    ₹{stats.totalEarned}
                  </Text>
                  <Text className="font-comfortaa text-xs text-neutral-gray">
                    Earned
                  </Text>
                </View>
              </View>
            )}
          </View>
        </Animated.View>

        {/* ── Referral List ── */}
        {!statsLoading && stats.referrals.length > 0 && (
          <Animated.View
            entering={FadeInUp.duration(500).delay(150)}
            className="mx-6 mt-4"
          >
            <View className="bg-white rounded-2xl shadow-md overflow-hidden">
              <View className="px-6 py-4 flex-row items-center justify-between border-b border-neutral-lightGray">
                <Text className="font-sofia-bold text-base text-primary-navy">
                  Referred Friends
                </Text>
                <Text className="font-comfortaa text-xs text-neutral-gray">
                  {stats.referrals.length} people
                </Text>
              </View>

              {stats.referrals.map((referral: ReferralDetail, index: number) => {
                const statusColors = getStatusColor(referral.status)
                const isLast = index === stats.referrals.length - 1

                return (
                  <View
                    key={referral.id}
                    className={`px-6 py-4 flex-row items-center ${!isLast ? "border-b border-neutral-lightGray" : ""}`}
                  >
                    {/* Avatar */}
                    <View className="w-10 h-10 rounded-full bg-primary-navy/10 items-center justify-center mr-3">
                      <User size={18} color={COLORS.primary.navy} />
                    </View>

                    {/* Info */}
                    <View className="flex-1">
                      <Text className="font-sofia-bold text-sm text-primary-navy">
                        {referral.referee_name || maskPhone(referral.referee_phone)}
                      </Text>
                      <View className="flex-row items-center mt-1">
                        <Clock size={12} color={COLORS.neutral.gray} />
                        <Text className="font-comfortaa text-xs text-neutral-gray ml-1">
                          {formatDate(referral.created_at)}
                        </Text>
                      </View>
                    </View>

                    {/* Status & Amount */}
                    <View className="items-end">
                      <View
                        style={{ backgroundColor: statusColors.bg }}
                        className="px-2 py-1 rounded-full"
                      >
                        <Text
                          style={{ color: statusColors.text }}
                          className="font-sofia-bold text-xs capitalize"
                        >
                          {referral.status}
                        </Text>
                      </View>
                      {referral.status === "rewarded" && (
                        <Text className="font-sofia-bold text-sm text-functional-success mt-1">
                          +₹{referral.reward_amount}
                        </Text>
                      )}
                    </View>
                  </View>
                )
              })}
            </View>
          </Animated.View>
        )}

        {/* ── Enter a Friend's Code / Already referred notice ── */}
        <Animated.View
          entering={FadeInUp.duration(500).delay(200)}
          className="mx-6 mt-4"
        >
          {alreadyReferred ? (
            <View className="bg-white rounded-2xl shadow-sm p-5 flex-row items-center gap-4 border border-primary-navy/10">
              <View className="w-10 h-10 rounded-full bg-primary-navy/10 items-center justify-center shrink-0">
                <CheckCircle size={20} color={COLORS.primary.navy} />
              </View>
              <Text className="flex-1 font-comfortaa text-sm text-primary-navy leading-5">
                Referral code applied! Wallet credits will be added on your
                first recharge.
              </Text>
            </View>
          ) : (
            <View className="bg-white rounded-2xl shadow-md overflow-hidden">
              <View className="px-6 py-4 flex-row items-center gap-3 border-b border-neutral-lightGray">
                <View className="w-9 h-9 rounded-xl bg-primary-navy/10 items-center justify-center">
                  <Tag size={18} color={COLORS.primary.navy} />
                </View>
                <View className="flex-1">
                  <Text className="font-sofia-bold text-base text-primary-navy">
                    Have a Referral Code?
                  </Text>
                  <Text className="font-comfortaa text-xs text-neutral-gray mt-0.5">
                    Enter a friend's code to earn rewards together
                  </Text>
                </View>
              </View>

              <View className="px-6 pt-5 pb-6">
                <TextInput
                  label="Friend's Referral Code"
                  value={inputCode}
                  onChangeText={(t) => setInputCode(t.toUpperCase())}
                  placeholder="e.g. K7N3P2XQ"
                  autoCapitalize="characters"
                  autoCorrect={false}
                  containerClassName="mb-4"
                />
                <Button
                  title="Apply Code"
                  onPress={handleApplyCode}
                  variant="navy"
                  size="medium"
                  isLoading={applyLoading}
                  disabled={applyLoading}
                />
              </View>
            </View>
          )}
        </Animated.View>

        {/* ── How it Works ── */}
        <Animated.View
          entering={FadeInUp.duration(500).delay(250)}
          className="mx-6 mt-4"
        >
          <View className="bg-white rounded-2xl shadow-md overflow-hidden">
            <View className="px-6 py-4 border-b border-neutral-lightGray">
              <Text className="font-sofia-bold text-base text-primary-navy">
                How it Works
              </Text>
            </View>

            <View className="px-6 py-5 gap-5">
              {[
                {
                  step: "1",
                  title: "Share Your Code",
                  text: "Send your unique referral code to friends and family",
                },
                {
                  step: "2",
                  title: "They Sign Up",
                  text: "Your friend downloads the app and enters your code",
                },
                {
                  step: "3",
                  title: "Both Earn Rewards",
                  text: "You both get ₹50 wallet credit after their first wallet recharge",
                },
              ].map((item, index) => (
                <View key={index} className="flex-row items-start">
                  <View className="w-9 h-9 rounded-full bg-primary-navy items-center justify-center mr-4 mt-0.5 shrink-0">
                    <Text className="font-sofia-bold text-sm text-white">
                      {item.step}
                    </Text>
                  </View>
                  <View className="flex-1">
                    <Text className="font-sofia-bold text-sm text-primary-navy mb-0.5">
                      {item.title}
                    </Text>
                    <Text className="font-comfortaa text-xs text-neutral-darkGray leading-5">
                      {item.text}
                    </Text>
                  </View>
                </View>
              ))}
            </View>
          </View>
        </Animated.View>
      </ScrollView>
    </View>
  )
}

