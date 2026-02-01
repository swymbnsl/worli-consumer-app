import { AuthProvider } from "@/context/AuthContext";
import { useFonts } from 'expo-font';
import { Stack } from "expo-router";
import * as SplashScreen from 'expo-splash-screen';
import { useEffect } from "react";
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { CartProvider } from '@/context/CartContext';
import { WalletProvider } from '@/context/WalletContext';
import "../global.css";

SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  const [fontsLoaded, error] = useFonts({
    'Sofia-Pro-Bold': require('../assets/fonts/SofiaPro-Bold.ttf'),
    'Sofia-Pro-Regular': require('../assets/fonts/SofiaPro-Regular.ttf'),
    'Playfair-Display-Bold': require('../assets/fonts/PlayfairDisplay-Bold.ttf'),
    'Playfair-Display-Regular': require('../assets/fonts/PlayfairDisplay-Regular.ttf'),
    'Comfortaa-Bold': require('../assets/fonts/Comfortaa-Bold.ttf'),
    'Comfortaa-Regular': require('../assets/fonts/Comfortaa-Regular.ttf'),
  });

  useEffect(() => {
    if (error) console.error("Font loading error:", error);
    if (fontsLoaded || error) {
      SplashScreen.hideAsync();
    }
  }, [fontsLoaded, error]);

  if (!fontsLoaded && !error) {
    return null;
  }

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <AuthProvider>
        <WalletProvider>
          <CartProvider>
            <Stack screenOptions={{ headerShown: false }}>
              <Stack.Screen name="(auth)" options={{ headerShown: false }} />
              <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
              <Stack.Screen name="cart" options={{ headerShown: false }} />
              <Stack.Screen name="product" options={{ headerShown: false }} />
              <Stack.Screen name="order-detail" options={{ headerShown: false }} />
            </Stack>
          </CartProvider>
        </WalletProvider>
      </AuthProvider>
    </GestureHandlerRootView>
  );
}