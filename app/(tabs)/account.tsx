import MenuList from "@/components/account/MenuList"
import ProfileHeader from "@/components/account/ProfileHeader"
import Header from "@/components/ui/Header"
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
import { Modal, ScrollView, Text, TouchableOpacity, View } from "react-native"

export default function AccountScreen() {
  const { user, logout } = useAuth()
  const router = useRouter()
  const [showLogoutModal, setShowLogoutModal] = useState(false)

  const handleLogout = async () => {
    setShowLogoutModal(false)
    await logout()
    router.replace("/(auth)/login")
  }

  const triggerLogout = () => {
    setShowLogoutModal(true)
  }

  const menuItems = [
    {
      id: "faq",
      label: "FAQs",
      icon: HelpCircle,
      color: COLORS.primary.navy,
      route: "/account/faq",
    },
    {
      id: "contact",
      label: "Contact Us",
      icon: MessageCircle,
      color: COLORS.primary.navy,
      route: "/account/contact",
    },
    {
      id: "refer",
      label: "Refer & Earn",
      icon: Gift,
      color: COLORS.primary.navy,
      route: "/account/refer",
    },
    {
      id: "language",
      label: "App Language",
      icon: Globe,
      color: COLORS.primary.navy,
      route: "/account/language",
    },
    {
      id: "delivery",
      label: "Delivery Preferences",
      icon: Settings,
      color: COLORS.primary.navy,
      route: "/account/delivery",
    },
    {
      id: "address",
      label: "Address Requests",
      icon: MapPin,
      color: COLORS.primary.navy,
      route: "/account/addresses",
    },
    {
      id: "terms",
      label: "Terms and Conditions",
      icon: FileText,
      color: COLORS.primary.navy,
      route: "/account/terms",
    },
    {
      id: "privacy",
      label: "Privacy Policy",
      icon: Lock,
      color: COLORS.primary.navy,
      route: "/account/privacy",
    },
    {
      id: "delete",
      label: "Delete My Account",
      icon: Trash2,
      color: COLORS.functional.error,
      route: "/account/delete",
      isDanger: true,
    },
    {
      id: "logout",
      label: "Logout",
      icon: LogOut,
      color: COLORS.functional.error,
      action: triggerLogout,
      isDanger: true,
    },
  ]

  return (
    <View className="flex-1 bg-neutral-lightCream">
      {/* Header */}
      <Header />

      <ScrollView
        showsVerticalScrollIndicator={false}
        bounces={false}
        contentContainerStyle={{ paddingBottom: 100 }}
      >
        <ProfileHeader user={user} />

        {/* Quick Actions */}
        <View className="flex-row justify-between px-4 mt-6 mb-6">
          <TouchableOpacity
            className="bg-white p-4 rounded-xl shadow-md items-center flex-1 mr-2"
            onPress={() => router.push("/(tabs)/orders")}
            activeOpacity={0.7}
          >
            <View className="bg-primary-navy/5 w-12 h-12 rounded-xl items-center justify-center mb-2">
              <Package size={24} color={COLORS.primary.navy} strokeWidth={2} />
            </View>
            <Text className="font-comfortaa text-xs text-primary-navy text-center font-semibold">
              My Orders
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            className="bg-white p-4 rounded-xl shadow-md items-center flex-1 mx-1"
            onPress={() => router.push("/account/transactions")}
            activeOpacity={0.7}
          >
            <View className="bg-primary-navy/5 w-12 h-12 rounded-xl items-center justify-center mb-2">
              <RefreshCw
                size={24}
                color={COLORS.primary.navy}
                strokeWidth={2}
              />
            </View>
            <Text className="font-comfortaa text-xs text-primary-navy text-center font-semibold">
              Transactions
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            className="bg-white p-4 rounded-xl shadow-md items-center flex-1 ml-2"
            onPress={() => router.push("/account/transactions")}
            activeOpacity={0.7}
          >
            <View className="bg-primary-navy/5 w-12 h-12 rounded-xl items-center justify-center mb-2">
              <FileText size={24} color={COLORS.primary.navy} strokeWidth={2} />
            </View>
            <Text className="font-comfortaa text-xs text-primary-navy text-center font-semibold">
              Monthly Bill
            </Text>
          </TouchableOpacity>
        </View>

        <MenuList items={menuItems} />
      </ScrollView>

      {/* Logout Confirmation Modal */}
      <Modal
        visible={showLogoutModal}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setShowLogoutModal(false)}
      >
        <View className="flex-1 bg-black/50 justify-center items-center px-8">
          <View className="bg-white rounded-2xl p-6 w-full shadow-xl">
            <Text
              className="font-sofia-bold text-2xl mb-4"
              style={{ color: COLORS.functional.error }}
            >
              Logout
            </Text>
            <Text className="font-comfortaa text-base text-neutral-gray mb-8 leading-6">
              You will be logged out from all devices.
            </Text>

            <View className="flex-row justify-end space-x-6">
              <TouchableOpacity
                onPress={() => setShowLogoutModal(false)}
                activeOpacity={0.7}
              >
                <Text className="font-sofia-bold text-lg text-secondary-sage">
                  Cancel
                </Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={handleLogout} activeOpacity={0.7}>
                <Text className="font-sofia-bold text-lg text-navy ml-4">
                  Continue
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  )
}
