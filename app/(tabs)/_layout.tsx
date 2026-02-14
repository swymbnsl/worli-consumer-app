import { COLORS } from "@/constants/theme"
import { useAuth } from "@/hooks/useAuth"
import { Redirect, Tabs } from "expo-router"
import { Home, Package, ShoppingCart, User, Wallet } from "lucide-react-native"
import { ActivityIndicator, Platform, Text, View } from "react-native"
import Animated, {
  FadeIn,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
} from "react-native-reanimated"
import { useSafeAreaInsets } from "react-native-safe-area-context"
import { useEffect } from "react"

function TabIcon({
  icon: Icon,
  label,
  focused,
  color,
}: {
  icon: any
  label: string
  focused: boolean
  color: string
}) {
  const scale = useSharedValue(1)

  useEffect(() => {
    if (focused) {
      scale.value = withSpring(1.08, { damping: 12, stiffness: 200 })
    } else {
      scale.value = withSpring(1, { damping: 12, stiffness: 200 })
    }
  }, [focused])

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }))

  return (
    <Animated.View
      style={[
        {
          alignItems: "center",
          justifyContent: "center",
          paddingTop: 4,
          width: 56,
        },
        animatedStyle,
      ]}
    >
      <View
        style={{
          width: 40,
          height: 40,
          borderRadius: 12,
          backgroundColor: focused ? COLORS.primary.navy : "transparent",
          alignItems: "center",
          justifyContent: "center",
          marginBottom: 2,
        }}
      >
        <Icon
          size={20}
          color={focused ? COLORS.neutral.white : COLORS.neutral.gray}
          strokeWidth={focused ? 2.2 : 1.8}
        />
      </View>
      <Text
        style={{
          fontSize: 10,
          fontFamily: focused ? "Sofia-Pro-Bold" : "Comfortaa-Regular",
          color: focused ? COLORS.primary.navy : COLORS.neutral.gray,
          letterSpacing: 0.2,
        }}
      >
        {label}
      </Text>
    </Animated.View>
  )
}

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
          backgroundColor: COLORS.neutral.lightCream,
          borderTopWidth: 0,
          paddingBottom: bottomPad,
          paddingTop: 8,
          height: Platform.OS === "ios" ? 82 : 68,
          elevation: 0,
          shadowOpacity: 0,
        },
        tabBarActiveTintColor: COLORS.primary.navy,
        tabBarInactiveTintColor: COLORS.neutral.gray,
      }}
    >
      <Tabs.Screen
        name="home"
        options={{
          title: "Home",
          tabBarIcon: ({ color, focused }) => (
            <TabIcon icon={Home} label="Home" focused={focused} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="subscription"
        options={{
          title: "Plan",
          tabBarIcon: ({ color, focused }) => (
            <TabIcon
              icon={Package}
              label="Plan"
              focused={focused}
              color={color}
            />
          ),
        }}
      />
      <Tabs.Screen
        name="wallet"
        options={{
          title: "Wallet",
          tabBarIcon: ({ color, focused }) => (
            <TabIcon
              icon={Wallet}
              label="Wallet"
              focused={focused}
              color={color}
            />
          ),
        }}
      />
      <Tabs.Screen
        name="orders"
        options={{
          title: "Orders",
          tabBarIcon: ({ color, focused }) => (
            <TabIcon
              icon={ShoppingCart}
              label="Orders"
              focused={focused}
              color={color}
            />
          ),
        }}
      />
      <Tabs.Screen
        name="account"
        options={{
          title: "Account",
          tabBarIcon: ({ color, focused }) => (
            <TabIcon
              icon={User}
              label="Account"
              focused={focused}
              color={color}
            />
          ),
        }}
      />
    </Tabs>
  )
}
