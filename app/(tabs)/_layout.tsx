import { Tabs } from "expo-router";
import { Home, Package, ShoppingCart, User, Wallet } from "lucide-react-native";
import { ActivityIndicator, Platform, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { COLORS } from "../../constants/theme";
import { useAuth } from "../../hooks/useAuth";

export default function TabsLayout() {
  const { isLoggedIn, loading } = useAuth();
  const insets = useSafeAreaInsets();

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
        <ActivityIndicator size="large" color={COLORS.primary} />
      </View>
    );
  }

  // Redirect to login if not authenticated
  // if (!isLoggedIn) {
  //   return <Redirect href="/(auth)/login" />;
  // }

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarStyle: {
          backgroundColor: "#FFFFFF",
          borderTopWidth: 1,
          borderTopColor: "#F1F1F1",
          paddingBottom: Platform.OS === "ios" ? 28 : Math.max(insets.bottom, 12),
          paddingTop: 12,
          height: Platform.OS === "ios" ? 90 : 70 + Math.max(insets.bottom, 12),
          shadowColor: "#000",
          shadowOffset: { width: 0, height: -4 },
          shadowOpacity: 0.06,
          shadowRadius: 12,
          elevation: 8,
        },
        tabBarActiveTintColor: "#101B53",
        tabBarInactiveTintColor: "#B3B3B3",
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
                backgroundColor: focused ? "#FFF0D2" : "transparent",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <Home size={24} color={color} />
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
                backgroundColor: focused ? "#FFF0D2" : "transparent",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <Package size={24} color={color} />
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
                backgroundColor: focused ? "#FFF0D2" : "transparent",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <Wallet size={24} color={color} />
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
                backgroundColor: focused ? "#FFF0D2" : "transparent",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <ShoppingCart size={24} color={color} />
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
                backgroundColor: focused ? "#FFF0D2" : "transparent",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <User size={24} color={color} />
            </View>
          ),
        }}
      />
    </Tabs>
  );
}
