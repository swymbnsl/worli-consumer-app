import MenuList from "@/components/account/MenuList"
import ProfileHeader from "@/components/account/ProfileHeader"
import Header from "@/components/ui/Header"
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
  Settings,
  Trash2,
  User,
} from "lucide-react-native"
import React from "react"
import {
  ScrollView,
  StatusBar,
  Text,
  TouchableOpacity,
  View,
} from "react-native"
import { SafeAreaView } from "react-native-safe-area-context"

export default function AccountScreen() {
  const { user, logout } = useAuth()
  const router = useRouter()

  const handleLogout = async () => {
    await logout()
    router.replace("/(auth)/login")
  }

  const menuItems = [
    {
      id: "profile",
      label: "Edit Profile",
      icon: User,
      color: "#101B53",
      route: "/account/profile",
    },
    {
      id: "orders",
      label: "My Orders",
      icon: Package,
      color: "#101B53",
      route: "/(tabs)/orders",
    },
    {
      id: "address",
      label: "Manage Addresses",
      icon: MapPin,
      color: "#101B53",
      route: "/account/addresses",
    },
    {
      id: "delivery",
      label: "Delivery Preferences",
      icon: Settings,
      color: "#101B53",
      route: "/account/delivery",
    },
    {
      id: "transactions",
      label: "Transaction History",
      icon: FileText,
      color: "#101B53",
      route: "/account/transactions",
    },
    {
      id: "faq",
      label: "FAQ",
      icon: HelpCircle,
      color: "#101B53",
      route: "/account/faq",
    },
    {
      id: "contact",
      label: "Contact Us",
      icon: MessageCircle,
      color: "#101B53",
      route: "/account/contact",
    },
    {
      id: "refer",
      label: "Refer & Earn",
      icon: Gift,
      color: "#101B53",
      route: "/account/refer",
    },
    {
      id: "language",
      label: "App Language",
      icon: Globe,
      color: "#101B53",
      route: "/account/language",
    },
    {
      id: "terms",
      label: "Terms & Conditions",
      icon: FileText,
      color: "#101B53",
      route: "/account/terms",
    },
    {
      id: "privacy",
      label: "Privacy Policy",
      icon: Lock,
      color: "#101B53",
      route: "/account/privacy",
    },
    {
      id: "delete",
      label: "Delete Account",
      icon: Trash2,
      color: "#FF4444",
      route: "/account/delete",
      isDanger: true,
    },
    {
      id: "logout",
      label: "Logout",
      icon: LogOut,
      color: "#FF4444",
      action: handleLogout,
      isDanger: true,
    },
  ]

  return (
    <SafeAreaView
      className="flex-1 bg-neutral-lightCream"
      edges={["top", "bottom"]}
    >
      <StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" />

      {/* Header */}
      <Header />

      <ScrollView
        showsVerticalScrollIndicator={false}
        bounces={false}
        contentContainerStyle={{ paddingBottom: 100 }}
      >
        <ProfileHeader user={user} />

        {/* Quick Actions Overlay */}
        <View className="flex-row justify-between px-4 mt-8 mb-6">
          <TouchableOpacity
            className="bg-white p-4 rounded-xl shadow-md items-center flex-1 mr-2 border-b-4 border-b-primary-orange"
            onPress={() => router.push("/(tabs)/orders")}
          >
            <Package size={22} color="#101B53" strokeWidth={2} />
            <Text className="font-comfortaa text-xs text-primary-navy mt-2 text-center font-semibold">
              Orders
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            className="bg-white p-4 rounded-xl shadow-md items-center flex-1 mx-1 border-b-4 border-b-primary-orange"
            onPress={() => router.push("/account/transactions")}
          >
            <FileText size={22} color="#101B53" strokeWidth={2} />
            <Text className="font-comfortaa text-xs text-primary-navy mt-2 text-center font-semibold">
              History
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            className="bg-white p-4 rounded-xl shadow-md items-center flex-1 ml-2 border-b-4 border-b-primary-orange"
            onPress={() => router.push("/account/contact")}
          >
            <MessageCircle size={22} color="#101B53" strokeWidth={2} />
            <Text className="font-comfortaa text-xs text-primary-navy mt-2 text-center font-semibold">
              Support
            </Text>
          </TouchableOpacity>
        </View>

        <MenuList items={menuItems} />
      </ScrollView>
    </SafeAreaView>
  )
}
