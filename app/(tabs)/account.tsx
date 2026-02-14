import MenuSection from "@/components/account/MenuList"
import ProfileHeader from "@/components/account/ProfileHeader"
import { ConfirmModal } from "@/components/ui/Modal"
import PageHeader from "@/components/ui/PageHeader"
import { COLORS } from "@/constants/theme"
import { useAuth } from "@/hooks/useAuth"
import { useRouter } from "expo-router"
import {
  FileText,
  Gift,
  Globe,
  HelpCircle,
  Lock,
  LogOut,
  MapPin,
  MessageCircle,
  Package,
  RefreshCw,
  Settings,
  Trash2,
} from "lucide-react-native"
import React, { useState } from "react"
import { ScrollView, Text, TouchableOpacity, View } from "react-native"
import Animated, { FadeInUp } from "react-native-reanimated"

export default function AccountScreen() {
  const { user, logout } = useAuth()
  const router = useRouter()
  const [showLogoutModal, setShowLogoutModal] = useState(false)

  const handleLogout = async () => {
    await logout()
    router.replace("/(auth)/login")
  }

  const quickActions = [
    {
      label: "My Orders",
      icon: Package,
      bg: "#EEF2FF",
      color: COLORS.primary.navy,
      onPress: () => router.push("/(tabs)/orders"),
    },
    {
      label: "Transactions",
      icon: RefreshCw,
      bg: "#FEF3E2",
      color: COLORS.primary.orange,
      onPress: () => router.push("/account/transactions"),
    },
    {
      label: "Monthly Bill",
      icon: FileText,
      bg: "#ECFDF5",
      color: COLORS.functional.success,
      onPress: () => router.push("/account/transactions"),
    },
  ]

  const supportItems = [
    { id: "faq", label: "FAQs", icon: HelpCircle, iconBg: "#EEF2FF" },
    { id: "contact", label: "Contact Us", icon: MessageCircle, iconBg: "#F0FDF4" },
    { id: "refer", label: "Refer & Earn", icon: Gift, iconBg: "#FEF3E2" },
  ]

  const preferencesItems = [
    { id: "language", label: "App Language", icon: Globe, iconBg: "#F5F3FF" },
    { id: "delivery", label: "Delivery Preferences", icon: Settings, iconBg: "#F0F9FF" },
    { id: "address", label: "Manage Addresses", icon: MapPin, iconBg: "#FFF7ED", route: "/account/addresses" },
  ]

  const legalItems = [
    { id: "terms", label: "Terms & Conditions", icon: FileText, iconBg: "#F9FAFB" },
    { id: "privacy", label: "Privacy Policy", icon: Lock, iconBg: "#F9FAFB" },
  ]

  const dangerItems = [
    { id: "delete", label: "Delete My Account", icon: Trash2, isDanger: true },
    { id: "logout", label: "Logout", icon: LogOut, isDanger: true, action: () => setShowLogoutModal(true) },
  ]

  return (
    <View className="flex-1 bg-neutral-lightCream">
      <PageHeader title="My Account" showBackButton={false} />

      <ScrollView
        showsVerticalScrollIndicator={false}
        bounces={false}
        contentContainerStyle={{ paddingBottom: 100 }}
      >
        <ProfileHeader user={user} />

        {/* Quick Actions */}
        <Animated.View
          entering={FadeInUp.duration(400).delay(80).springify().damping(18)}
          className="flex-row px-4 mt-5 mb-2"
          style={{ gap: 10 }}
        >
          {quickActions.map((action) => {
            const Icon = action.icon
            return (
              <TouchableOpacity
                key={action.label}
                className="flex-1 bg-white rounded-2xl p-4 items-center"
                style={{
                  shadowColor: "#000",
                  shadowOffset: { width: 0, height: 2 },
                  shadowOpacity: 0.05,
                  shadowRadius: 8,
                  elevation: 2,
                }}
                onPress={action.onPress}
                activeOpacity={0.7}
              >
                <View
                  className="w-11 h-11 rounded-xl items-center justify-center mb-2.5"
                  style={{ backgroundColor: action.bg }}
                >
                  <Icon size={20} color={action.color} strokeWidth={2} />
                </View>
                <Text className="font-comfortaa text-[11px] text-primary-navy text-center leading-4">
                  {action.label}
                </Text>
              </TouchableOpacity>
            )
          })}
        </Animated.View>

        {/* Menu Sections */}
        <View className="mt-4">
          <MenuSection title="Support & Rewards" items={supportItems} index={0} />
          <MenuSection title="Preferences" items={preferencesItems} index={1} />
          <MenuSection title="Legal" items={legalItems} index={2} />
          <MenuSection items={dangerItems} index={3} />
        </View>

        {/* App version */}
        <Text className="text-center font-comfortaa text-[11px] text-neutral-gray mt-2 mb-4">
          Duddu v1.0.0
        </Text>
      </ScrollView>

      {/* Logout Confirmation */}
      <ConfirmModal
        visible={showLogoutModal}
        onClose={() => setShowLogoutModal(false)}
        title="Logout"
        description="You will be logged out from all devices. Are you sure?"
        confirmText="Logout"
        cancelText="Cancel"
        onConfirm={handleLogout}
        destructive
      />
    </View>
  )
}
