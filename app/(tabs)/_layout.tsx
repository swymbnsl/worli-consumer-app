import { COLORS } from "@/constants/theme"
import { useAuth } from "@/hooks/useAuth"
import { Redirect, Tabs } from "expo-router"
import { Home, Package, ShoppingCart, User, Wallet } from "lucide-react-native"
import { ActivityIndicator, Platform, Text, View } from "react-native"
import { useSafeAreaInsets } from "react-native-safe-area-context"

export default function TabsLayout() {
  const { isLoggedIn, loading, isProfileComplete } = useAuth()
  const insets = useSafeAreaInsets()
  const bottomPad =
    Platform.OS === "ios" ? 24 : Math.min(Math.max(insets.bottom || 0, 8), 20)

  // Show loading state while checking auth
  if (loading) {
    return (
      <View
        style={{
          flex: 1,
          justifyContent: "center",
          alignItems: "center",
          backgroundColor: COLORS.background,
        }}
      >
        <ActivityIndicator size="large" color={COLORS.primary.navy} />
      </View>
    )
  }

  // Redirect to complete profile if not complete
  if (isLoggedIn && !isProfileComplete) {
    return <Redirect href="/complete-profile" />
  }

  // Redirect to login if not authenticated
  // if (!isLoggedIn) {
  //   return <Redirect href="/(auth)/login" />;
  // }

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarShowLabel: false,
        tabBarStyle: {
          backgroundColor: COLORS.neutral.white,
          borderTopWidth: 1,
          borderTopColor: COLORS.border,
          paddingBottom: bottomPad,
          paddingTop: 12,
          height: Platform.OS === "ios" ? 86 : 70,
          shadowColor: COLORS.neutral.black,
          shadowOffset: { width: 0, height: -4 },
          shadowOpacity: 0.06,
          shadowRadius: 12,
          elevation: 8,
        },
        tabBarActiveTintColor: COLORS.primary.navy,
        tabBarInactiveTintColor: COLORS.neutral.gray,
        tabBarLabelStyle: {
          fontSize: 11,
          fontFamily: "Comfortaa-Regular",
          fontWeight: "500",
          letterSpacing: 0.2,
          marginTop: 2,
        },
        tabBarIconStyle: {
          marginTop: 4,
        },
      }}
    >
      <Tabs.Screen
        name="home"
        options={{
          title: "Home",
          tabBarIcon: ({ color, size, focused }) => (
            <View
              style={{
                width: 56,
                height: 56,
                borderRadius: 16,
                backgroundColor: focused ? COLORS.primary.cream : "transparent",
                alignItems: "center",
                justifyContent: "center",
                marginTop: 2,
              }}
            >
              <View style={{ alignItems: "center" }}>
                <Home size={24} color={color} />
                <Text
                  style={{
                    fontSize: 11,
                    fontFamily: "Comfortaa-Regular",
                    fontWeight: "500",
                    letterSpacing: 0.2,
                    marginTop: 2,
                    color: focused ? COLORS.primary.navy : COLORS.neutral.gray,
                  }}
                >
                  Home
                </Text>
              </View>
            </View>
          ),
        }}
      />
      <Tabs.Screen
        name="subscription"
        options={{
          title: "Plan",
          tabBarIcon: ({ color, size, focused }) => (
            <View
              style={{
                width: 56,
                height: 56,
                borderRadius: 16,
                backgroundColor: focused ? COLORS.primary.cream : "transparent",
                alignItems: "center",
                justifyContent: "center",
                marginTop: 2,
              }}
            >
              <View style={{ alignItems: "center" }}>
                <Package size={24} color={color} />
                <Text
                  style={{
                    fontSize: 11,
                    fontFamily: "Comfortaa-Regular",
                    fontWeight: "500",
                    letterSpacing: 0.2,
                    marginTop: 2,
                    color: focused ? COLORS.primary.navy : COLORS.neutral.gray,
                  }}
                >
                  Plan
                </Text>
              </View>
            </View>
          ),
        }}
      />
      <Tabs.Screen
        name="wallet"
        options={{
          title: "Wallet",
          tabBarIcon: ({ color, size, focused }) => (
            <View
              style={{
                width: 56,
                height: 56,
                borderRadius: 16,
                backgroundColor: focused ? COLORS.primary.cream : "transparent",
                alignItems: "center",
                justifyContent: "center",
                marginTop: 2,
              }}
            >
              <View style={{ alignItems: "center" }}>
                <Wallet size={24} color={color} />
                <Text
                  style={{
                    fontSize: 11,
                    fontFamily: "Comfortaa-Regular",
                    fontWeight: "500",
                    letterSpacing: 0.2,
                    marginTop: 2,
                    color: focused ? COLORS.primary.navy : COLORS.neutral.gray,
                  }}
                >
                  Wallet
                </Text>
              </View>
            </View>
          ),
        }}
      />
      <Tabs.Screen
        name="orders"
        options={{
          title: "Orders",
          tabBarIcon: ({ color, size, focused }) => (
            <View
              style={{
                width: 56,
                height: 56,
                borderRadius: 16,
                backgroundColor: focused ? COLORS.primary.cream : "transparent",
                alignItems: "center",
                justifyContent: "center",
                marginTop: 2,
              }}
            >
              <View style={{ alignItems: "center" }}>
                <ShoppingCart size={24} color={color} />
                <Text
                  style={{
                    fontSize: 11,
                    fontFamily: "Comfortaa-Regular",
                    fontWeight: "500",
                    letterSpacing: 0.2,
                    marginTop: 2,
                    color: focused ? COLORS.primary.navy : COLORS.neutral.gray,
                  }}
                >
                  Orders
                </Text>
              </View>
            </View>
          ),
        }}
      />
      <Tabs.Screen
        name="account"
        options={{
          title: "Account",
          tabBarIcon: ({ color, size, focused }) => (
            <View
              style={{
                width: 56,
                height: 56,
                borderRadius: 16,
                backgroundColor: focused ? COLORS.primary.cream : "transparent",
                alignItems: "center",
                justifyContent: "center",
                marginTop: 2,
              }}
            >
              <View style={{ alignItems: "center" }}>
                <User size={24} color={color} />
                <Text
                  style={{
                    fontSize: 11,
                    fontFamily: "Comfortaa-Regular",
                    fontWeight: "500",
                    letterSpacing: 0.2,
                    marginTop: 2,
                    color: focused ? COLORS.primary.navy : COLORS.neutral.gray,
                  }}
                >
                  Account
                </Text>
              </View>
            </View>
          ),
        }}
      />
    </Tabs>
  )
}
