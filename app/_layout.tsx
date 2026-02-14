import { AuthProvider } from "@/context/AuthContext"
import { CartProvider } from "@/context/CartContext"
import { WalletProvider } from "@/context/WalletContext"
import { Toast } from "@/components/ui/Toast"
import { BottomSheetModalProvider } from "@gorhom/bottom-sheet"
import { useFonts } from "expo-font"
import { Stack } from "expo-router"
import * as SplashScreen from "expo-splash-screen"
import { useEffect } from "react"
import { StatusBar } from "react-native"
import { GestureHandlerRootView } from "react-native-gesture-handler"
import { SafeAreaProvider, SafeAreaView } from "react-native-safe-area-context"
import "../global.css"

SplashScreen.preventAutoHideAsync()

export default function RootLayout() {
  const [fontsLoaded, error] = useFonts({
    "Sofia-Pro-Bold": require("../assets/fonts/SofiaPro-Bold.ttf"),
    "Sofia-Pro-Regular": require("../assets/fonts/SofiaPro-Regular.ttf"),
    "Playfair-Display-Bold": require("../assets/fonts/PlayfairDisplay-Bold.ttf"),
    "Playfair-Display-Regular": require("../assets/fonts/PlayfairDisplay-Regular.ttf"),
    "Comfortaa-Bold": require("../assets/fonts/Comfortaa-Bold.ttf"),
    "Comfortaa-Regular": require("../assets/fonts/Comfortaa-Regular.ttf"),
  })

  useEffect(() => {
    if (error) console.error("Font loading error:", error)
    if (fontsLoaded || error) {
      SplashScreen.hideAsync()
    }
  }, [fontsLoaded, error])

  if (!fontsLoaded && !error) {
    return null
  }

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <SafeAreaView
          style={{ flex: 1, backgroundColor: "white" }}
          edges={["top", "bottom"]}
        >
          <StatusBar barStyle="dark-content" backgroundColor="white" />
          <AuthProvider>
            <WalletProvider>
              <CartProvider>
                <BottomSheetModalProvider>
                  <Stack screenOptions={{ headerShown: false }}>
                    <Stack.Screen
                      name="index"
                      options={{ headerShown: false }}
                    />
                    <Stack.Screen
                      name="onboarding"
                      options={{ headerShown: false }}
                    />
                    <Stack.Screen
                      name="(auth)"
                      options={{ headerShown: false }}
                    />
                    <Stack.Screen
                      name="complete-profile"
                      options={{ headerShown: false }}
                    />
                    <Stack.Screen
                      name="(tabs)"
                      options={{ headerShown: false }}
                    />
                    <Stack.Screen
                      name="cart"
                      options={{ headerShown: false }}
                    />
                    <Stack.Screen
                      name="product"
                      options={{ headerShown: false }}
                    />
                    <Stack.Screen
                      name="order-detail"
                      options={{ headerShown: false }}
                    />
                    <Stack.Screen
                      name="add-address"
                      options={{ headerShown: false }}
                    />
                  </Stack>
                  <Toast />
                </BottomSheetModalProvider>
              </CartProvider>
            </WalletProvider>
          </AuthProvider>
        </SafeAreaView>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  )
}
